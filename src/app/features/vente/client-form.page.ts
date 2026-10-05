import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ClientsService } from '../../core/services/clients.service';

@Component({
  selector: 'app-client-form-page',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './client-form.page.html',
  styleUrl: './client-form.page.scss',
})
export class ClientFormPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly clientsApi = inject(ClientsService);

  readonly isEdit = signal(false);
  readonly numero = signal<string | null>(null);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    numero: [''],
    intitule: ['', [Validators.required, Validators.minLength(2)]],
    adresse: [''],
    complement: [''],
    codePostal: [''],
    ville: [''],
    pays: [''],
    telephone: [''],
    telecopie: [''],
    email: ['', [Validators.email]],
    siret: [''],
    identifiant: [''],
    representantCode: [''],
    sommeil: [false],
  });

  ngOnInit(): void {
    const numero = this.route.snapshot.paramMap.get('numero');
    if (numero) {
      this.isEdit.set(true);
      this.numero.set(numero);
      this.form.controls.numero.disable();
      this.load(numero);
    }
  }

  load(numero: string): void {
    this.loading.set(true);
    this.error.set(null);
    this.clientsApi.getByNumero(numero).subscribe({
      next: (data) => {
        const c = data.client;
        this.form.patchValue({
          numero: c.numero,
          intitule: c.intitule || '',
          adresse: c.adresse || '',
          complement: c.complement || '',
          codePostal: c.codePostal || '',
          ville: c.ville || '',
          pays: c.pays || '',
          telephone: c.telephone || '',
          telecopie: c.telecopie || '',
          email: c.email || '',
          siret: c.siret || '',
          identifiant: c.identifiant || '',
          representantCode: '',
          sommeil: !!c.sommeil,
        });
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.message || 'Client introuvable');
      },
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    const raw = this.form.getRawValue();
    const emptyToNull = (v: string) => (v.trim() ? v.trim() : null);

    if (this.isEdit()) {
      const numero = this.numero()!;
      this.clientsApi
        .update(numero, {
          intitule: raw.intitule.trim(),
          adresse: emptyToNull(raw.adresse),
          complement: emptyToNull(raw.complement),
          codePostal: emptyToNull(raw.codePostal),
          ville: emptyToNull(raw.ville),
          pays: emptyToNull(raw.pays),
          telephone: emptyToNull(raw.telephone),
          telecopie: emptyToNull(raw.telecopie),
          email: emptyToNull(raw.email),
          siret: emptyToNull(raw.siret),
          identifiant: emptyToNull(raw.identifiant),
          representantCode: emptyToNull(raw.representantCode),
          sommeil: raw.sommeil,
        })
        .subscribe({
          next: (client) => {
            this.saving.set(false);
            void this.router.navigate(['/vente/clients', client.numero || numero]);
          },
          error: (err) => {
            this.saving.set(false);
            this.error.set(err?.message || 'Mise à jour impossible');
          },
        });
    } else {
      this.clientsApi
        .create({
          numero: emptyToNull(raw.numero),
          intitule: raw.intitule.trim(),
          adresse: emptyToNull(raw.adresse),
          complement: emptyToNull(raw.complement),
          codePostal: emptyToNull(raw.codePostal),
          ville: emptyToNull(raw.ville),
          pays: emptyToNull(raw.pays),
          telephone: emptyToNull(raw.telephone),
          telecopie: emptyToNull(raw.telecopie),
          email: emptyToNull(raw.email),
          siret: emptyToNull(raw.siret),
          identifiant: emptyToNull(raw.identifiant),
          representantCode: emptyToNull(raw.representantCode),
        })
        .subscribe({
          next: (client) => {
            this.saving.set(false);
            void this.router.navigate(['/vente/clients', client.numero]);
          },
          error: (err) => {
            this.saving.set(false);
            this.error.set(err?.message || 'Création impossible');
          },
        });
    }
  }
}
