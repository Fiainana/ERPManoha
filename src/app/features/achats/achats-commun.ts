import { Component, Pipe, PipeTransform } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TYPES_ACHAT, TypeAchat } from '../../core/models/achats.model';

const ENTIER = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
const DECIMAL = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 });

/** Montant en ariary, sans décimales : « 1 250 000 Ar ». */
@Pipe({ name: 'ar' })
export class ArPipe implements PipeTransform {
  transform(v: number | null | undefined): string {
    return v == null || !Number.isFinite(v) ? '—' : `${ENTIER.format(v)} Ar`;
  }
}

/** Quantité : décimales seulement si nécessaire, séparateur français. */
@Pipe({ name: 'qte' })
export class QtePipe implements PipeTransform {
  transform(v: number | null | undefined): string {
    return v == null || !Number.isFinite(v) ? '—' : DECIMAL.format(v);
  }
}

export function estTypeAchat(v: string | null): v is TypeAchat {
  return TYPES_ACHAT.some((t) => t.id === v);
}

export function aujourdhuiIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Navigation interne du module Achats : un onglet par étape de la chaîne d'achat. */
@Component({
  selector: 'app-achats-tabs',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="tabs" aria-label="Achats">
      @for (t of types; track t.id) {
        <a [routerLink]="['/achats', t.id]" routerLinkActive="is-active">{{ t.libelle }}</a>
      }
    </nav>
  `,
  styleUrl: './achats.shared.scss',
})
export class AchatsTabsComponent {
  readonly types = TYPES_ACHAT;
}
