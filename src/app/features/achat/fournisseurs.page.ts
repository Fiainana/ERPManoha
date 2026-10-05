import { Component } from '@angular/core';
import { PlaceholderPageComponent } from '../../shared/components/placeholder-page/placeholder-page.component';

@Component({
  selector: 'app-fournisseurs-page',
  imports: [PlaceholderPageComponent],
  template: `
    <app-placeholder-page
      title="Fournisseurs"
      subtitle="Référentiel fournisseurs — API admin fournisseurs"
    />
  `,
})
export class FournisseursPage {}
