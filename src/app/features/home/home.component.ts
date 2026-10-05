import { Component, inject } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-home',
  template: `
    <section class="home">
      <header class="home__header">
        <div>
          <h1>Tableau de bord</h1>
          <p>Bienvenue, <strong>{{ auth.displayName() || 'utilisateur' }}</strong></p>
        </div>
        <button type="button" class="home__logout" (click)="auth.logout()">
          Déconnexion
        </button>
      </header>

      <div class="home__card">
        <h2>Session active</h2>
        <ul>
          <li><span>Login</span> {{ auth.user()?.login || '—' }}</li>
          <li><span>Rôles</span> {{ rolesLabel }}</li>
          <li><span>Admin</span> {{ auth.isAdmin() ? 'Oui' : 'Non' }}</li>
          <li><span>Matricule Sage</span> {{ auth.user()?.sageMatricule || '—' }}</li>
        </ul>
      </div>

      <p class="home__hint">
        Authentification connectée à <code>ManohaEnergieAPI</code>
        (<code>POST /api/auth/login</code>).
      </p>
    </section>
  `,
  styles: `
    .home {
      max-width: 720px;
      margin: 0 auto;
      padding: 2rem 1.25rem;
    }

    .home__header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 1.75rem;

      h1 {
        margin: 0 0 0.35rem;
        font-size: 1.5rem;
        font-weight: 650;
        letter-spacing: -0.02em;
        color: #171717;
      }

      p {
        margin: 0;
        color: #737373;
        font-size: 0.925rem;
      }
    }

    .home__logout {
      border: 1px solid #e5e5e5;
      background: #fff;
      color: #525252;
      border-radius: 10px;
      padding: 0.55rem 0.9rem;
      font: inherit;
      font-size: 0.85rem;
      font-weight: 550;
      cursor: pointer;
      transition: background 0.15s, border-color 0.15s;

      &:hover {
        background: #fafafa;
        border-color: #d4d4d4;
      }
    }

    .home__card {
      background: #fff;
      border: 1px solid #e5e5e5;
      border-radius: 14px;
      padding: 1.25rem 1.35rem;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);

      h2 {
        margin: 0 0 1rem;
        font-size: 0.95rem;
        font-weight: 600;
        color: #404040;
      }

      ul {
        margin: 0;
        padding: 0;
        list-style: none;
        display: grid;
        gap: 0.65rem;
      }

      li {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        font-size: 0.9rem;
        color: #171717;

        span {
          color: #737373;
        }
      }
    }

    .home__hint {
      margin: 1.25rem 0 0;
      font-size: 0.8rem;
      color: #a3a3a3;

      code {
        font-size: 0.78rem;
        background: #f5f5f5;
        padding: 0.1rem 0.35rem;
        border-radius: 4px;
      }
    }
  `,
})
export class HomeComponent {
  readonly auth = inject(AuthService);

  get rolesLabel(): string {
    const roles = this.auth.roles();
    return roles.length ? roles.join(', ') : '—';
  }
}
