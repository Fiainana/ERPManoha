import { Component, OnInit, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ImmoService } from '../../core/services/immo.service';
import { ImmoCategorie, ImmoCategorieRequest, ImmoFamilleSage } from '../../core/models/immo.model';
import { ImmoTabsComponent } from './immo-tabs.component';

/** Catégories d'immobilisation : comptes comptables, durée par défaut et familles d'articles Sage rattachées. */
@Component({
  selector: 'app-immo-categories-page',
  imports: [RouterLink, FormsModule, DecimalPipe, ImmoTabsComponent],
  templateUrl: './immo-categories.page.html',
  styleUrl: './immo.shared.scss',
})
export class ImmoCategoriesPage implements OnInit {
  private readonly api = inject(ImmoService);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly toast = signal<string | null>(null);
  readonly categories = signal<ImmoCategorie[]>([]);
  readonly familles = signal<ImmoFamilleSage[]>([]);
  readonly edition = signal<number | null>(null);

  form: ImmoCategorieRequest = this.vide();

  ngOnInit(): void {
    this.load();
    this.api.famillesSage().subscribe({ next: (f) => this.familles.set(f ?? []) });
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.categories().subscribe({
      next: (c) => {
        this.categories.set(c ?? []);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.message || 'Erreur chargement');
      },
    });
  }

  modifier(c: ImmoCategorie): void {
    if (this.edition() === c.id) {
      this.edition.set(null);
      return;
    }
    this.edition.set(c.id);
    this.toast.set(null);
    this.form = {
      libelle: c.libelle,
      compteImmo: c.compteImmo,
      compteAmortissement: c.compteAmortissement,
      compteDotation: c.compteDotation,
      compteEnCours: c.compteEnCours,
      dureeAnsDefaut: c.dureeAnsDefaut,
      amortissable: c.amortissable,
      gestionParLot: c.gestionParLot,
      famillesSage: [...c.famillesSage],
      tauxDgiCode: c.tauxDgiCode,
    };
  }

  familleCochee(code: string): boolean {
    return this.form.famillesSage.includes(code);
  }

  basculerFamille(code: string): void {
    const l = this.form.famillesSage;
    this.form.famillesSage = l.includes(code) ? l.filter((x) => x !== code) : [...l, code];
  }

  enregistrer(): void {
    const id = this.edition();
    if (!id || this.saving()) return;
    this.saving.set(true);
    this.error.set(null);
    const body: ImmoCategorieRequest = {
      ...this.form,
      compteAmortissement: this.form.compteAmortissement?.trim() || null,
      compteDotation: this.form.compteDotation?.trim() || null,
      compteEnCours: this.form.compteEnCours?.trim() || null,
    };
    this.api.saveCategorie(id, body).subscribe({
      next: () => {
        this.saving.set(false);
        this.edition.set(null);
        this.toast.set('Catégorie enregistrée.');
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(err?.message || 'Enregistrement impossible');
      },
    });
  }

  private vide(): ImmoCategorieRequest {
    return {
      libelle: '',
      compteImmo: '',
      compteAmortissement: null,
      compteDotation: null,
      compteEnCours: null,
      dureeAnsDefaut: 0,
      amortissable: true,
      gestionParLot: false,
      famillesSage: [],
      tauxDgiCode: null,
    };
  }
}
