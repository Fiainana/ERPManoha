# ERPManoha

ERP Angular 22 pour Manoha Énergie — authentification branchée sur **ManohaEnergieAPI**.

## Stack

- Angular 22 (standalone, signals)
- Reactive Forms
- JWT Bearer (interceptors fonctionnels)
- Guards `authGuard` / `roleGuard`

## API

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/auth/login` | POST | Connexion login + mot de passe |
| `/api/auth/login/rfid` | POST | Connexion RFID (borne) |
| `/api/auth/login/pin` | POST | Connexion PIN |

Base URL (dev/prod) : `https://api.manoha-energie.online/api`

Body login :

```json
{ "login": "monlogin", "password": "****" }
```

Réponse : `ApiResponse<TokenResponse>` avec `accessToken` + profil utilisateur.

## Démarrage

```bash
git clone https://github.com/Fiainana/ERPManoha.git
cd ERPManoha
npm install
ng serve
```

Ouvre http://localhost:4200 — la route `/` est protégée, redirection vers `/login`.

## Structure auth (clean code)

```
src/app/
  core/
    models/api-response.ts      # contrats API
    services/auth.service.ts    # session, login, rôles (signals)
    guards/auth.guard.ts        # authGuard + roleGuard
    interceptors/auth.interceptor.ts
  features/
    auth/login/                 # écran de connexion
    home/                       # dashboard minimal post-login
```

## Variables d'environnement

`src/environments/environment.ts` :

```ts
apiUrl: 'https://api.manoha-energie.online/api'
appName: 'ERPManoha'
```
