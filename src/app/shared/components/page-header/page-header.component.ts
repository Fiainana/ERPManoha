import { Component, input } from '@angular/core';

@Component({
  selector: 'app-page-header',
  template: `
    <header class="page-header">
      <div class="page-header__text">
        <h1>{{ title() }}</h1>
        @if (subtitle()) {
          <p>{{ subtitle() }}</p>
        }
      </div>
      <div class="page-header__actions">
        <ng-content />
      </div>
    </header>
  `,
  styles: `
    .page-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 1.5rem;
      flex-wrap: wrap;
    }

    .page-header__text h1 {
      margin: 0 0 0.25rem;
      font-size: 1.4rem;
      font-weight: 650;
      letter-spacing: -0.02em;
      color: #171717;
    }

    .page-header__text p {
      margin: 0;
      font-size: 0.875rem;
      color: #737373;
    }

    .page-header__actions {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }
  `,
})
export class PageHeaderComponent {
  readonly title = input.required<string>();
  readonly subtitle = input<string>('');
}
