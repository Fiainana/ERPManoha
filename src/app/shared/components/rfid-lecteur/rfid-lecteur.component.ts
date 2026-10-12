import { Component, inject } from '@angular/core';
import { RfidSerialService } from '../../../core/services/rfid-serial.service';

/**
 * État du lecteur de badge USB (port COM, via Web Serial) et bouton de connexion.
 * Le badge lu est publié par {@link RfidSerialService.uid$} : c'est la page qui l'écoute.
 */
@Component({
  selector: 'app-rfid-lecteur',
  template: `
    <div class="rfid-reader" [attr.data-etat]="rfid.etat()">
      <span class="rfid-reader__dot"></span>
      @switch (rfid.etat()) {
        @case ('indisponible') {
          <span class="rfid-reader__text">
            Lecteur USB non pris en charge par ce navigateur (Chrome ou Edge sur ordinateur) : saisissez le badge.
          </span>
        }
        @case ('connexion') {
          <span class="rfid-reader__text">Connexion au lecteur…</span>
        }
        @case ('connecte') {
          <span class="rfid-reader__text">
            {{ rfid.lecteurReconnu() ? 'Lecteur connecté' : 'Port ouvert' }} : passez le badge sur le lecteur.
          </span>
          <button type="button" class="btn-link" (click)="choisir()">Changer de port</button>
        }
        @default {
          <span class="rfid-reader__text">Lecteur non connecté.</span>
          <button type="button" class="btn-link" (click)="choisir()">Connecter le lecteur</button>
        }
      }
    </div>
    @if (rfid.erreur(); as err) {
      <p class="rfid-reader__error">{{ err }}</p>
    }
  `,
  styles: `
    .rfid-reader {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem;
      font-size: var(--me-fs-sm);
      color: var(--me-text-muted, #52525b);
    }
    .rfid-reader__dot {
      flex: none;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #a1a1aa;
    }
    .rfid-reader__text {
      flex: 1 1 200px;
    }
    .rfid-reader[data-etat='connecte'] .rfid-reader__dot {
      background: #16a34a;
      box-shadow: 0 0 0 3px color-mix(in srgb, #16a34a 20%, transparent);
    }
    .rfid-reader[data-etat='connexion'] .rfid-reader__dot {
      background: #f59e0b;
    }
    .rfid-reader[data-etat='indisponible'] .rfid-reader__dot {
      background: var(--me-red);
    }
    .btn-link {
      border: none;
      background: none;
      padding: 0;
      color: var(--me-red);
      font: inherit;
      font-weight: 600;
      cursor: pointer;
    }
    .btn-link:hover {
      text-decoration: underline;
    }
    .rfid-reader__error {
      margin: 0.35rem 0 0;
      font-size: var(--me-fs-sm);
      color: var(--me-red-deeper);
    }
  `,
})
export class RfidLecteurComponent {
  readonly rfid = inject(RfidSerialService);

  /** Choix du port par l'utilisateur (la fenêtre du navigateur exige un clic). */
  choisir(): void {
    void this.rfid.choisirEtConnecter();
  }
}
