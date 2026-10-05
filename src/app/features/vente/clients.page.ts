import { Component } from '@angular/core';
import { PlaceholderPageComponent } from '../../shared/components/placeholder-page/placeholder-page.component';

@Component({
  selector: 'app-clients-page',
  imports: [PlaceholderPageComponent],
  template: `
    <app-placeholder-page
      title="Clients"
      subtitle="Portefeuille clients B2B — API /api/b2b/clients"
    />
  `,
})
export class ClientsPage {}
