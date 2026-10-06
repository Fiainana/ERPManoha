import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FournisseursService } from '../../core/services/fournisseurs.service';

@Component({
  selector: 'app-fournisseur-form-page',
  imports: [RouterLink, FormsModule],
  templateUrl: './fournisseur-form.page.html',
  styleUrl: './fournisseur-form.page.scss',
})
export class FournisseurFormPage {
  private readonly api = inject(FournisseursService);
  private readonly router = inject(Router);

  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  numero = '';
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

  submit(): void {
    if (this.saving()) return;
    if (!this.intitule.trim()) {
      this.error.set("L'intitulé est obligatoire.");
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    this.api
      .create({
        numero: this.numero.trim() || null,
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
      })
      .subscribe({
        next: (num) => {
          this.saving.set(false);
          void this.router.navigate(['/achat/fournisseurs', num]);
        },
        error: (err) => {
          this.saving.set(false);
          this.error.set(err?.message || 'Création impossible');
        },
      });
  }
}
