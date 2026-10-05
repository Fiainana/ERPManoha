import { Component } from '@angular/core';
import { PlaceholderPageComponent } from '../../shared/components/placeholder-page/placeholder-page.component';

@Component({
  selector: 'app-recouvrement-page',
  imports: [PlaceholderPageComponent],
  template: `
    <app-placeholder-page
      title="Recouvrement"
      subtitle="Suivi des factures et encaissements — API /api/recouvrement/factures"
    />
  `,
})
export class RecouvrementPage {}
