import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import * as L from 'leaflet';
import { SuiviGpsService } from '../../core/services/suivi-gps.service';
import {
  JourneeCommercial,
  PointTrajet,
  PositionCommercial,
} from '../../core/models/suivi-gps.model';

/** Antananarivo — centre par défaut quand aucune position n'est connue. */
const CENTRE_DEFAUT: L.LatLngExpression = [-18.9137, 47.5361];
const RAFRAICHISSEMENT_MS = 30_000;

/**
 * Suivi GPS des commerciaux (admin).
 * - Sans sélection : dernière position de chaque commercial (en ligne / hors ligne), rafraîchie toutes les 30 s.
 * - Commercial sélectionné : trajet de la journée choisie, sessions et devis géolocalisés.
 */
@Component({
  selector: 'app-suivi-gps-page',
  imports: [FormsModule, DatePipe, RouterLink],
  templateUrl: './suivi-gps.page.html',
  styleUrl: './suivi-gps.page.scss',
})
export class SuiviGpsPage {
  private readonly api = inject(SuiviGpsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly mapEl = viewChild.required<ElementRef<HTMLElement>>('map');

  private map?: L.Map;
  private readonly calqueLive = L.layerGroup();
  private readonly calqueTrajet = L.layerGroup();
  private timer?: ReturnType<typeof setInterval>;
  private premierCadrage = true;

  readonly commerciaux = signal<PositionCommercial[]>([]);
  readonly minutesEnLigne = signal(5);
  readonly chargement = signal(false);
  readonly erreur = signal<string | null>(null);
  readonly derniereMaj = signal<Date | null>(null);

  readonly selection = signal<PositionCommercial | null>(null);
  readonly journee = signal<JourneeCommercial | null>(null);
  readonly chargementJournee = signal(false);

  readonly nbEnLigne = computed(() => this.commerciaux().filter((c) => c.enLigne).length);

  date = this.aujourdhui();
  autoRefresh = true;

  constructor() {
    afterNextRender(() => {
      this.initCarte();
      this.chargerLive();
      this.timer = setInterval(() => {
        if (!this.autoRefresh) return;
        this.chargerLive(true);
        if (this.selection() && this.date === this.aujourdhui()) this.chargerJournee(true);
      }, RAFRAICHISSEMENT_MS);
    });

    this.destroyRef.onDestroy(() => {
      if (this.timer) clearInterval(this.timer);
      this.map?.remove();
    });
  }

  // ── Données ──────────────────────────────────────────────────────────

  chargerLive(silencieux = false): void {
    if (!silencieux) this.chargement.set(true);
    this.api.live(this.minutesEnLigne()).subscribe({
      next: (data) => {
        this.commerciaux.set(data.items ?? []);
        this.derniereMaj.set(new Date());
        this.erreur.set(null);
        this.chargement.set(false);
        // Garder la fiche sélectionnée à jour (statut, dernière activité).
        const sel = this.selection();
        if (sel) this.selection.set(data.items.find((c) => c.userId === sel.userId) ?? sel);
        else this.dessinerLive();
      },
      error: (err) => {
        this.chargement.set(false);
        this.erreur.set(err?.message || 'Positions indisponibles');
      },
    });
  }

  selectionner(c: PositionCommercial): void {
    this.selection.set(c);
    this.journee.set(null);
    this.chargerJournee();
  }

  retourVueGlobale(): void {
    this.selection.set(null);
    this.journee.set(null);
    this.calqueTrajet.clearLayers();
    this.premierCadrage = true;
    this.dessinerLive();
  }

  onDateChange(): void {
    if (this.selection()) this.chargerJournee();
  }

  jourPrecedent(): void {
    this.decalerDate(-1);
  }

  jourSuivant(): void {
    if (this.date < this.aujourdhui()) this.decalerDate(1);
  }

  chargerJournee(silencieux = false): void {
    const sel = this.selection();
    if (!sel || !this.date) return;
    if (!silencieux) this.chargementJournee.set(true);
    this.api.journee(sel.userId, this.date).subscribe({
      next: (j) => {
        this.journee.set(j);
        this.chargementJournee.set(false);
        this.erreur.set(null);
        this.dessinerJournee(!silencieux);
      },
      error: (err) => {
        this.chargementJournee.set(false);
        this.erreur.set(err?.message || 'Trajet indisponible');
      },
    });
  }

  centrerSur(lat: number | null, lng: number | null): void {
    if (lat == null || lng == null || !this.map) return;
    this.map.setView([lat, lng], Math.max(this.map.getZoom(), 16));
  }

  // ── Affichage ────────────────────────────────────────────────────────

  dureeLisible(sec: number | null | undefined): string {
    const s = Math.max(0, Math.round(sec ?? 0));
    if (s < 60) return `${s} s`;
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return h > 0 ? `${h} h ${String(m).padStart(2, '0')}` : `${m} min`;
  }

  distanceLisible(m: number | null | undefined): string {
    const v = m ?? 0;
    return v >= 1000 ? `${(v / 1000).toFixed(1).replace('.', ',')} km` : `${Math.round(v)} m`;
  }

  ilYa(iso: string | null): string {
    if (!iso) return 'Jamais connecté';
    const min = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
    if (min < 1) return "À l'instant";
    if (min < 60) return `Il y a ${min} min`;
    const h = Math.round(min / 60);
    if (h < 24) return `Il y a ${h} h`;
    const j = Math.round(h / 24);
    return `Il y a ${j} jour${j > 1 ? 's' : ''}`;
  }

  formatAr(n: number | null | undefined): string {
    if (n == null || !Number.isFinite(n)) return '—';
    return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n) + ' Ar';
  }

  estAujourdhui(): boolean {
    return this.date === this.aujourdhui();
  }

  // ── Carte ────────────────────────────────────────────────────────────

  private initCarte(): void {
    this.map = L.map(this.mapEl().nativeElement, { zoomControl: true }).setView(CENTRE_DEFAUT, 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; contributeurs OpenStreetMap',
    }).addTo(this.map);
    this.calqueLive.addTo(this.map);
    this.calqueTrajet.addTo(this.map);
  }

  private dessinerLive(): void {
    if (!this.map) return;
    this.calqueLive.clearLayers();
    const bornes: L.LatLngExpression[] = [];

    for (const c of this.commerciaux()) {
      if (c.latitude == null || c.longitude == null) continue;
      const pos: L.LatLngExpression = [c.latitude, c.longitude];
      bornes.push(pos);
      L.marker(pos, { icon: this.iconeCommercial(c) })
        .bindTooltip(this.esc(c.libelle || c.login), { direction: 'top', offset: [0, -14] })
        .bindPopup(
          `<strong>${this.esc(c.libelle || c.login)}</strong><br>` +
            `${c.enLigne ? '🟢 En ligne' : '⚪ Hors ligne'} · ${this.esc(this.ilYa(c.derniereActivite))}<br>` +
            `Aujourd'hui : ${this.esc(this.dureeLisible(c.dureeJourSecondes))} · ${c.devisJour} devis`
        )
        .on('click', () => this.selectionner(c))
        .addTo(this.calqueLive);
    }

    if (this.premierCadrage && bornes.length) {
      this.map.fitBounds(L.latLngBounds(bornes), { padding: [40, 40], maxZoom: 15 });
      this.premierCadrage = false;
    }
  }

  private dessinerJournee(cadrer: boolean): void {
    if (!this.map) return;
    this.calqueLive.clearLayers();
    this.calqueTrajet.clearLayers();
    const j = this.journee();
    if (!j) return;

    const bornes: L.LatLngExpression[] = [];
    const parSession = new Map<string, PointTrajet[]>();
    for (const p of j.points) {
      const liste = parSession.get(p.sessionId) ?? [];
      liste.push(p);
      parSession.set(p.sessionId, liste);
    }

    for (const pts of parSession.values()) {
      const ligne = pts.map((p) => [p.latitude, p.longitude] as L.LatLngTuple);
      bornes.push(...ligne);
      L.polyline(ligne, { color: '#dc2626', weight: 4, opacity: 0.75 }).addTo(this.calqueTrajet);

      const debut = pts[0];
      const fin = pts[pts.length - 1];
      L.circleMarker([debut.latitude, debut.longitude], {
        radius: 7, color: '#fff', weight: 2, fillColor: '#16a34a', fillOpacity: 1,
      })
        .bindTooltip(`Début ${this.heure(debut.le)}`)
        .addTo(this.calqueTrajet);
      L.circleMarker([fin.latitude, fin.longitude], {
        radius: 7, color: '#fff', weight: 2, fillColor: fin.evenement === 'end' ? '#111827' : '#dc2626', fillOpacity: 1,
      })
        .bindTooltip(`${fin.evenement === 'end' ? 'Fin' : 'Dernier point'} ${this.heure(fin.le)}`)
        .addTo(this.calqueTrajet);
    }

    for (const d of j.devis) {
      bornes.push([d.latitude, d.longitude]);
      L.marker([d.latitude, d.longitude], { icon: this.iconeDevis() })
        .bindPopup(
          `<strong>Devis ${this.esc(d.numeroPiece)}</strong><br>` +
            `${this.esc(d.clientIntitule || d.clientNumero || '—')}<br>` +
            `${this.esc(this.formatAr(d.totalTTC))} · ${this.heure(d.creeLe)}` +
            (d.pieceTransformee ? `<br>Facturé : ${this.esc(d.pieceTransformee)}` : '')
        )
        .addTo(this.calqueTrajet);
    }

    if (cadrer) {
      if (bornes.length) this.map.fitBounds(L.latLngBounds(bornes), { padding: [40, 40], maxZoom: 17 });
      else this.centrerSur(this.selection()?.latitude ?? null, this.selection()?.longitude ?? null);
    }
  }

  private iconeCommercial(c: PositionCommercial): L.DivIcon {
    const couleur = c.enLigne ? '#16a34a' : '#9ca3af';
    const initiales = (c.libelle || c.login)
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((m) => m[0]?.toUpperCase() ?? '')
      .join('');
    return L.divIcon({
      className: '',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      html:
        `<div style="width:32px;height:32px;border-radius:50%;background:${couleur};` +
        `border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35);display:grid;place-items:center;` +
        `color:#fff;font:700 11px/1 system-ui,sans-serif">${this.esc(initiales)}</div>`,
    });
  }

  private iconeDevis(): L.DivIcon {
    return L.divIcon({
      className: '',
      iconSize: [26, 26],
      iconAnchor: [13, 13],
      html:
        '<div style="width:26px;height:26px;border-radius:6px;background:#ea580c;border:2px solid #fff;' +
        'box-shadow:0 1px 4px rgba(0,0,0,.35);display:grid;place-items:center;color:#fff;' +
        'font:700 12px/1 system-ui,sans-serif">D</div>',
    });
  }

  // ── Utilitaires ──────────────────────────────────────────────────────

  private heure(iso: string): string {
    return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  private esc(s: string): string {
    return s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!);
  }

  private aujourdhui(): string {
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }

  private decalerDate(jours: number): void {
    const d = new Date(this.date + 'T12:00:00');
    d.setDate(d.getDate() + jours);
    const p = (n: number) => String(n).padStart(2, '0');
    this.date = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
    this.onDateChange();
  }
}
