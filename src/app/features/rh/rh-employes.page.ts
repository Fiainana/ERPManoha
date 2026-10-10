import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { RhService } from '../../core/services/rh.service';
import { RhDepartement, RhEmployeListItem } from '../../core/models/rh.model';
import { RhEmployeFormComponent } from './rh-employe-form.component';
import { libelleRegime } from './rh-ui';

@Component({
  selector: 'app-rh-employes-page',
  imports: [RouterLink, FormsModule, DatePipe, RhEmployeFormComponent],
  templateUrl: './rh-employes.page.html',
  styleUrl: './rh.scss',
})
export class RhEmployesPage implements OnInit {
  private readonly api = inject(RhService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly acting = signal(false);
  readonly error = signal<string | null>(null);
  readonly toast = signal<string | null>(null);
  readonly items = signal<RhEmployeListItem[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly totalPages = signal(0);
  readonly departements = signal<RhDepartement[]>([]);
  readonly formOpen = signal(false);
  readonly pageSize = 50;

  search = '';
  statut = 'Actif';
  departementId: number | null = null;

  readonly libelleRegime = libelleRegime;

  private timer?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    this.api.departements().subscribe({ next: (d) => this.departements.set(d), error: () => {} });
    this.load(1);
  }

  onSearch(): void {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.load(1), 300);
  }

  reload(): void {
    this.load(1);
  }

  goTo(page: number): void {
    if (page < 1 || page > this.totalPages() || this.loading()) return;
    this.load(page);
  }

  ouvrir(e: RhEmployeListItem): void {
    void this.router.navigate(['/rh/employes', e.id]);
  }

  onSaved(id: number): void {
    this.formOpen.set(false);
    if (id) void this.router.navigate(['/rh/employes', id]);
    else this.reload();
  }

  importer(): void {
    if (this.acting()) return;
    this.acting.set(true);
    this.error.set(null);
    this.api.importerPointeuse().subscribe({
      next: (res) => {
        this.acting.set(false);
        this.toast.set(res.message || 'Import terminé.');
        this.reload();
      },
      error: (err) => {
        this.acting.set(false);
        this.error.set(err.message);
      },
    });
  }

  tonStatut(s: string): string {
    return s === 'Actif' ? 'ok' : s === 'Suspendu' ? 'warn' : '';
  }

  private load(page: number): void {
    this.loading.set(true);
    this.error.set(null);
    this.api
      .employes({
        search: this.search.trim() || undefined,
        statut: this.statut || undefined,
        departementId: this.departementId,
        page,
        pageSize: this.pageSize,
      })
      .subscribe({
        next: (d) => {
          this.items.set(d.items ?? []);
          this.total.set(d.total ?? 0);
          this.page.set(d.page ?? page);
          this.totalPages.set(d.totalPages ?? 0);
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(err.message);
        },
      });
  }
}
