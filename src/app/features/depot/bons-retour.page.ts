import { Component } from '@angular/core';
import { PlaceholderPageComponent } from '../../shared/components/placeholder-page/placeholder-page.component';

@Component({
  selector: 'app-bons-retour-page',
  imports: [PlaceholderPageComponent],
  template: `
    <app-placeholder-page
      title="Bons de retour"
      subtitle="Bons de retour vente — API /api/depot/bons-retour"
    />
  `,
})
export class BonsRetourPage {}
