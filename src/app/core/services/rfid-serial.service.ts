import { Injectable, NgZone, inject, signal } from '@angular/core';
import { Subject } from 'rxjs';

/**
 * Lecteur de badge RFID (ESP32 + PN532) branché en USB, lu par le navigateur via Web Serial.
 *
 * Même protocole que la borne et la caisse : 115200 bauds, une ligne « READY » au démarrage,
 * puis un identifiant de carte par ligne, en hexadécimal majuscule (8 à 20 caractères).
 *
 * Web Serial n'existe que dans Chrome / Edge sur ordinateur, en HTTPS (ou localhost).
 * Le navigateur demande une seule fois à l'utilisateur de choisir le port ; ensuite il est
 * retrouvé automatiquement. Un port COM ne peut être ouvert que par un seul programme à la fois.
 */

export type EtatLecteur = 'indisponible' | 'deconnecte' | 'connexion' | 'connecte';

const BAUD_RATE = 115200;
const UID_REGEX = /^[0-9A-F]{8,20}$/;

/* Typage minimal de Web Serial (absent de lib.dom). */
interface SerialPortLike {
  readonly readable: ReadableStream<Uint8Array> | null;
  open(options: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
  setSignals?(signals: { dataTerminalReady?: boolean; requestToSend?: boolean }): Promise<void>;
}

interface SerialLike extends EventTarget {
  getPorts(): Promise<SerialPortLike[]>;
  requestPort(options?: object): Promise<SerialPortLike>;
}

@Injectable({ providedIn: 'root' })
export class RfidSerialService {
  private readonly zone = inject(NgZone);

  /** Web Serial disponible (Chrome / Edge, contexte sécurisé). */
  readonly supporte =
    typeof navigator !== 'undefined' && 'serial' in navigator && typeof window !== 'undefined' && window.isSecureContext;

  readonly etat = signal<EtatLecteur>(this.supporte ? 'deconnecte' : 'indisponible');
  /** Le lecteur a envoyé « READY » ou au moins un badge depuis la connexion. */
  readonly lecteurReconnu = signal(false);
  readonly erreur = signal<string | null>(null);

  /** Identifiants de carte lus (un événement par passage de badge). */
  readonly uid$ = new Subject<string>();

  private port: SerialPortLike | null = null;
  private reader: ReadableStreamDefaultReader<string> | null = null;
  private pipeFerme: Promise<void> | null = null;
  private fermetureDemandee = false;

  constructor() {
    if (this.supporte) {
      this.serial.addEventListener('disconnect', (e: Event) => {
        if ((e as Event & { target: unknown }).target === this.port) {
          this.zone.run(() => {
            this.erreur.set('Lecteur débranché.');
            void this.deconnecter();
          });
        }
      });
    }
  }

  private get serial(): SerialLike {
    return (navigator as unknown as { serial: SerialLike }).serial;
  }

  /**
   * Reconnexion sans fenêtre de choix : utilise un port déjà autorisé dans ce navigateur.
   * Retourne false si aucun port n'a encore été autorisé.
   */
  async connecterAutomatiquement(): Promise<boolean> {
    if (!this.supporte || this.etat() === 'connecte' || this.etat() === 'connexion') {
      return this.etat() === 'connecte';
    }
    const ports = await this.serial.getPorts();
    if (ports.length === 0) return false;
    return this.ouvrir(ports[0]);
  }

  /**
   * Choix du port par l'utilisateur (doit être appelé depuis un clic).
   * Le navigateur affiche la liste des ports série ; on retient le choix pour la suite.
   */
  async choisirEtConnecter(): Promise<boolean> {
    if (!this.supporte) return false;
    if (this.etat() === 'connecte') await this.deconnecter();
    let port: SerialPortLike;
    try {
      port = await this.serial.requestPort();
    } catch {
      // Fenêtre fermée sans choix.
      return false;
    }
    return this.ouvrir(port);
  }

  async deconnecter(): Promise<void> {
    this.fermetureDemandee = true;
    try {
      await this.reader?.cancel();
    } catch {
      /* déjà fermé */
    }
    try {
      await this.pipeFerme;
    } catch {
      /* ignoré */
    }
    try {
      await this.port?.close();
    } catch {
      /* déjà fermé */
    }
    this.reader = null;
    this.pipeFerme = null;
    this.port = null;
    this.lecteurReconnu.set(false);
    if (this.supporte) this.etat.set('deconnecte');
  }

  private async ouvrir(port: SerialPortLike): Promise<boolean> {
    this.etat.set('connexion');
    this.erreur.set(null);
    this.lecteurReconnu.set(false);
    try {
      await port.open({ baudRate: BAUD_RATE });
    } catch (e) {
      this.etat.set('deconnecte');
      this.erreur.set(
        'Impossible d’ouvrir le port du lecteur. Il est peut-être utilisé par un autre programme (caisse, borne…) : fermez-le puis réessayez.',
      );
      console.warn('[RFID] ouverture', e);
      return false;
    }
    try {
      await port.setSignals?.({ dataTerminalReady: true, requestToSend: false });
    } catch {
      /* certains adaptateurs ne gèrent pas les signaux */
    }

    this.port = port;
    this.fermetureDemandee = false;
    this.etat.set('connecte');
    void this.boucleLecture(port);
    return true;
  }

  private async boucleLecture(port: SerialPortLike): Promise<void> {
    if (!port.readable) return;
    const decodeur = new TextDecoderStream();
    this.pipeFerme = port.readable.pipeTo(decodeur.writable as WritableStream<Uint8Array>).catch(() => undefined);
    const reader = decodeur.readable.getReader();
    this.reader = reader;

    let tampon = '';
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        if (!value) continue;
        tampon += value;
        let fin: number;
        while ((fin = tampon.indexOf('\n')) >= 0) {
          const ligne = tampon.slice(0, fin).trim().toUpperCase();
          tampon = tampon.slice(fin + 1);
          this.traiterLigne(ligne);
        }
        // Protection contre un flux sans fin de ligne.
        if (tampon.length > 256) tampon = '';
      }
    } catch (e) {
      if (!this.fermetureDemandee) {
        console.warn('[RFID] lecture', e);
        this.zone.run(() => this.erreur.set('Connexion au lecteur perdue.'));
      }
    } finally {
      reader.releaseLock();
      if (!this.fermetureDemandee && this.port === port) {
        this.zone.run(() => void this.deconnecter());
      }
    }
  }

  private traiterLigne(ligne: string): void {
    if (!ligne) return;
    this.zone.run(() => {
      if (ligne === 'READY') {
        this.lecteurReconnu.set(true);
        return;
      }
      if (UID_REGEX.test(ligne)) {
        this.lecteurReconnu.set(true);
        this.uid$.next(ligne);
      }
    });
  }
}
