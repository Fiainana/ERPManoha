import { Component } from '@angular/core';
import { PlaceholderPageComponent } from '../../shared/components/placeholder-page/placeholder-page.component';

@Component({
  selector: 'app-bc-achat-page',
  imports: [PlaceholderPageComponent],
  template: `
    <app-placeholder-page
      title="BC Achat"
      subtitle="Bons de commande fournisseurs — API /api/depot/achats/commandes"
    />
  `,
})
export class BcAchatPage {}
