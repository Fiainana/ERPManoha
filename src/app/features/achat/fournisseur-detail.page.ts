import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FournisseursService } from '../../core/services/fournisseurs.service';
import { Fournisseur, UpdateFournisseurPayload } from '../../core/models/fournisseur.model';

@Component({
  selector: 'app-fournisseur-detail-page',
  imports: [RouterLink, FormsModule],
  templateUrl: './fournisseur-detail.page.html',
  styleUrl: './fournisseur-detail.page.scss',
})
export class FournisseurDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(FournisseursService);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly toast = signal<string | null>(null);
  readonly editing = signal(false);
  readonly item = signal<Fournisseur | null>(null);

  private numero = '';

  // form fields
  intitule = '';
  telephone = '';
  telecopie = '';
  email = '';
  siret = '';
  identifiant = '';
  adresse = '';
  complement = '';
  codePostal = '';
  ville = '';
  pays = '';
  sommeil = false;

  ngOnInit(): void {
    this.numero = this.route.snapshot.paramMap.get('numero') || '';
    if (!this.numero) {
      void this.router.navigate(['/achat/fournisseurs']);
      return;
    }
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.get(this.numero).subscribe({
      next: (f) => {
        this.item.set(f);
        this.fillForm(f);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.message || 'Fournisseur introuvable');
      },
    });
  }

  startEdit(): void {
    const f = this.item();
    if (f) this.fillForm(f);
    this.editing.set(true);
    this.toast.set(null);
    this.error.set(null);
  }

  cancelEdit(): void {
    const f = this.item();
    if (f) this.fillForm(f);
    this.editing.set(false);
  }

  save(): void {
    if (this.saving()) return;
    if (!this.intitule.trim()) {
      this.error.set("L'intitulé est obligatoire.");
      return;
    }

    const body: UpdateFournisseurPayload = {
      intitule: this.intitule.trim(),
      telephone: this.telephone.trim() || null,
      telecopie: this.telecopie.trim() || null,
      email: this.email.trim() || null,
      siret: this.siret.trim() || null,
      identifiant: this.identifiant.trim() || null,
      adresse: this.adresse.trim() || null,
      complement: this.complement.trim() || null,
      codePostal: this.codePostal.trim() || null,
      ville: this.ville.trim() || null,
      pays: this.pays.trim() || null,
      sommeil: this.sommeil,
    };

    this.saving.set(true);
    this.error.set(null);
    this.api.update(this.numero, body).subscribe({
      next: () => {
        this.saving.set(false);
        this.editing.set(false);
        this.toast.set('Fournisseur mis à jour');
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(err?.message || 'Enregistrement impossible');
      },
    });
  }

  private fillForm(f: Fournisseur): void {
    this.intitule = f.intitule || '';
    this.telephone = f.telephone || '';
    this.telecopie = f.telecopie || '';
    this.email = f.email || '';
    this.siret = f.siret || '';
    this.identifiant = f.identifiant || '';
    this.adresse = f.adresse || '';
    this.complement = f.complement || '';
    this.codePostal = f.codePostal || '';
    this.ville = f.ville || '';
    this.pays = f.pays || '';
    this.sommeil = f.sommeil;
  }
}
