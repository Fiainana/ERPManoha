import { Component } from '@angular/core';
import { PlaceholderPageComponent } from '../../shared/components/placeholder-page/placeholder-page.component';

@Component({
  selector: 'app-devis-page',
  imports: [PlaceholderPageComponent],
  template: `
    <app-placeholder-page
      title="Devis"
      subtitle="Devis commerciaux B2B — API /api/b2b/devis"
    />
  `,
})
export class DevisPage {}
