import { Component } from '@angular/core';
import { PlaceholderPageComponent } from '../../shared/components/placeholder-page/placeholder-page.component';

/**
 * Espace administration — toutes les demandes d'achat.
 * Traitement, rattachement article, transformation en BC fournisseur.
 * API :
 *   GET  /api/b2b/demandes-achat
 *   POST /api/b2b/demandes-achat/{id}/generer-sage
 *   POST /api/admin/achats/demandes/{id}/transformer-bc
 *   POST /api/b2b/demandes-achat/{id}/lignes/{ligneId}/article
 */
@Component({
  selector: 'app-demandes-achat-admin-page',
  imports: [PlaceholderPageComponent],
  template: `
    <app-placeholder-page
      title="Demandes d'achat (Admin)"
      subtitle="Toutes les demandes · validation · transformation BC — API /api/b2b/demandes-achat · /api/admin/achats/demandes"
    />
  `,
})
export class DemandesAchatAdminPage {}
