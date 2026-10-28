import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ImmoService } from '../../core/services/immo.service';

/** Ouverte par le QR code d'une étiquette (/immo/numero/IMM-2026-0001) : redirige vers la fiche du bien. */
@Component({
  selector: 'app-immo-numero-page',
  imports: [RouterLink],
  template: `
    <div class="immo">
      @if (error()) {
        <div class="alert" role="alert">{{ error() }}</div>
        <a routerLink="/immo" class="btn btn--ghost" style="align-self: flex-start">Retour aux immobilisations</a>
      } @else {
        <div class="panel"><div class="skeleton"><div class="skeleton__row"></div></div></div>
      }
    </div>
  `,
  styleUrl: './immo.shared.scss',
})
export class ImmoNumeroPage implements OnInit {
  private readonly api = inject(ImmoService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    const numero = this.route.snapshot.paramMap.get('numero') ?? '';
    this.api.ficheParNumero(numero).subscribe({
      next: (f) => void this.router.navigate(['/immo/fiches', f.id], { replaceUrl: true }),
      error: (err) => this.error.set(err?.message || `Aucune immobilisation « ${numero} ».`),
    });
  }
}
