import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UsersService } from '../../core/services/users.service';
import { APP_ROLE_OPTIONS, UserApp } from '../../core/models/user-app.model';

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

  search = '';

  // Formulaire création
  login = '';
  password = '';
  nom = '';
  prenom = '';
  matricule = '';
  fonction = '';
  service = '';
  selectedRoles: Record<string, boolean> = {
    Commercial: true,
    Vendeur: false,
    Caisse: false,
    Depot: false,
    Recouvrement: false,
    Admin: false,
  };
  vendeur = true;
  acheteur = false;
  caissier = false;
  chargeRecouvrement = false;
  receptionnaire = false;
  actif = true;

  readonly filtered = computed(() => {
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
  });

  ngOnInit(): void {
    this.reload();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.modalOpen()) this.closeModal();
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
  }

  closeModal(): void {
    if (this.saving()) return;
    this.modalOpen.set(false);
  }

  rolesOf(u: UserApp): string[] {
    if (Array.isArray(u.roles)) return u.roles.map(String).filter(Boolean);
    if (typeof u.roles === 'string' && u.roles.trim()) {
      return u.roles.split(/[,;|]/).map((r) => r.trim()).filter(Boolean);
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

    this.saving.set(true);
    this.formError.set(null);
    this.api
      .create({
        login: this.login,
        password: this.password,
        nom: this.nom,
        prenom: this.prenom,
        matricule: this.matricule,
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
    this.matricule = '';
    this.fonction = '';
    this.service = '';
    this.selectedRoles = {
      Commercial: true,
      Vendeur: false,
      Caisse: false,
      Depot: false,
      Recouvrement: false,
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
