import { Component } from '@angular/core';
import { PlaceholderPageComponent } from '../../shared/components/placeholder-page/placeholder-page.component';

@Component({
  selector: 'app-inventaire-page',
  imports: [PlaceholderPageComponent],
  template: `
    <app-placeholder-page
      title="Inventaire"
      subtitle="Inventaires de stock — API /api/inventaires"
    />
  `,
})
export class InventairePage {}
