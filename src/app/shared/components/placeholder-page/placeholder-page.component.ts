import { Component, input } from '@angular/core';
import { PageHeaderComponent } from '../page-header/page-header.component';

@Component({
  selector: 'app-placeholder-page',
  imports: [PageHeaderComponent],
  template: `
    <app-page-header [title]="title()" [subtitle]="subtitle()" />
    <div class="placeholder">
      <div class="placeholder__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="40" height="40">
          <path
            fill="currentColor"
            d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2m-5 14H7v-2h7zm3-4H7v-2h10zm0-4H7V7h10z"
          />
        </svg>
      </div>
      <p class="placeholder__title">{{ title() }}</p>
      <p class="placeholder__hint">
        Page prête — les données seront branchées sur l'API prochainement.
      </p>
    </div>
  `,
  styles: `
    .placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 280px;
      padding: 2.5rem 1.5rem;
      background: #fff;
      border: 1px dashed #fecaca;
      border-radius: 14px;
      text-align: center;
    }

    .placeholder__icon {
      display: grid;
      place-items: center;
      width: 72px;
      height: 72px;
      margin-bottom: 1rem;
      border-radius: 16px;
      background: #fef2f2;
      color: #dc2626;
    }

    .placeholder__title {
      margin: 0 0 0.35rem;
      font-size: 1.05rem;
      font-weight: 600;
      color: #171717;
    }

    .placeholder__hint {
      margin: 0;
      max-width: 360px;
      font-size: 0.85rem;
      color: #737373;
      line-height: 1.45;
    }
  `,
})
export class PlaceholderPageComponent {
  readonly title = input.required<string>();
  readonly subtitle = input<string>('');
}
