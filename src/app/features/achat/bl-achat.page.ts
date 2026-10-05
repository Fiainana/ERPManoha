import { Component } from '@angular/core';
import { PlaceholderPageComponent } from '../../shared/components/placeholder-page/placeholder-page.component';

@Component({
  selector: 'app-bl-achat-page',
  imports: [PlaceholderPageComponent],
  template: `
    <app-placeholder-page
      title="BL / Réceptions"
      subtitle="Réceptions achat (BL) — API /api/depot/achats/receptions"
    />
  `,
})
export class BlAchatPage {}
