import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { ClientsService } from '../../core/services/clients.service';
import { Client, ClientStats } from '../../core/models/client.model';

@Component({
  selector: 'app-client-detail-page',
  imports: [RouterLink, DecimalPipe],
  templateUrl: './client-detail.page.html',
  styleUrl: './client-detail.page.scss',
})
export class ClientDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly clientsApi = inject(ClientsService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly client = signal<Client | null>(null);
  readonly stats = signal<ClientStats | null>(null);

  ngOnInit(): void {
    const numero = this.route.snapshot.paramMap.get('numero');
    if (!numero) {
      void this.router.navigate(['/vente/clients']);
      return;
    }
    this.load(numero);
  }

  load(numero: string): void {
    this.loading.set(true);
    this.error.set(null);
    this.clientsApi.getByNumero(numero).subscribe({
      next: (data) => {
        this.client.set(data.client);
        this.stats.set(data.stats ?? null);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message || err?.message || 'Client introuvable');
      },
    });
  }

  addressLine(c: Client): string {
    return [c.adresse, c.complement].filter(Boolean).join(', ') || '—';
  }

  cityLine(c: Client): string {
    return [c.codePostal, c.ville].filter(Boolean).join(' ') || '—';
  }
}
