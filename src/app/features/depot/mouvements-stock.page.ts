import { Component } from '@angular/core';
import { PlaceholderPageComponent } from '../../shared/components/placeholder-page/placeholder-page.component';

@Component({
  selector: 'app-mouvements-stock-page',
  imports: [PlaceholderPageComponent],
  template: `
    <app-placeholder-page
      title="Mouvements de stock"
      subtitle="Historique mouvements — API /api/depot/mouvements-stock"
    />
  `,
})
export class MouvementsStockPage {}
