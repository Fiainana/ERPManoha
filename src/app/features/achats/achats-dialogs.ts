import { Component, Directive, ElementRef, afterNextRender, inject, input, output, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Observable, concatMap, of } from 'rxjs';
import { AchatsService } from '../../core/services/achats.service';
import { FournisseursService } from '../../core/services/fournisseurs.service';
import {
  AchatDetail,
  AchatEtatReglement,
  CommanderResultat,
  FacturerResultat,
  ReferentielArticle,
  TypeAchat,
} from '../../core/models/achats.model';
import { ArPipe, QtePipe, aujourdhuiIso } from './achats-commun';

/** Comportement commun des fenêtres : Échap ferme, le premier champ reçoit le focus. */
@Directive()
abstract class Dialogue {
  readonly ferme = output<void>();
  readonly enCours = signal(false);
  readonly erreur = signal<string | null>(null);
  protected readonly premier = viewChild<ElementRef<HTMLElement>>('premier');

  constructor() {
    afterNextRender(() => this.premier()?.nativeElement.focus());
  }

  fermer(): void {
    if (!this.enCours()) this.ferme.emit();
  }

  protected lancer<T>(requete: Observable<T>, suite: (resultat: T) => void): void {
    this.enCours.set(true);
    this.erreur.set(null);
    requete.subscribe({
      next: (r) => {
        this.enCours.set(false);
        suite(r);
      },
      error: (e: Error) => {
        this.enCours.set(false);
        this.erreur.set(e.message);
      },
    });
  }
}

const HOTE = { '(document:keydown.escape)': 'fermer()' };

/** Demande d'achat ou préparation → bon de commande. */
@Component({
  selector: 'app-achats-commander',
  imports: [FormsModule, ArPipe, QtePipe],
  host: HOTE,
  styleUrl: './achats.shared.scss',
  template: `
    <div class="modal-backdrop" (click)="fermer()"></div>
    <form class="modal" role="dialog" aria-modal="true" aria-labelledby="cmd-titre" (ngSubmit)="valider()">
      <h2 id="cmd-titre">Commander {{ detail().entete.numeroPiece }}</h2>
      <p class="modal__hint">
        Crée un bon de commande chez <strong>{{ detail().entete.fournisseurIntitule }}</strong>. Les lignes cochées
        passent en entier sur le bon de commande ; les autres restent sur le document.
      </p>
      @if (detail().entete.statut !== 2) {
        <div class="alert alert--warn" role="status">
          Ce document est au statut « {{ detail().entete.statutLibelle }} ». Il sera d’abord passé au statut
          « {{ libelleValide() }} », exigé par Sage pour commander.
        </div>
      }
      <ul class="choix">
        @for (l of lignes; track l.numeroLigne) {
          <li>
            <label>
              <input type="checkbox" [(ngModel)]="l.coche" [name]="'l' + l.numeroLigne" />
              <span>
                <strong>{{ l.designation }}</strong>
                <span class="sub">{{ l.articleReference }} · {{ l.quantite | qte }} × {{ l.prixUnitaire | ar }}</span>
              </span>
              <span class="num">{{ l.montantHT | ar }}</span>
            </label>
          </li>
        }
      </ul>
      <div class="form-grid">
        <label class="field">
          <span>Date du bon de commande</span>
          <input #premier type="date" [(ngModel)]="date" name="date" required />
        </label>
        <label class="check" style="align-self: end; min-height: 40px">
          <input type="checkbox" [(ngModel)]="receptionnable" name="receptionnable" />
          Réceptionnable tout de suite au dépôt
        </label>
      </div>
      @if (erreur()) {
        <div class="alert" role="alert">{{ erreur() }}</div>
      }
      <div class="modal__actions">
        <button type="button" class="btn btn--ghost" (click)="fermer()" [disabled]="enCours()">Annuler</button>
        <button type="submit" class="btn btn--primary" [disabled]="enCours() || nbCoches() === 0">
          {{ enCours() ? 'Création…' : 'Créer le bon de commande' }}
        </button>
      </div>
    </form>
  `,
})
export class AchatsCommanderDialog extends Dialogue {
  private readonly api = inject(AchatsService);
  readonly type = input.required<TypeAchat>();
  readonly detail = input.required<AchatDetail>();
  readonly fait = output<CommanderResultat>();

  date = aujourdhuiIso();
  receptionnable = true;
  lignes: { numeroLigne: number; articleReference: string; designation: string; quantite: number; prixUnitaire: number; montantHT: number; coche: boolean }[] = [];

  ngOnInit(): void {
    this.lignes = this.detail()
      .lignes.filter((l) => l.articleReference)
      .map((l) => ({
        numeroLigne: l.numeroLigne,
        articleReference: l.articleReference ?? '',
        designation: l.designation || l.articleReference || '',
        quantite: l.quantite,
        prixUnitaire: l.prixUnitaire,
        montantHT: l.montantHT,
        coche: true,
      }));
  }

  nbCoches(): number {
    return this.lignes.filter((l) => l.coche).length;
  }

  libelleValide(): string {
    return this.detail().statutsPossibles.find((s) => s.code === 2)?.libelle ?? 'validé';
  }

  valider(): void {
    const coches = this.lignes.filter((l) => l.coche);
    if (coches.length === 0) return;
    const piece = this.detail().entete.numeroPiece;
    const tout = coches.length === this.lignes.length;
    const preparer: Observable<unknown> = this.detail().entete.statut === 2 ? of(null) : this.api.changerStatut(this.type(), piece, 2);
    this.lancer(
      preparer.pipe(
        concatMap(() =>
          this.api.commander(this.type(), piece, {
            date: this.date || null,
            statutCommande: this.receptionnable ? 2 : null,
            ...(tout ? {} : { lignes: coches.map((l) => ({ numeroLigne: l.numeroLigne })) }),
          })
        )
      ),
      (r) => this.fait.emit(r)
    );
  }
}

/** Bon(s) de livraison → facture fournisseur. */
@Component({
  selector: 'app-achats-facturer',
  imports: [FormsModule],
  host: HOTE,
  styleUrl: './achats.shared.scss',
  template: `
    <div class="modal-backdrop" (click)="fermer()"></div>
    <form class="modal" role="dialog" aria-modal="true" aria-labelledby="fac-titre" (ngSubmit)="valider()">
      <h2 id="fac-titre">Facturer {{ pieces().length > 1 ? pieces().length + ' bons de livraison' : pieces()[0] }}</h2>
      <p class="modal__hint">
        @if (pieces().length > 1) {
          {{ pieces().join(', ') }} seront réunis sur une seule facture.
        } @else {
          Le bon de livraison devient une facture fournisseur dans Sage.
        }
      </p>
      <div class="form-grid">
        <label class="field field--wide">
          <span>N° de la facture du fournisseur</span>
          <input #premier type="text" [(ngModel)]="numeroFacture" name="numeroFacture" maxlength="35" placeholder="Celui imprimé sur sa facture" />
        </label>
        <label class="field">
          <span>Date de facture</span>
          <input type="date" [(ngModel)]="date" name="date" required />
        </label>
        <label class="field">
          <span>Référence</span>
          <input type="text" [(ngModel)]="reference" name="reference" maxlength="17" placeholder="Facultatif" />
        </label>
      </div>
      @if (erreur()) {
        <div class="alert" role="alert">{{ erreur() }}</div>
      }
      <div class="modal__actions">
        <button type="button" class="btn btn--ghost" (click)="fermer()" [disabled]="enCours()">Annuler</button>
        <button type="submit" class="btn btn--primary" [disabled]="enCours()">
          {{ enCours() ? 'Facturation…' : 'Créer la facture' }}
        </button>
      </div>
    </form>
  `,
})
export class AchatsFacturerDialog extends Dialogue {
  private readonly api = inject(AchatsService);
  readonly pieces = input.required<string[]>();
  readonly fait = output<FacturerResultat>();

  date = aujourdhuiIso();
  numeroFacture = '';
  reference = '';

  valider(): void {
    this.lancer(
      this.api.facturer(this.pieces(), {
        date: this.date || null,
        numeroFactureFournisseur: this.numeroFacture.trim() || null,
        reference: this.reference.trim() || null,
      }),
      (r) => this.fait.emit(r)
    );
  }
}

const CLE_JOURNAL = 'erp.achats.journal';

/** Règlement d'une facture fournisseur, total ou partiel. */
@Component({
  selector: 'app-achats-regler',
  imports: [FormsModule, ArPipe],
  host: HOTE,
  styleUrl: './achats.shared.scss',
  template: `
    <div class="modal-backdrop" (click)="fermer()"></div>
    <form class="modal" role="dialog" aria-modal="true" aria-labelledby="reg-titre" (ngSubmit)="valider()">
      <h2 id="reg-titre">Régler la facture {{ etat().numeroPiece }}</h2>
      <p class="modal__hint">
        Reste à payer : <strong>{{ etat().resteAPayer | ar }}</strong> sur {{ etat().netAPayer | ar }}.
      </p>
      <div class="form-grid">
        <label class="field">
          <span>Montant <span class="req">*</span></span>
          <input #premier type="number" [(ngModel)]="montant" name="montant" min="0.01" [max]="etat().resteAPayer" step="any" required />
        </label>
        <label class="field">
          <span>Date</span>
          <input type="date" [(ngModel)]="date" name="date" required />
        </label>
        <label class="field">
          <span>Mode de règlement <span class="req">*</span></span>
          <select [(ngModel)]="mode" name="mode" required>
            @for (m of etat().modesReglement; track m.no) {
              <option [ngValue]="m.no">{{ m.intitule }}</option>
            }
          </select>
        </label>
        <label class="field">
          <span>Caisse / banque <span class="req">*</span></span>
          <select [(ngModel)]="journal" name="journal" required>
            <option value="" disabled>Choisir…</option>
            @for (j of etat().journaux; track j.code) {
              <option [value]="j.code">{{ j.intitule || j.code }}</option>
            }
          </select>
        </label>
        <label class="field">
          <span>N° chèque / virement</span>
          <input type="text" [(ngModel)]="reference" name="reference" maxlength="17" placeholder="Facultatif" />
        </label>
        <label class="field">
          <span>Libellé</span>
          <input type="text" [(ngModel)]="libelle" name="libelle" maxlength="35" placeholder="Facultatif" />
        </label>
      </div>
      @if (montant != null && montant < etat().resteAPayer) {
        <p class="aide">Règlement partiel : il restera {{ etat().resteAPayer - montant | ar }} à payer.</p>
      }
      @if (erreur()) {
        <div class="alert" role="alert">{{ erreur() }}</div>
      }
      <div class="modal__actions">
        <button type="button" class="btn btn--ghost" (click)="fermer()" [disabled]="enCours()">Annuler</button>
        <button type="submit" class="btn btn--primary" [disabled]="enCours() || !journal || !montant || montant <= 0">
          {{ enCours() ? 'Enregistrement…' : 'Enregistrer le règlement' }}
        </button>
      </div>
    </form>
  `,
})
export class AchatsReglerDialog extends Dialogue {
  private readonly api = inject(AchatsService);
  readonly etat = input.required<AchatEtatReglement>();
  readonly fait = output<{ message: string; etat: AchatEtatReglement }>();

  montant: number | null = null;
  date = aujourdhuiIso();
  mode: number | null = null;
  journal = '';
  reference = '';
  libelle = '';

  ngOnInit(): void {
    const e = this.etat();
    this.montant = e.resteAPayer;
    this.mode = e.echeances.find((x) => x.resteAPayer > 0)?.modeReglementNo ?? e.modesReglement[0]?.no ?? null;
    // Dernière caisse / banque utilisée sur ce poste.
    try {
      const dernier = localStorage.getItem(CLE_JOURNAL) ?? '';
      if (e.journaux.some((j) => j.code === dernier)) this.journal = dernier;
    } catch {
      /* stockage indisponible : l'utilisateur choisit */
    }
  }

  valider(): void {
    if (!this.montant || !this.journal) return;
    if (this.montant > this.etat().resteAPayer + 0.009) {
      this.erreur.set('Le montant dépasse le reste à payer.');
      return;
    }
    try {
      localStorage.setItem(CLE_JOURNAL, this.journal);
    } catch {
      /* sans importance */
    }
    this.lancer(
      this.api.regler(this.etat().numeroPiece, {
        montant: this.montant,
        date: this.date || null,
        modeReglement: this.mode != null ? String(this.mode) : null,
        codeJournal: this.journal,
        reference: this.reference.trim() || null,
        libelle: this.libelle.trim() || null,
      }),
      (r) => this.fait.emit(r)
    );
  }
}

/** Création rapide d'un fournisseur pendant la saisie d'une demande. */
@Component({
  selector: 'app-achats-creer-fournisseur',
  imports: [FormsModule],
  host: HOTE,
  styleUrl: './achats.shared.scss',
  template: `
    <div class="modal-backdrop" (click)="fermer()"></div>
    <form class="modal" role="dialog" aria-modal="true" aria-labelledby="frs-titre" (ngSubmit)="valider()">
      <h2 id="frs-titre">Nouveau fournisseur</h2>
      <p class="modal__hint">Créé dans Sage, avec un numéro attribué automatiquement. La fiche se complète ensuite dans Fournisseurs.</p>
      <div class="form-grid">
        <label class="field field--wide">
          <span>Nom <span class="req">*</span></span>
          <input #premier type="text" [(ngModel)]="intitule" name="intitule" maxlength="69" required />
        </label>
        <label class="field">
          <span>Téléphone</span>
          <input type="text" [(ngModel)]="telephone" name="telephone" maxlength="21" />
        </label>
        <label class="field">
          <span>E-mail</span>
          <input type="text" [(ngModel)]="email" name="email" maxlength="69" inputmode="email" />
        </label>
        <label class="field">
          <span>Adresse</span>
          <input type="text" [(ngModel)]="adresse" name="adresse" maxlength="35" />
        </label>
        <label class="field">
          <span>Ville</span>
          <input type="text" [(ngModel)]="ville" name="ville" maxlength="35" />
        </label>
      </div>
      @if (erreur()) {
        <div class="alert" role="alert">{{ erreur() }}</div>
      }
      <div class="modal__actions">
        <button type="button" class="btn btn--ghost" (click)="fermer()" [disabled]="enCours()">Annuler</button>
        <button type="submit" class="btn btn--primary" [disabled]="enCours() || !intitule.trim()">
          {{ enCours() ? 'Création…' : 'Créer et choisir' }}
        </button>
      </div>
    </form>
  `,
})
export class AchatsCreerFournisseurDialog extends Dialogue {
  private readonly api = inject(FournisseursService);
  readonly initial = input('');
  readonly cree = output<{ numero: string; intitule: string }>();

  intitule = '';
  telephone = '';
  email = '';
  adresse = '';
  ville = '';

  ngOnInit(): void {
    this.intitule = this.initial();
  }

  valider(): void {
    const intitule = this.intitule.trim();
    if (!intitule) return;
    this.lancer(
      this.api.create({
        intitule,
        telephone: this.telephone.trim() || null,
        email: this.email.trim() || null,
        adresse: this.adresse.trim() || null,
        ville: this.ville.trim() || null,
      }),
      (numero) => this.cree.emit({ numero, intitule })
    );
  }
}

/** Création rapide d'un article pendant la saisie d'une demande. */
@Component({
  selector: 'app-achats-creer-article',
  imports: [FormsModule],
  host: HOTE,
  styleUrl: './achats.shared.scss',
  template: `
    <div class="modal-backdrop" (click)="fermer()"></div>
    <form class="modal" role="dialog" aria-modal="true" aria-labelledby="art-titre" (ngSubmit)="valider()">
      <h2 id="art-titre">Nouvel article</h2>
      <p class="modal__hint">Créé dans Sage avec les réglages de sa famille, puis ajouté à la demande.</p>
      <div class="form-grid">
        <label class="field field--wide">
          <span>Désignation <span class="req">*</span></span>
          <input #premier type="text" [(ngModel)]="designation" name="designation" maxlength="69" required />
        </label>
        <label class="field">
          <span>Référence <span class="req">*</span></span>
          <input type="text" [(ngModel)]="reference" name="reference" maxlength="19" required style="text-transform: uppercase" />
        </label>
        <label class="field">
          <span>Famille <span class="req">*</span></span>
          <select [(ngModel)]="famille" name="famille" required (ngModelChange)="surFamille()">
            <option value="" disabled>{{ referentiel() ? 'Choisir…' : 'Chargement…' }}</option>
            @for (f of referentiel()?.familles ?? []; track f.code) {
              <option [value]="f.code">{{ f.intitule }} ({{ f.code }})</option>
            }
          </select>
        </label>
        <label class="field">
          <span>Unité <span class="req">*</span></span>
          <select [(ngModel)]="unite" name="unite" required>
            <option [ngValue]="null" disabled>Choisir…</option>
            @for (u of referentiel()?.unites ?? []; track u.no) {
              <option [ngValue]="u.no">{{ u.intitule }}</option>
            }
          </select>
        </label>
        <label class="field">
          <span>Prix d’achat HT</span>
          <input type="number" [(ngModel)]="prixAchat" name="prixAchat" min="0" step="any" />
        </label>
        <label class="field">
          <span>Prix de vente HT</span>
          <input type="number" [(ngModel)]="prixVente" name="prixVente" min="0" step="any" placeholder="Facultatif" />
        </label>
      </div>
      @if (erreur()) {
        <div class="alert" role="alert">{{ erreur() }}</div>
      }
      <div class="modal__actions">
        <button type="button" class="btn btn--ghost" (click)="fermer()" [disabled]="enCours()">Annuler</button>
        <button type="submit" class="btn btn--primary" [disabled]="enCours() || !pret()">
          {{ enCours() ? 'Création…' : 'Créer et ajouter' }}
        </button>
      </div>
    </form>
  `,
})
export class AchatsCreerArticleDialog extends Dialogue {
  private readonly api = inject(AchatsService);
  readonly initial = input('');
  readonly cree = output<{ reference: string; designation: string; prixAchat: number }>();
  readonly referentiel = signal<ReferentielArticle | null>(null);

  designation = '';
  reference = '';
  famille = '';
  unite: number | null = null;
  prixAchat: number | null = null;
  prixVente: number | null = null;

  ngOnInit(): void {
    // Un seul mot sans espace ressemble à une référence ; sinon c'est une désignation.
    const saisie = this.initial().trim();
    if (saisie && !saisie.includes(' ') && saisie.length <= 19) this.reference = saisie.toUpperCase();
    else this.designation = saisie;

    this.api.referentielArticle().subscribe({
      next: (r) => this.referentiel.set(r),
      error: (e: Error) => this.erreur.set(e.message),
    });
  }

  /** L'unité de vente de la famille est proposée d'office. */
  surFamille(): void {
    const f = this.referentiel()?.familles.find((x) => x.code === this.famille);
    if (f?.uniteVenteNo) this.unite = f.uniteVenteNo;
  }

  pret(): boolean {
    return !!this.designation.trim() && !!this.reference.trim() && !!this.famille && this.unite != null;
  }

  valider(): void {
    if (!this.pret()) return;
    const prixAchat = Number(this.prixAchat) || 0;
    this.lancer(
      this.api.creerArticle({
        reference: this.reference.trim().toUpperCase(),
        designation: this.designation.trim(),
        codeFamille: this.famille,
        uniteVenteNo: this.unite,
        prixAchat,
        prixVente: this.prixVente != null && this.prixVente !== ('' as unknown) ? Number(this.prixVente) : null,
      }),
      (a) => this.cree.emit({ reference: a.reference, designation: a.designation, prixAchat: a.prixAchat ?? prixAchat })
    );
  }
}
