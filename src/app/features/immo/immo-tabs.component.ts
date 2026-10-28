import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

/** Navigation interne du module Immobilisations. */
@Component({
  selector: 'app-immo-tabs',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="tabs" aria-label="Immobilisations">
      <a routerLink="/immo" routerLinkActive="is-active" [routerLinkActiveOptions]="{ exact: true }">Fiches</a>
      <a routerLink="/immo/dotations" routerLinkActive="is-active">Dotations</a>
      <a routerLink="/immo/ecritures" routerLinkActive="is-active">Écritures Sage</a>
      <a routerLink="/immo/etat" routerLinkActive="is-active">État annuel</a>
      <a routerLink="/immo/controles" routerLinkActive="is-active">Contrôles</a>
      <a routerLink="/immo/categories" routerLinkActive="is-active">Catégories</a>
      <a routerLink="/immo/historique" routerLinkActive="is-active">Historique</a>
    </nav>
  `,
  styleUrl: './immo.shared.scss',
})
export class ImmoTabsComponent {}
