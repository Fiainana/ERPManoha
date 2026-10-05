import { Component } from '@angular/core';
import { PlaceholderPageComponent } from '../../shared/components/placeholder-page/placeholder-page.component';

@Component({
  selector: 'app-articles-page',
  imports: [PlaceholderPageComponent],
  template: `
    <app-placeholder-page
      title="Articles"
      subtitle="Catalogue articles et stocks — API /api/articles"
    />
  `,
})
export class ArticlesPage {}
