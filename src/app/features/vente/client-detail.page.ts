import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ClientsService } from '../../core/services/clients.service';
import {
  Client,
  ClientStats,
  DevisClient,
  FactureClient,
} from '../../core/models/client.model';

@Component({
  selector: 'app-client-detail-page',
  imports: [RouterLink, DecimalPipe, DatePipe],
  templateUrl: './client-detail.page.html',
  styleUrl: './client-detail.page.scss',
})
export class ClientDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly clientsApi = inject(ClientsService);

  readonly loading = signal(true);
  readonly loadingDocs = signal(false);
  readonly error = signal<string | null>(null);
  readonly client = signal<Client | null>(null);
  readonly stats = signal<ClientStats | null>(null);
  readonly factures = signal<FactureClient[]>([]);
  readonly devis = signal<DevisClient[]>([]);
  readonly facturesTotal = signal(0);
  readonly devisTotal = signal(0);
  readonly docsError = signal<string | null>(null);
  readonly onlyImpayees = signal(false);

  private numero = '';

  ngOnInit(): void {
    const numero = this.route.snapshot.paramMap.get('numero');
    if (!numero) {
      void this.router.navigate(['/vente/clients']);
      return;
    }
    this.numero = numero;
    this.load(numero);
  }

  load(numero: string): void {
    this.loading.set(true);
    this.error.set(null);
    this.clientsApi.getByNumero(numero).subscribe({
      next: (data) => {
        this.client.set(data.client);
        this.stats.set(data.stats ?? null);

        // Préremplir si l'API détail renvoie déjà les listes
        if (data.derniereFactures?.items?.length) {
          this.factures.set(data.derniereFactures.items);
          this.facturesTotal.set(data.derniereFactures.total);
        }
        if (data.derniersDevis?.items?.length) {
          this.devis.set(data.derniersDevis.items);
          this.devisTotal.set(data.derniersDevis.total);
        }

        this.loading.set(false);
        this.loadDocuments(numero);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message || err?.message || 'Client introuvable');
      },
    });
  }

  loadDocuments(numero = this.numero): void {
    if (!numero) return;
    this.loadingDocs.set(true);
    this.docsError.set(null);

    const factures$ = this.clientsApi
      .listFactures(numero, {
        impayees: this.onlyImpayees(),
        page: 1,
        pageSize: 30,
      })
      .pipe(
        catchError(() => of({ items: [] as FactureClient[], total: 0, page: 1, pageSize: 30, totalPages: 0 }))
      );

    const devis$ = this.clientsApi.listDevis(numero, { page: 1, pageSize: 30 }).pipe(
      catchError(() => of({ items: [] as DevisClient[], total: 0, page: 1, pageSize: 30, totalPages: 0 }))
    );

    forkJoin({ factures: factures$, devis: devis$ }).subscribe({
      next: ({ factures, devis }) => {
        this.factures.set(factures.items);
        this.facturesTotal.set(factures.total);
        this.devis.set(devis.items);
        this.devisTotal.set(devis.total);
        this.loadingDocs.set(false);
      },
      error: (err) => {
        this.loadingDocs.set(false);
        this.docsError.set(err?.message || 'Impossible de charger devis / factures');
      },
    });
  }

  toggleImpayees(): void {
    this.onlyImpayees.update((v) => !v);
    this.loadDocuments();
  }

  addressLine(c: Client): string {
    return [c.adresse, c.complement].filter(Boolean).join(', ') || '—';
  }

  cityLine(c: Client): string {
    return [c.codePostal, c.ville].filter(Boolean).join(' ') || '—';
  }

  formatDate(value?: string | null): string {
    if (!value) return '—';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('fr-FR');
  }
}
