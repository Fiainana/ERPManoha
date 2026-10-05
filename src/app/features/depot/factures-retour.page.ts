import { Component } from '@angular/core';
import { PlaceholderPageComponent } from '../../shared/components/placeholder-page/placeholder-page.component';

@Component({
  selector: 'app-factures-retour-page',
  imports: [PlaceholderPageComponent],
  template: `
    <app-placeholder-page
      title="Factures retour"
      subtitle="Factures issues de retours — API /api/depot/factures-retour"
    />
  `,
})
export class FacturesRetourPage {}
