import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ImmoService } from '../../core/services/immo.service';
import { ImmoCategorie, ImmoFiche, ImmoFicheRequest } from '../../core/models/immo.model';

/** Création manuelle (hors achats Sage) ou modification d'une fiche d'immobilisation. */
@Component({
  selector: 'app-immo-fiche-form-page',
  imports: [RouterLink, FormsModule],
  templateUrl: './immo-fiche-form.page.html',
  styleUrl: './immo.shared.scss',
})
export class ImmoFicheFormPage implements OnInit {
  private readonly api = inject(ImmoService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly categories = signal<ImmoCategorie[]>([]);
  readonly sites = signal<string[]>([]);
  readonly fiche = signal<ImmoFiche | null>(null);

  private id: number | null = null;
  readonly modeEdition = computed(() => this.fiche() !== null);
  /** Une fiche en service ne garde modifiables que désignation, n° de série, site, responsable et note. */
  readonly verrouillee = computed(() => this.fiche()?.statut === 'EN_SERVICE');

  designation = '';
  categorieId: number | null = null;
  valeurBrute: number | null = null;
  dureeAns: number | null = null;
  dateAcquisition = '';
  dateMiseEnService = '';
  fournisseurCode = '';
  numeroSerie = '';
  site = '';
  responsable = '';
  note = '';

  ngOnInit(): void {
    this.api.categories().subscribe({ next: (c) => this.categories.set(c ?? []) });
    this.api.sites().subscribe({ next: (s) => this.sites.set(s ?? []) });
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.id = Number(idParam);
      this.api.fiche(this.id).subscribe({
        next: (f) => {
          this.fiche.set(f);
          this.designation = f.designation;
          this.categorieId = f.categorieId;
          this.valeurBrute = f.valeurBrute;
          this.dureeAns = f.dureeAns;
          this.dateAcquisition = f.dateAcquisition?.slice(0, 10) ?? '';
          this.dateMiseEnService = f.dateMiseEnService?.slice(0, 10) ?? '';
          this.fournisseurCode = f.fournisseurCode ?? '';
          this.numeroSerie = f.numeroSerie ?? '';
          this.site = f.site ?? '';
          this.responsable = f.responsable ?? '';
          this.note = f.note ?? '';
        },
        error: (err) => this.error.set(err?.message || 'Immobilisation introuvable'),
      });
    }
  }

  /** Reprend la durée par défaut de la catégorie choisie (si la durée n'est pas encore saisie). */
  changerCategorie(): void {
    const c = this.categories().find((x) => x.id === this.categorieId);
    if (c && !this.dureeAns) this.dureeAns = c.dureeAnsDefaut;
  }

  enregistrer(): void {
    if (this.saving()) return;
    if (!this.designation.trim()) {
      this.error.set('La désignation est obligatoire.');
      return;
    }
    if (!this.modeEdition() && (!this.valeurBrute || this.valeurBrute <= 0)) {
      this.error.set('La valeur brute est obligatoire.');
      return;
    }

    const body: ImmoFicheRequest = {
      designation: this.designation.trim(),
      numeroSerie: this.numeroSerie.trim() || null,
      site: this.site.trim() || null,
      responsable: this.responsable.trim() || null,
      note: this.note.trim() || null,
    };
    if (!this.verrouillee()) {
      body.categorieId = this.categorieId;
      body.valeurBrute = this.valeurBrute;
      body.dureeAns = this.dureeAns;
      body.dateAcquisition = this.dateAcquisition || null;
      body.fournisseurCode = this.fournisseurCode.trim() || null;
      if (!this.modeEdition()) body.dateMiseEnService = this.dateMiseEnService || null;
    }

    this.saving.set(true);
    this.error.set(null);
    const req = this.id ? this.api.modifier(this.id, body) : this.api.creer(body);
    req.subscribe({
      next: (f) => {
        this.saving.set(false);
        void this.router.navigate(['/immo/fiches', f.id]);
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(err?.message || 'Enregistrement impossible');
      },
    });
  }
}
