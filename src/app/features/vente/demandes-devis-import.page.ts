import { Component } from '@angular/core';
import { PlaceholderPageComponent } from '../../shared/components/placeholder-page/placeholder-page.component';

@Component({
  selector: 'app-demandes-devis-import-page',
  imports: [PlaceholderPageComponent],
  template: `
    <app-placeholder-page
      title="Demandes devis import"
      subtitle="Demandes de devis import — API /api/b2b/demandes-devis-import"
    />
  `,
})
export class DemandesDevisImportPage {}
