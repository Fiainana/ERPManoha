import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ImmoService } from '../../core/services/immo.service';
import { FacturesService } from '../../core/services/factures.service';
import {
  ImmoCategorie,
  ImmoFiche,
  ImmoHistorique,
  ImmoSortieResultat,
  libelleActionImmo,
  libelleStatutImmo,
} from '../../core/models/immo.model';

type Action = 'valider' | 'service' | 'rejeter' | 'ceder' | 'rebut' | null;

@Component({
  selector: 'app-immo-fiche-detail-page',
  imports: [RouterLink, FormsModule, DatePipe, DecimalPipe],
  templateUrl: './immo-fiche-detail.page.html',
  styleUrl: './immo.shared.scss',
})
export class ImmoFicheDetailPage implements OnInit {
  private readonly api = inject(ImmoService);
  private readonly factures = inject(FacturesService);
  private readonly route = inject(ActivatedRoute);
  readonly impression = signal(false);

  readonly loading = signal(false);
  readonly acting = signal(false);
  readonly error = signal<string | null>(null);
  readonly toast = signal<string | null>(null);
  readonly fiche = signal<ImmoFiche | null>(null);
  readonly categories = signal<ImmoCategorie[]>([]);
  readonly sortie = signal<ImmoSortieResultat | null>(null);
  readonly action = signal<Action>(null);
  readonly historique = signal<ImmoHistorique[]>([]);
  readonly libelleAction = libelleActionImmo;

  readonly libelleStatut = libelleStatutImmo;
  readonly aujourdhui = new Date().toISOString().slice(0, 10);

  readonly dotationsTotal = computed(() => (this.fiche()?.plan ?? []).reduce((s, l) => s + l.dotation, 0));

  // Champs des formulaires d'action
  categorieId: number | null = null;
  dureeAns: number | null = null;
  dateService = '';
  accepterDgi = false;
  motif = '';
  dateSortie = this.aujourdhui;
  prixCession = 0;
  passerPrix = false;

  private id = 0;

  ngOnInit(): void {
    this.id = Number(this.route.snapshot.paramMap.get('id'));
    this.api.categories().subscribe({ next: (c) => this.categories.set(c ?? []) });
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.fiche(this.id).subscribe({
      next: (f) => {
        this.fiche.set(f);
        this.loading.set(false);
        this.api.historique(this.id, 50).subscribe({ next: (h) => this.historique.set(h ?? []) });
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.message || 'Immobilisation introuvable');
      },
    });
  }

  /** Imprime l'étiquette (QR code) sur l'imprimante d'étiquettes : boîte d'impression directe, une étiquette par page. */
  imprimerEtiquette(): void {
    const f = this.fiche();
    if (!f || this.impression()) return;
    this.impression.set(true);
    this.error.set(null);
    this.api.etiquette(f.id).subscribe({
      next: (pdf) => {
        this.impression.set(false);
        this.factures.imprimerDirect(pdf);
      },
      error: (err: Error) => {
        this.impression.set(false);
        this.error.set(err.message || 'Impression impossible');
      },
    });
  }

  ouvrir(a: Action): void {
    const f = this.fiche();
    this.action.set(this.action() === a ? null : a);
    this.error.set(null);
    if (f && a === 'valider') {
      this.categorieId = f.categorieId;
      this.dureeAns = f.dureeAns;
      this.dateService = f.dateMiseEnService?.slice(0, 10) ?? '';
    }
    if (a === 'service') this.dateService = this.aujourdhui;
  }

  valider(): void {
    const f = this.fiche();
    if (!f) return;
    this.executer(
      this.api.valider(f.id, {
        categorieId: this.categorieId,
        dureeAns: this.dureeAns,
        dateMiseEnService: this.dateService || null,
        accepterDepassementDgi: this.accepterDgi,
      }),
      'Immobilisation validée.'
    );
  }

  miseEnService(): void {
    const f = this.fiche();
    if (!f || !this.dateService) return;
    this.executer(this.api.miseEnService(f.id, this.dateService, this.accepterDgi), 'Immobilisation mise en service.');
  }

  rejeter(): void {
    const f = this.fiche();
    if (!f || !this.motif.trim()) return;
    this.executer(this.api.rejeter(f.id, this.motif.trim()), 'Fiche rejetée.');
  }

  ceder(): void {
    const f = this.fiche();
    if (!f || !this.dateSortie) return;
    if (!confirm('Enregistrer la cession ? Les dotations seront rattrapées jusqu’à cette date.')) return;
    this.sortieAction(
      this.api.ceder(f.id, {
        dateCession: this.dateSortie,
        prixCession: this.prixCession || 0,
        passerPrixCession: this.passerPrix,
      }),
      'Cession enregistrée.'
    );
  }

  mettreAuRebut(): void {
    const f = this.fiche();
    if (!f || !this.dateSortie || !this.motif.trim()) return;
    if (!confirm('Mettre ce bien au rebut ? Les dotations seront rattrapées jusqu’à cette date.')) return;
    this.sortieAction(this.api.rebut(f.id, this.dateSortie, this.motif.trim()), 'Mise au rebut enregistrée.');
  }

  private executer(req: ReturnType<ImmoService['valider']>, message: string): void {
    this.acting.set(true);
    this.error.set(null);
    req.subscribe({
      next: (f) => {
        this.acting.set(false);
        this.fiche.set(f);
        this.action.set(null);
        this.toast.set(message);
      },
      error: (err) => {
        this.acting.set(false);
        this.error.set(err?.message || 'Action impossible');
      },
    });
  }

  private sortieAction(req: ReturnType<ImmoService['ceder']>, message: string): void {
    this.acting.set(true);
    this.error.set(null);
    req.subscribe({
      next: (r) => {
        this.acting.set(false);
        this.sortie.set(r);
        this.fiche.set(r.fiche);
        this.action.set(null);
        this.toast.set(message);
        this.load();
      },
      error: (err) => {
        this.acting.set(false);
        this.error.set(err?.message || 'Action impossible');
      },
    });
  }
}
