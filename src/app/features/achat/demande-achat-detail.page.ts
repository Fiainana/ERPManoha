import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';
import { DemandesAchatService } from '../../core/services/demandes-achat.service';
import { DemandeAchatDetail } from '../../core/models/demande-achat.model';

@Component({
  selector: 'app-demande-achat-detail-page',
  imports: [RouterLink, DatePipe, DecimalPipe],
  templateUrl: './demande-achat-detail.page.html',
  styleUrl: './demande-achat-detail.page.scss',
})
export class DemandeAchatDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(DemandesAchatService);

  readonly loading = signal(false);
  readonly acting = signal(false);
  readonly error = signal<string | null>(null);
  readonly toast = signal<string | null>(null);
  readonly item = signal<DemandeAchatDetail | null>(null);

  private id = 0;

  ngOnInit(): void {
    const raw = this.route.snapshot.paramMap.get('id');
    this.id = Number(raw);
    if (!this.id) {
      void this.router.navigate(['/achat/demandes-achat']);
      return;
    }
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.get(this.id).subscribe({
      next: (d) => {
        this.item.set(d);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.message || 'Demande introuvable');
      },
    });
  }

  canAnnuler(): boolean {
    const s = this.item()?.statut || '';
    return ![
      'Annulee',
      'Cloturee',
      'CommandeSageCreee',
      'Receptionnee',
      'Facturable',
    ].includes(s);
  }

  annuler(): void {
    if (this.acting() || !this.canAnnuler()) return;
    if (!confirm(`Annuler la demande #${this.id} ?`)) return;

    this.acting.set(true);
    this.error.set(null);
    this.api.annuler(this.id).subscribe({
      next: (d) => {
        this.item.set(d);
        this.acting.set(false);
        this.toast.set('Demande annulée');
      },
      error: (err) => {
        this.acting.set(false);
        this.error.set(err?.message || 'Annulation impossible');
      },
    });
  }

  statutClass(s: string | null | undefined): string {
    const v = (s || '').toLowerCase();
    if (v.includes('annul')) return 'is-cancel';
    if (v.includes('commande') || v.includes('reception') || v.includes('clotur') || v.includes('factur'))
      return 'is-done';
    if (v.includes('attente')) return 'is-wait';
    if (v.includes('pret') || v.includes('envoy')) return 'is-ok';
    return '';
  }
}
