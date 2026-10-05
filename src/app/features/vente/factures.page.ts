import { Component } from '@angular/core';
import { PlaceholderPageComponent } from '../../shared/components/placeholder-page/placeholder-page.component';

@Component({
  selector: 'app-factures-page',
  imports: [PlaceholderPageComponent],
  template: `
    <app-placeholder-page
      title="Factures"
      subtitle="Factures de vente B2B — API /api/b2b/factures"
    />
  `,
})
export class FacturesPage {}
