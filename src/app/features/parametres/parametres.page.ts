import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  DepotSage,
  GroupeParametres,
  Parametre,
  ParametresApp,
  ValeurParametre,
} from '../../core/models/parametres.model';
import { ParametresError, ParametresService } from '../../core/services/parametres.service';

type ValeurForm = string | number | boolean | number[] | null;

const JOURS: { valeur: string; libelle: string }[] = [
  { valeur: 'Monday', libelle: 'Lundi' },
  { valeur: 'Tuesday', libelle: 'Mardi' },
  { valeur: 'Wednesday', libelle: 'Mercredi' },
  { valeur: 'Thursday', libelle: 'Jeudi' },
  { valeur: 'Friday', libelle: 'Vendredi' },
  { valeur: 'Saturday', libelle: 'Samedi' },
  { valeur: 'Sunday', libelle: 'Dimanche' },
];

/**
 * Paramètres métier (dbo.app_parametre). Une valeur enregistrée remplace celle d'appsettings
 * et s'applique tout de suite côté API.
 */
@Component({
  selector: 'app-parametres-page',
  imports: [FormsModule, DatePipe, RouterLink],
  templateUrl: './parametres.page.html',
  styleUrl: './parametres.page.scss',
})
export class ParametresPage implements OnInit {
  private readonly api = inject(ParametresService);

  readonly jours = JOURS;

  readonly donnees = signal<ParametresApp | null>(null);
  readonly ongletId = signal<string>('comptoir');
  readonly chargement = signal(false);
  readonly enregistrement = signal(false);
  readonly erreur = signal<string | null>(null);
  readonly succes = signal<string | null>(null);
  readonly erreursChamps = signal<Record<string, string>>({});

  readonly groupes = computed<GroupeParametres[]>(() => this.donnees()?.groupes ?? []);
  readonly depots = computed<DepotSage[]>(() => this.donnees()?.depots ?? []);
  readonly onglet = computed(
    () => this.groupes().find((g) => g.id === this.ongletId()) ?? this.groupes()[0] ?? null
  );

  /** Valeurs du formulaire, par clé. */
  form: Record<string, ValeurForm> = {};
  /** Clés à remettre à la valeur par défaut (suppression en base). */
  aRetablir = new Set<string>();
  /** Secrets à effacer (enregistrés vides). */
  secretsEfface = new Set<string>();
  private initial: Record<string, string> = {};

  testDestinataire = '';
  readonly testEnCours = signal(false);
  readonly testResultat = signal<{ ok: boolean; message: string } | null>(null);

  ngOnInit(): void {
    this.charger();
  }

  charger(): void {
    this.chargement.set(true);
    this.erreur.set(null);
    this.api.lister().subscribe({
      next: (d) => {
        this.appliquer(d);
        this.chargement.set(false);
      },
      error: (e: Error) => {
        this.erreur.set(e.message);
        this.chargement.set(false);
      },
    });
  }

  choisirOnglet(id: string): void {
    this.ongletId.set(id);
  }

  /** Clés modifiées (valeur changée, retour au défaut ou secret effacé). */
  modifications(): string[] {
    const cles: string[] = [];
    for (const g of this.groupes()) {
      for (const p of g.parametres) {
        if (this.estModifie(p)) cles.push(p.cle);
      }
    }
    return cles;
  }

  modificationsGroupe(g: GroupeParametres): number {
    return g.parametres.filter((p) => this.estModifie(p)).length;
  }

  erreursGroupe(g: GroupeParametres): number {
    const e = this.erreursChamps();
    return g.parametres.filter((p) => e[p.cle]).length;
  }

  estModifie(p: Parametre): boolean {
    if (this.aRetablir.has(p.cle) || this.secretsEfface.has(p.cle)) return true;
    if (p.type === 'Secret') return !!(this.form[p.cle] as string)?.length;
    return JSON.stringify(this.form[p.cle]) !== this.initial[p.cle];
  }

  retablir(p: Parametre): void {
    this.aRetablir.add(p.cle);
    this.form[p.cle] = this.versForm(p, p.valeurDefaut);
    this.effacerErreur(p.cle);
  }

  annulerRetablir(p: Parametre): void {
    this.aRetablir.delete(p.cle);
    this.form[p.cle] = JSON.parse(this.initial[p.cle]);
  }

  onChange(p: Parametre): void {
    // Saisir une valeur annule un « rétablir » en attente.
    this.aRetablir.delete(p.cle);
    this.effacerErreur(p.cle);
    this.succes.set(null);
  }

  basculerSecretEfface(p: Parametre, efface: boolean): void {
    if (efface) {
      this.secretsEfface.add(p.cle);
      this.form[p.cle] = '';
    } else {
      this.secretsEfface.delete(p.cle);
    }
  }

  depotCoche(p: Parametre, numero: number): boolean {
    return ((this.form[p.cle] as number[]) ?? []).includes(numero);
  }

  basculerDepot(p: Parametre, numero: number, coche: boolean): void {
    const actuels = ((this.form[p.cle] as number[]) ?? []).filter((n) => n !== numero);
    this.form[p.cle] = coche ? [...actuels, numero].sort((a, b) => a - b) : actuels;
    this.onChange(p);
  }

  annuler(): void {
    const d = this.donnees();
    if (d) this.appliquer(d);
    this.erreursChamps.set({});
    this.erreur.set(null);
  }

  enregistrer(): void {
    const valeurs: Record<string, ValeurParametre> = {};
    for (const g of this.groupes()) {
      for (const p of g.parametres) {
        if (!this.estModifie(p)) continue;
        if (this.aRetablir.has(p.cle)) valeurs[p.cle] = null;
        else if (this.secretsEfface.has(p.cle)) valeurs[p.cle] = '';
        else valeurs[p.cle] = this.versApi(p, this.form[p.cle]);
      }
    }
    if (Object.keys(valeurs).length === 0) return;

    this.enregistrement.set(true);
    this.erreur.set(null);
    this.succes.set(null);
    this.erreursChamps.set({});
    this.api.enregistrer(valeurs).subscribe({
      next: (d) => {
        this.appliquer(d);
        this.enregistrement.set(false);
        const n = Object.keys(valeurs).length;
        this.succes.set(`${n} paramètre${n > 1 ? 's' : ''} enregistré${n > 1 ? 's' : ''}, appliqué${n > 1 ? 's' : ''} immédiatement.`);
      },
      error: (e: Error) => {
        this.enregistrement.set(false);
        if (e instanceof ParametresError && Object.keys(e.champs).length) {
          this.erreursChamps.set(e.champs);
          this.erreur.set('Certaines valeurs sont refusées. Corrigez les champs signalés.');
          // Afficher le premier onglet en erreur.
          const g = this.groupes().find((gr) => gr.parametres.some((p) => e.champs[p.cle]));
          if (g) this.ongletId.set(g.id);
        } else {
          this.erreur.set(e.message);
        }
      },
    });
  }

  envoyerTest(): void {
    const dest = this.testDestinataire.trim();
    if (!dest) return;
    this.testEnCours.set(true);
    this.testResultat.set(null);
    this.api.testerEmail(dest).subscribe({
      next: (message) => {
        this.testEnCours.set(false);
        this.testResultat.set({ ok: true, message: `${message} à ${dest}.` });
      },
      error: (e: Error) => {
        this.testEnCours.set(false);
        this.testResultat.set({ ok: false, message: e.message });
      },
    });
  }

  /** Valeur lisible pour « Par défaut : … ». */
  defautLisible(p: Parametre): string {
    const v = p.valeurDefaut;
    if (v === null || v === undefined || v === '') return 'vide';
    if (p.type === 'Booleen') return v ? 'activé' : 'désactivé';
    if (p.type === 'JourSemaine') return this.jours.find((j) => j.valeur === v)?.libelle ?? String(v);
    if (Array.isArray(v)) return v.length ? v.join(', ') : 'aucun';
    if (p.type === 'Decimal' || p.type === 'Entier')
      return `${Number(v).toLocaleString('fr-FR')}${p.unite ? ' ' + p.unite : ''}`;
    return String(v);
  }

  bornes(p: Parametre): string {
    if (p.min != null && p.max != null) return `Entre ${p.min} et ${p.max}`;
    if (p.min != null) return `Minimum ${p.min}`;
    if (p.max != null) return `Maximum ${p.max}`;
    return '';
  }

  private appliquer(d: ParametresApp): void {
    this.donnees.set(d);
    this.form = {};
    this.initial = {};
    this.aRetablir.clear();
    this.secretsEfface.clear();
    for (const g of d.groupes) {
      for (const p of g.parametres) {
        this.form[p.cle] = this.versForm(p, p.valeur);
        this.initial[p.cle] = JSON.stringify(this.form[p.cle]);
      }
    }
    if (!d.groupes.some((g) => g.id === this.ongletId()) && d.groupes.length) {
      this.ongletId.set(d.groupes[0].id);
    }
  }

  private versForm(p: Parametre, v: ValeurParametre): ValeurForm {
    switch (p.type) {
      case 'Secret':
        return '';
      case 'Booleen':
        return !!v;
      case 'Entier':
      case 'Decimal':
        return v === null || v === undefined || v === '' ? null : Number(v);
      case 'ListeTexte':
        return Array.isArray(v) ? (v as string[]).join('\n') : '';
      case 'ListeEntier':
        return Array.isArray(v) ? (v as number[]).map(Number) : [];
      default:
        return v === null || v === undefined ? '' : String(v);
    }
  }

  private versApi(p: Parametre, v: ValeurForm): ValeurParametre {
    switch (p.type) {
      case 'Entier':
      case 'Decimal':
        // Champ vidé = revenir à la valeur par défaut.
        return v === null || v === '' ? null : Number(v);
      case 'ListeTexte':
        return String(v ?? '')
          .split(/[\n;,]/)
          .map((s) => s.trim())
          .filter(Boolean);
      case 'ListeEntier':
        return Array.isArray(v) ? v : String(v ?? '').split(/[\s;,]+/).filter(Boolean).map(Number);
      case 'Booleen':
        return !!v;
      default:
        return String(v ?? '').trim();
    }
  }

  private effacerErreur(cle: string): void {
    const e = this.erreursChamps();
    if (!e[cle]) return;
    const reste = { ...e };
    delete reste[cle];
    this.erreursChamps.set(reste);
  }
}
