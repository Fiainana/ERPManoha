import { Component } from '@angular/core';
import { PlaceholderPageComponent } from '../../shared/components/placeholder-page/placeholder-page.component';

@Component({
  selector: 'app-utilisateurs-page',
  imports: [PlaceholderPageComponent],
  template: `
    <app-placeholder-page
      title="Utilisateurs"
      subtitle="Gestion des comptes applicatifs — API /api/users · /api/admin/users"
    />
  `,
})
export class UtilisateursPage {}
