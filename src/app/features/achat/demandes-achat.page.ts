import { Component } from '@angular/core';
import { PlaceholderPageComponent } from '../../shared/components/placeholder-page/placeholder-page.component';

/**
 * Espace commercial — mes demandes d'achat.
 * API : POST /api/b2b/demandes-achat, GET /api/b2b/demandes-achat/mes
 */
@Component({
  selector: 'app-demandes-achat-page',
  imports: [PlaceholderPageComponent],
  template: `
    <app-placeholder-page
      title="Mes demandes d'achat"
      subtitle="Demandes créées par le commercial — API /api/b2b/demandes-achat/mes"
    />
  `,
})
export class DemandesAchatPage {}
