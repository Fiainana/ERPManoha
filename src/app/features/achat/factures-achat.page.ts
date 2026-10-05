import { Component } from '@angular/core';
import { PlaceholderPageComponent } from '../../shared/components/placeholder-page/placeholder-page.component';

@Component({
  selector: 'app-factures-achat-page',
  imports: [PlaceholderPageComponent],
  template: `
    <app-placeholder-page
      title="Factures achat"
      subtitle="Factures fournisseurs — API /api/b2b/achats/factures"
    />
  `,
})
export class FacturesAchatPage {}
