import { Component, inject } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { NavigationService } from '../../core/services/navigation.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home',
  imports: [PageHeaderComponent, RouterLink],
  template: `
    <app-page-header
      title="Tableau de bord"
      [subtitle]="'Bienvenue, ' + (auth.displayName() || 'utilisateur')"
    />

    <div class="home-grid">
      <div class="home-card">
        <h2>Session</h2>
        <ul>
          <li><span>Login</span> {{ auth.user()?.login || '—' }}</li>
          <li><span>Rôles</span> {{ rolesLabel }}</li>
          <li><span>Admin</span> {{ auth.isAdmin() ? 'Oui' : 'Non' }}</li>
          <li><span>Matricule</span> {{ auth.user()?.sageMatricule || '—' }}</li>
        </ul>
      </div>

      <div class="home-card home-card--links">
        <h2>Accès rapides</h2>
        <div class="home-links">
          @for (g of nav.groups(); track g.id) {
            @if (g.route && g.route !== '/') {
              <a [routerLink]="g.route" class="home-link">{{ g.label }}</a>
            }
            @for (item of g.items; track item.route) {
              <a [routerLink]="item.route" class="home-link">{{ item.label }}</a>
            }
          }
        </div>
      </div>
    </div>
  `,
  styles: `
    .home-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 1rem;
    }

    .home-card {
      background: #fff;
      border: 1px solid #e5e5e5;
      border-radius: 14px;
      padding: 1.2rem 1.3rem;

      h2 {
        margin: 0 0 1rem;
        font-size: 0.9rem;
        font-weight: 600;
        color: #404040;
      }

      ul {
        margin: 0;
        padding: 0;
        list-style: none;
        display: grid;
        gap: 0.55rem;
      }

      li {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        font-size: 0.875rem;
        color: #171717;

        span {
          color: #737373;
        }
      }
    }

    .home-links {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .home-link {
      padding: 0.4rem 0.75rem;
      border-radius: 8px;
      background: #fef2f2;
      color: #991b1b;
      font-size: 0.8rem;
      font-weight: 550;
      text-decoration: none;
      transition: background 0.15s;

      &:hover {
        background: #fecaca;
      }
    }
  `,
})
export class HomeComponent {
  readonly auth = inject(AuthService);
  readonly nav = inject(NavigationService);

  get rolesLabel(): string {
    const roles = this.auth.roles();
    return roles.length ? roles.join(', ') : '—';
  }
}
