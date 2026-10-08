import { Component, HostListener, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UsersService } from '../../core/services/users.service';
import { APP_ROLE_OPTIONS, CollaborateurSage, UserApp } from '../../core/models/user-app.model';

type Secret = 'password' | 'rfid' | 'pin';

@Component({
  selector: 'app-utilisateurs-page',
  imports: [FormsModule],
  templateUrl: './utilisateurs.page.html',
  styleUrl: './utilisateurs.page.scss',
})
export class UtilisateursPage implements OnInit {
  private readonly api = inject(UsersService);

  readonly roleOptions = APP_ROLE_OPTIONS;

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly togglingId = signal<number | null>(null);
  readonly listError = signal<string | null>(null);
  readonly formError = signal<string | null>(null);
  readonly toast = signal<string | null>(null);
  readonly items = signal<UserApp[]>([]);
  readonly modalOpen = signal(false);

  /** Collaborateurs Sage (chargés à l'ouverture d'un formulaire). */
  readonly collaborateurs = signal<CollaborateurSage[]>([]);
  readonly collabError = signal<string | null>(null);

  /** Création : nouveau collaborateur Sage ou lien vers un existant. */
  lienSage: 'nouveau' | 'existant' = 'nouveau';
  sageMatricule = '';

  // ── Fiche de modification ──
  readonly editUser = signal<UserApp | null>(null);
  readonly editError = signal<string | null>(null);
  readonly secretSaving = signal<Secret | null>(null);
  eLogin = '';
  eNom = '';
  ePrenom = '';
  eActif = true;
  eSageMatricule = '';
  eRoles: Record<string, boolean> = {};
  nouveauPassword = '';
  nouveauRfid = '';
  nouveauPin = '';

  search = '';

  login = '';
  password = '';
  nom = '';
  prenom = '';
  fonction = '';
  service = '';
  selectedRoles: Record<string, boolean> = {
    Commercial: true,
    Vendeur: false,
    Caisse: false,
    Depot: false,
    Recouvrement: false,
    Responsable: false,
    Admin: false,
  };
  vendeur = true;
  acheteur = false;
  caissier = false;
  chargeRecouvrement = false;
  receptionnaire = false;
  actif = true;

  ngOnInit(): void {
    this.reload();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.modalOpen()) this.closeModal();
    if (this.editUser()) this.closeEdit();
  }

  filtered(): UserApp[] {
    const q = this.search.trim().toLowerCase();
    const list = this.items();
    if (!q) return list;
    return list.filter((u) =>
      [u.login, u.nom, u.prenom, u.sageMatricule, u.matricule, this.rolesOf(u).join(' ')]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }

  reload(): void {
    this.loading.set(true);
    this.listError.set(null);
    this.api.list().subscribe({
      next: (items) => {
        this.items.set(items);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.listError.set(err?.message || 'Erreur chargement');
      },
    });
  }

  openModal(): void {
    this.resetForm();
    this.formError.set(null);
    this.modalOpen.set(true);
    this.chargerCollaborateurs();
  }

  /** Libellé d'un collaborateur dans les listes de choix. */
  libelleCollab(c: CollaborateurSage, pourLogin?: string | null): string {
    const nom = [c.prenom, c.nom].filter(Boolean).join(' ');
    const fonctions = [c.vendeur && 'vendeur', c.caissier && 'caissier', c.acheteur && 'acheteur']
      .filter(Boolean)
      .join(', ');
    const autres = c.utilisateurs.filter((l) => l !== pourLogin);
    return (
      `${c.matricule ?? 'sans matricule'} — ${nom}` +
      (fonctions ? ` (${fonctions})` : '') +
      (autres.length ? ` · lié à ${autres.join(', ')}` : '') +
      (c.sommeil ? ' · en sommeil' : '')
    );
  }

  /** Un collaborateur sans matricule ne peut pas être lié (matricule à attribuer dans Sage). */
  collabLiable(c: CollaborateurSage): boolean {
    return !!c.matricule && !c.sommeil;
  }

  // ── Fiche de modification ──

  openEdit(u: UserApp): void {
    this.editUser.set(u);
    this.editError.set(null);
    this.eLogin = u.login || '';
    this.eNom = u.nom || '';
    this.ePrenom = u.prenom || '';
    this.eActif = u.actif !== false;
    this.eSageMatricule = u.sageMatricule || '';
    const roles = this.rolesOf(u);
    this.eRoles = Object.fromEntries(this.roleOptions.map((o) => [o.value, roles.includes(o.value)]));
    this.nouveauPassword = '';
    this.nouveauRfid = '';
    this.nouveauPin = '';
    this.chargerCollaborateurs();
  }

  closeEdit(): void {
    if (this.saving() || this.secretSaving()) return;
    this.editUser.set(null);
  }

  saveProfile(): void {
    const u = this.editUser();
    if (!u?.id || this.saving()) return;
    if (!this.eLogin.trim() || !this.eNom.trim()) {
      this.editError.set('Login et nom sont obligatoires.');
      return;
    }
    const roles = Object.entries(this.eRoles)
      .filter(([, on]) => on)
      .map(([r]) => r);
    if (roles.length === 0) {
      this.editError.set('Sélectionnez au moins un rôle applicatif.');
      return;
    }

    this.saving.set(true);
    this.editError.set(null);
    this.api
      .update(u.id, {
        login: this.eLogin.trim(),
        nom: this.eNom.trim(),
        prenom: this.ePrenom.trim(),
        actif: this.eActif,
        roles,
        isAdmin: roles.includes('Admin'),
        sageMatricule: this.eSageMatricule.trim(),
      })
      .subscribe({
        next: (maj) => {
          this.saving.set(false);
          this.majLigne(u.id!, maj);
          this.editUser.set({ ...u, ...maj });
          this.showToast('Utilisateur mis à jour');
          this.chargerCollaborateurs();
        },
        error: (err) => {
          this.saving.set(false);
          this.editError.set(err?.message || 'Mise à jour impossible');
        },
      });
  }

  saveSecret(type: Secret, retirer = false): void {
    const u = this.editUser();
    if (!u?.id || this.secretSaving()) return;

    let req;
    if (type === 'password') {
      if (this.nouveauPassword.length < 4) {
        this.editError.set('Le mot de passe doit faire au moins 4 caractères.');
        return;
      }
      req = this.api.setPassword(u.id, this.nouveauPassword);
    } else if (type === 'rfid') {
      const code = this.nouveauRfid.trim();
      if (!retirer && !code) {
        this.editError.set('Scanner ou saisir le badge RFID.');
        return;
      }
      if (retirer && !confirm(`Retirer le badge RFID de ${this.displayName(u)} ?`)) return;
      req = this.api.setRfid(u.id, retirer ? null : code);
    } else {
      const pin = this.nouveauPin.trim();
      if (!retirer && !/^\d{4,8}$/.test(pin)) {
        this.editError.set('Le PIN doit contenir 4 à 8 chiffres.');
        return;
      }
      if (retirer && !confirm(`Retirer le PIN de ${this.displayName(u)} ?`)) return;
      req = this.api.setPin(u.id, retirer ? null : pin);
    }

    this.secretSaving.set(type);
    this.editError.set(null);
    req.subscribe({
      next: (maj) => {
        this.secretSaving.set(null);
        this.majLigne(u.id!, maj);
        this.editUser.set({ ...u, ...maj });
        if (type === 'password') this.nouveauPassword = '';
        if (type === 'rfid') this.nouveauRfid = '';
        if (type === 'pin') this.nouveauPin = '';
        const libelle = { password: 'Mot de passe', rfid: 'Badge RFID', pin: 'PIN' }[type];
        this.showToast(`${libelle} ${retirer ? 'retiré' : 'enregistré'}`);
      },
      error: (err) => {
        this.secretSaving.set(null);
        this.editError.set(err?.message || 'Enregistrement impossible');
      },
    });
  }

  private majLigne(id: number, maj: UserApp): void {
    this.items.update((list) => list.map((x) => (x.id === id ? { ...x, ...maj } : x)));
  }

  private chargerCollaborateurs(): void {
    this.collabError.set(null);
    this.api.collaborateursSage().subscribe({
      next: (list) => this.collaborateurs.set(list),
      error: (err) => this.collabError.set(err?.message || 'Collaborateurs Sage indisponibles'),
    });
  }

  closeModal(): void {
    if (this.saving()) return;
    this.modalOpen.set(false);
  }

  rolesOf(u: UserApp): string[] {
    if (Array.isArray(u.roles)) return u.roles.map(String).filter(Boolean);
    if (typeof u.roles === 'string' && u.roles.trim()) {
      return u.roles
        .split(/[,;|]/)
        .map((r) => r.trim())
        .filter(Boolean);
    }
    if (u.isAdmin) return ['Admin'];
    return [];
  }

  initials(u: UserApp): string {
    const a = (u.prenom || '').trim();
    const b = (u.nom || u.login || '?').trim();
    return ((a[0] || '') + (b[0] || '?')).toUpperCase();
  }

  displayName(u: UserApp): string {
    const name = [u.prenom, u.nom].filter(Boolean).join(' ').trim();
    return name || u.login || '—';
  }

  toggleActif(u: UserApp): void {
    if (!u.id) return;
    const next = u.actif === false;
    this.togglingId.set(u.id);
    this.api.setActif(u.id, next).subscribe({
      next: () => {
        this.togglingId.set(null);
        this.items.update((list) =>
          list.map((x) => (x.id === u.id ? { ...x, actif: next } : x))
        );
        this.showToast(next ? 'Compte activé' : 'Compte désactivé');
      },
      error: (err) => {
        this.togglingId.set(null);
        this.listError.set(err?.message || 'Impossible de changer le statut');
      },
    });
  }

  submit(): void {
    if (!this.login.trim() || !this.nom.trim() || !this.password.trim()) {
      this.formError.set('Login, nom et mot de passe sont obligatoires.');
      return;
    }

    const roles = Object.entries(this.selectedRoles)
      .filter(([, on]) => on)
      .map(([r]) => r);
    if (roles.length === 0) {
      this.formError.set('Sélectionnez au moins un rôle applicatif.');
      return;
    }

    const isAdmin = roles.includes('Admin');

    if (this.lienSage === 'existant' && !this.sageMatricule) {
      this.formError.set('Choisissez le collaborateur Sage à lier.');
      return;
    }

    this.saving.set(true);
    this.formError.set(null);
    this.api
      .create({
        login: this.login,
        password: this.password,
        nom: this.nom,
        prenom: this.prenom,
        sageMatricule: this.lienSage === 'existant' ? this.sageMatricule : undefined,
        fonction: this.fonction,
        service: this.service,
        vendeur: this.vendeur || roles.includes('Vendeur') || roles.includes('Commercial'),
        acheteur: this.acheteur,
        caissier: this.caissier || roles.includes('Caisse'),
        chargeRecouvrement: this.chargeRecouvrement || roles.includes('Recouvrement'),
        receptionnaire: this.receptionnaire || roles.includes('Depot'),
        isAdmin,
        actif: this.actif,
        roles,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.modalOpen.set(false);
          this.showToast('Utilisateur créé');
          this.resetForm();
          this.reload();
        },
        error: (err) => {
          this.saving.set(false);
          this.formError.set(err?.message || 'Création impossible');
        },
      });
  }

  private showToast(msg: string): void {
    this.toast.set(msg);
    setTimeout(() => this.toast.set(null), 2800);
  }

  private resetForm(): void {
    this.login = '';
    this.password = '';
    this.nom = '';
    this.prenom = '';
    this.fonction = '';
    this.service = '';
    this.lienSage = 'nouveau';
    this.sageMatricule = '';
    this.selectedRoles = {
      Commercial: true,
      Vendeur: false,
      Caisse: false,
      Depot: false,
      Recouvrement: false,
      Responsable: false,
      Admin: false,
    };
    this.vendeur = true;
    this.acheteur = false;
    this.caissier = false;
    this.chargeRecouvrement = false;
    this.receptionnaire = false;
    this.actif = true;
  }
}
