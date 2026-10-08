import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  RapportVenteMailService,
  RapportVenteMailConfig,
} from '../../core/services/rapport-vente-mail.service';

@Component({
  selector: 'app-rapport-vente-mail-page',
  imports: [FormsModule, DatePipe, RouterLink],
  templateUrl: './rapport-vente-mail.page.html',
  styleUrls: ['./etat-vente.page.scss', './rapport-mail.extra.scss'],
})
export class RapportVenteMailPage implements OnInit {
  private readonly api = inject(RapportVenteMailService);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly sending = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);
  readonly config = signal<RapportVenteMailConfig | null>(null);

  actif = true;
  heure = 17;
  minute = 0;
  destinatairesText = '';
  scopeComptoir = true;
  scopeB2b = true;
  scopeTous = false;
  dateTest = this.todayIso();

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.getConfig().subscribe({
      next: (c) => {
        this.config.set(c);
        this.actif = c.actif;
        this.heure = c.heure;
        this.minute = c.minute;
        this.destinatairesText = (c.destinataires || []).join('\n');
        const scopes = (c.scopesPdf || []).map((s) => s.toLowerCase());
        this.scopeComptoir = scopes.includes('comptoir');
        this.scopeB2b = scopes.includes('b2b');
        this.scopeTous = scopes.includes('tous');
        if (!this.scopeComptoir && !this.scopeB2b && !this.scopeTous) {
          this.scopeComptoir = true;
          this.scopeB2b = true;
        }
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.message || 'Impossible de charger la configuration');
      },
    });
  }

  save(): void {
    this.saving.set(true);
    this.error.set(null);
    this.success.set(null);
    const destinataires = this.destinatairesText
      .split(/[;\n,]/)
      .map((s) => s.trim())
      .filter((s) => s.includes('@'));
    const scopesPdf: string[] = [];
    if (this.scopeComptoir) scopesPdf.push('comptoir');
    if (this.scopeB2b) scopesPdf.push('b2b');
    if (this.scopeTous) scopesPdf.push('tous');

    this.api
      .save({
        actif: this.actif,
        heure: Number(this.heure),
        minute: Number(this.minute),
        destinataires,
        scopesPdf,
      })
      .subscribe({
        next: (c) => {
          this.config.set(c);
          this.saving.set(false);
          this.success.set('Configuration enregistrée');
        },
        error: (err) => {
          this.saving.set(false);
          this.error.set(err?.error?.message || err?.message || 'Erreur enregistrement');
        },
      });
  }

  envoyerTest(): void {
    this.sending.set(true);
    this.error.set(null);
    this.success.set(null);
    this.api.envoyer(this.dateTest || undefined).subscribe({
      next: () => {
        this.sending.set(false);
        this.success.set('Rapport envoyé');
        this.reload();
      },
      error: (err) => {
        this.sending.set(false);
        this.error.set(err?.error?.message || err?.message || 'Envoi échoué');
      },
    });
  }

  private todayIso(): string {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
  }
}
