import { Component } from '@angular/core';
import { PlaceholderPageComponent } from '../../shared/components/placeholder-page/placeholder-page.component';

@Component({
  selector: 'app-bc-reception-page',
  imports: [PlaceholderPageComponent],
  template: `
    <app-placeholder-page
      title="BC Achat (réception)"
      subtitle="Réceptionner les BC fournisseurs — API /api/depot/achats/commandes"
    />
  `,
})
export class BcReceptionPage {}
