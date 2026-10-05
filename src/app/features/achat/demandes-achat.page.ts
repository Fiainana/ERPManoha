import { Component } from '@angular/core';
import { PlaceholderPageComponent } from '../../shared/components/placeholder-page/placeholder-page.component';

@Component({
  selector: 'app-demandes-achat-page',
  imports: [PlaceholderPageComponent],
  template: `
    <app-placeholder-page
      title="Demandes d'achat"
      subtitle="Demandes d'achat métier — API /api/b2b/demandes-achat"
    />
  `,
})
export class DemandesAchatPage {}
