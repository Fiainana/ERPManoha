import type { PaieBulletin, PaieBulletinLigne, PaiePeriode } from '../../core/models/rh.model';

/**
 * Impression de la paie : le HTML est généré à part puis imprimé dans un cadre invisible,
 * pour ne dépendre ni des menus de l'application ni du thème.
 *
 * - Bulletin : A5 portrait, deux exemplaires (salarié / société) côte à côte sur une feuille A4 paysage.
 * - État de salaire et état des déclarations : A4 paysage.
 */

const nombre = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });

function n(v: number): string {
  return nombre.format(Math.round(v)).replace(/[  ]/g, ' ');
}

function esc(v: string | null | undefined): string {
  return (v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function libelleMois(mois: string): string {
  const [y, m] = mois.split('-').map(Number);
  const t = new Date(y, m - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function dateFr(iso: string | null | undefined): string {
  if (!iso) return '—';
  const [a, m, j] = iso.slice(0, 10).split('-');
  return `${j}/${m}/${a}`;
}

function duree(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h} h ${String(m).padStart(2, '0')}` : `${m} min`;
}

/** Imprime un document HTML complet via un cadre invisible. */
export function imprimerHtml(html: string): void {
  const cadre = document.createElement('iframe');
  cadre.setAttribute('aria-hidden', 'true');
  cadre.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';
  document.body.appendChild(cadre);
  const doc = cadre.contentDocument;
  const fenetre = cadre.contentWindow;
  if (!doc || !fenetre) {
    cadre.remove();
    return;
  }
  doc.open();
  doc.write(html);
  doc.close();
  const lancer = () => {
    fenetre.focus();
    fenetre.print();
    setTimeout(() => cadre.remove(), 60_000);
  };
  // Laisse au cadre le temps de mettre en page.
  setTimeout(lancer, 250);
}

// —— Bulletins ——

const CSS_BASE = `
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; color: #111; }
  table { border-collapse: collapse; width: 100%; }
  .num { text-align: right; white-space: nowrap; }
  .petit { font-size: 0.85em; color: #444; }
`;

const CSS_BULLETIN = `
  @page { size: A4 landscape; margin: 0; }
  .feuille { width: 297mm; height: 210mm; display: flex; page-break-after: always; break-after: page; overflow: hidden; }
  .feuille:last-child { page-break-after: auto; break-after: auto; }
  .exemplaire { width: 148.5mm; height: 210mm; padding: 8mm 9mm; font-size: 8.5pt; position: relative; display: flex; flex-direction: column; }
  .exemplaire + .exemplaire { border-left: 1px dashed #888; }
  .mention { position: absolute; top: 3mm; right: 9mm; font-size: 7pt; text-transform: uppercase; letter-spacing: .05em; color: #555; }
  .brouillon { position: absolute; top: 85mm; left: 0; right: 0; text-align: center; font-size: 34pt; font-weight: 700; color: rgba(200,0,0,.13); transform: rotate(-24deg); pointer-events: none; }
  .entete { display: flex; justify-content: space-between; gap: 6mm; border-bottom: 1.5px solid #111; padding-bottom: 3mm; margin-bottom: 3mm; }
  .societe { font-size: 11pt; font-weight: 700; }
  .titre { text-align: right; }
  .titre strong { font-size: 11pt; display: block; }
  .employe { display: grid; grid-template-columns: 1fr 1fr; gap: 1mm 5mm; margin-bottom: 3mm; border: 1px solid #999; padding: 2mm 3mm; }
  .employe div { display: flex; gap: 2mm; }
  .employe dt { color: #555; min-width: 21mm; }
  .employe dd { margin: 0; font-weight: 600; }
  .employe dl { margin: 0; display: grid; gap: 0.8mm; }
  .lignes th { background: #eee; border: 1px solid #999; padding: 1.2mm 1.8mm; text-align: left; font-size: 8pt; }
  .lignes th.num { text-align: right; }
  .lignes td { border: 1px solid #ccc; padding: 1.2mm 1.8mm; vertical-align: top; }
  .lignes tr.sous td { background: #f4f4f4; font-weight: 700; }
  .lignes tr.net td { border: 1.5px solid #111; font-size: 10.5pt; font-weight: 700; background: #e8e8e8; padding: 2mm; }
  .patronal { margin-top: 3mm; border: 1px solid #bbb; padding: 1.8mm 2.5mm; display: flex; flex-wrap: wrap; gap: 1mm 4mm; font-size: 8pt; }
  .patronal .total { width: 100%; font-weight: 700; }
  .signatures { margin-top: auto; display: grid; grid-template-columns: 1fr 1fr; gap: 6mm; padding-top: 4mm; }
  .signatures div { border: 1px solid #999; height: 20mm; padding: 1.5mm 2mm; font-size: 7.5pt; color: #444; }
  .pied { margin-top: 2.5mm; font-size: 6.8pt; color: #555; }
`;

function exemplaire(b: PaieBulletin, mention: string): string {
  const p = b.parametres;
  const ligneRet = (libelle: string, minutes: number, montant: number): string =>
    montant
      ? `<tr><td>${libelle} <span class="petit">(${duree(minutes)})</span></td><td class="num petit">${n(b.tauxHoraire)}&nbsp;/h</td><td class="num"></td><td class="num">${n(montant)}</td></tr>`
      : '';

  const prorata =
    b.prorata < 1
      ? ` <span class="petit">(au prorata : ${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(b.prorata * 100)} % du mois)</span>`
      : '';
  const reduction = b.reductionCharge ? `, réduction charges de famille ${n(b.reductionCharge)}` : '';

  const irsaLigne = b.irsaPrisEnCharge
    ? `<tr><td>IRSA <strong>pris en charge par la société</strong> <span class="petit">(base ${n(b.baseIrsa)}${reduction})</span></td><td class="num petit">${n(b.irsa)}</td><td class="num"></td><td class="num">0</td></tr>`
    : `<tr><td>IRSA <span class="petit">(base ${n(b.baseIrsa)}${reduction})</span></td><td class="num"></td><td class="num"></td><td class="num">${n(b.irsa)}</td></tr>`;

  const patronal = [
    `CNaPS ${n(b.cnapsEmployeur)}`,
    `OSTIE ${n(b.ostieEmployeur)}`,
    `FMFP ${n(b.fmfpEmployeur)}`,
    b.irsaPrisEnCharge ? `IRSA pris en charge ${n(b.irsa)}` : '',
  ]
    .filter(Boolean)
    .map((t) => `<span>${t}</span>`)
    .join('');

  const calcule = `Calculé le ${esc(b.calculeLe ? new Date(b.calculeLe).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '')}${b.calculePar ? ' par ' + esc(b.calculePar) : ''}.`;
  const valide = b.valideLe
    ? ` Validé le ${esc(new Date(b.valideLe).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }))}${b.validePar ? ' par ' + esc(b.validePar) : ''}.`
    : '';

  return `
  <section class="exemplaire">
    <div class="mention">${esc(mention)}</div>
    ${b.statut === 'Valide' ? '' : '<div class="brouillon">BROUILLON</div>'}
    <header class="entete">
      <div>
        <div class="societe">${esc(b.societe.nom)}</div>
        <div class="petit">${esc(b.societe.adresse)}</div>
        <div class="petit">${esc(b.societe.legal)}</div>
      </div>
      <div class="titre"><strong>BULLETIN DE PAIE</strong>${esc(libelleMois(b.mois))}</div>
    </header>

    <div class="employe">
      <dl>
        <div><dt>Nom</dt><dd>${esc(b.employe.nom)}</dd></div>
        <div><dt>Matricule</dt><dd>${esc(b.employe.matricule)}</dd></div>
        <div><dt>Poste</dt><dd>${esc(b.employe.poste) || '—'}</dd></div>
        <div><dt>Département</dt><dd>${esc(b.employe.departement) || '—'}</dd></div>
      </dl>
      <dl>
        <div><dt>N° CIN</dt><dd>${esc(b.employe.cin) || '—'}</dd></div>
        <div><dt>N° CNaPS</dt><dd>${esc(b.employe.cnaps) || '—'}</dd></div>
        <div><dt>Embauche</dt><dd>${dateFr(b.employe.dateEmbauche)}</dd></div>
        <div><dt>Famille</dt><dd>${esc(b.employe.situationFamiliale) || '—'}, ${b.nbEnfants} enfant(s)</dd></div>
      </dl>
    </div>

    <table class="lignes">
      <thead><tr><th>Désignation</th><th class="num">Base</th><th class="num">Gains</th><th class="num">Retenues</th></tr></thead>
      <tbody>
        <tr><td>Salaire de base${prorata}</td><td class="num">${n(b.salaireContrat)}</td><td class="num">${n(b.salaireBase)}</td><td class="num"></td></tr>
        ${ligneRet('Retards', b.minutes.retard, b.retenues.retard)}
        ${ligneRet('Pause déjeuner dépassée', b.minutes.pauseDepassee, b.retenues.pauseDepassee)}
        ${ligneRet('Départs anticipés', b.minutes.departAnticipe, b.retenues.departAnticipe)}
        ${ligneRet('Absences non payées', b.minutes.absence, b.retenues.absence)}
        <tr class="sous"><td>Salaire brut</td><td class="num"></td><td class="num">${n(b.brut)}</td><td class="num"></td></tr>
        <tr><td>CNaPS <span class="petit">(part salarié${p ? ', ' + p.CnapsSalarie + ' %' : ''})</span></td><td class="num"></td><td class="num"></td><td class="num">${n(b.cnapsSalarie)}</td></tr>
        <tr><td>OSTIE – santé <span class="petit">(part salarié${p ? ', ' + p.OstieSalarie + ' %' : ''})</span></td><td class="num"></td><td class="num"></td><td class="num">${n(b.ostieSalarie)}</td></tr>
        ${irsaLigne}
        <tr class="net"><td colspan="3">NET À PAYER</td><td class="num">${n(b.net)}&nbsp;Ar</td></tr>
      </tbody>
    </table>

    <div class="patronal"><strong>Charges patronales</strong>${patronal}<span class="total">Coût total employeur : ${n(b.coutEmployeur)} Ar</span></div>

    <div class="signatures">
      <div>Signature de l’employeur</div>
      <div>Reçu le ………………… — Signature du salarié<br />« Lu et approuvé »</div>
    </div>
    <div class="pied">${calcule}${valide} À conserver sans limitation de durée.</div>
  </section>`;
}

/** Une feuille A4 paysage par bulletin : exemplaire salarié à gauche, exemplaire société à droite. */
export function htmlBulletins(bulletins: PaieBulletin[]): string {
  const feuilles = bulletins
    .map((b) => `<div class="feuille">${exemplaire(b, 'Exemplaire salarié')}${exemplaire(b, 'Exemplaire société')}</div>`)
    .join('');
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Bulletins de paie</title><style>${CSS_BASE}${CSS_BULLETIN}</style></head><body>${feuilles}</body></html>`;
}

// —— États du mois ——

const CSS_ETAT = `
  @page { size: A4 landscape; margin: 10mm; }
  body { font-size: 8.5pt; }
  h1 { font-size: 14pt; margin: 0 0 1mm; }
  .sous-titre { color: #444; margin-bottom: 4mm; }
  .entete-etat { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 3mm; }
  table.etat th, table.etat td { border: 1px solid #888; padding: 1.4mm 1.8mm; }
  table.etat th { background: #eee; font-size: 8pt; text-align: left; }
  table.etat th.num { text-align: right; }
  table.etat thead { display: table-header-group; }
  table.etat tr { page-break-inside: avoid; }
  table.etat tfoot td { font-weight: 700; background: #f0f0f0; }
  td.emarge { width: 32mm; }
  h2 { font-size: 11pt; margin: 6mm 0 2mm; }
  .note { margin-top: 3mm; font-size: 7.5pt; color: #444; }
  .signatures-etat { display: flex; gap: 10mm; margin-top: 8mm; }
  .signatures-etat div { flex: 1; border: 1px solid #888; height: 22mm; padding: 1.5mm 2mm; font-size: 8pt; color: #444; }
`;

function enteteEtat(titre: string, p: PaiePeriode): string {
  const brouillon = p.statut === 'Valide' ? '' : ' — <strong>NON VALIDÉ (brouillon)</strong>';
  return `<div class="entete-etat"><div><h1>${esc(titre)}</h1><div class="sous-titre">MANOHA ENERGIE — ${esc(libelleMois(p.mois))}${brouillon}</div></div><div class="petit">Édité le ${new Date().toLocaleDateString('fr-FR')}</div></div>`;
}

function document_(titre: string, corps: string): string {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${esc(titre)}</title><style>${CSS_BASE}${CSS_ETAT}</style></head><body>${corps}</body></html>`;
}

/** État de salaire : une ligne par employé, avec colonne d'émargement pour le paiement. */
export function htmlEtatSalaire(p: PaiePeriode): string {
  const t = p.totaux;
  const lignes = p.bulletins
    .map(
      (b: PaieBulletinLigne, i: number) => `<tr>
        <td class="num">${i + 1}</td><td>${esc(b.matricule)}</td><td>${esc(b.nom)}</td><td>${esc(b.departement) || '—'}</td>
        <td class="num">${n(b.salaireBase)}</td><td class="num">${n(b.retenues)}</td><td class="num">${n(b.brut)}</td>
        <td class="num">${n(b.cnapsSalarie)}</td><td class="num">${n(b.ostieSalarie)}</td>
        <td class="num">${b.irsaPrisEnCharge ? n(b.irsa) + '&nbsp;*' : n(b.irsa)}</td>
        <td class="num"><strong>${n(b.net)}</strong></td><td class="emarge"></td></tr>`,
    )
    .join('');
  const asterisque = p.bulletins.some((b) => b.irsaPrisEnCharge)
    ? '<div class="note">* IRSA pris en charge par la société : montant à verser mais non retenu sur le salaire (le net n’est pas diminué).</div>'
    : '';
  const corps = `${enteteEtat('État de salaire', p)}
    <table class="etat">
      <thead><tr><th class="num">N°</th><th>Matricule</th><th>Nom et prénoms</th><th>Département</th>
        <th class="num">Salaire de base</th><th class="num">Retenues</th><th class="num">Brut</th>
        <th class="num">CNaPS</th><th class="num">OSTIE</th><th class="num">IRSA</th><th class="num">Net à payer</th><th>Émargement</th></tr></thead>
      <tbody>${lignes}</tbody>
      <tfoot><tr><td colspan="4">TOTAL (${t.nbBulletins} salarié${t.nbBulletins > 1 ? 's' : ''})</td>
        <td class="num">${n(t.salaireBase)}</td><td class="num">${n(t.retenues)}</td><td class="num">${n(t.brut)}</td>
        <td class="num">${n(t.cnapsSalarie)}</td><td class="num">${n(t.ostieSalarie)}</td><td class="num">${n(t.irsa)}</td>
        <td class="num">${n(t.net)}</td><td></td></tr></tfoot>
    </table>${asterisque}
    <div class="signatures-etat"><div>Établi par</div><div>Vérifié par</div><div>Approuvé par la direction</div></div>`;
  return document_('État de salaire', corps);
}

/** État des déclarations : récapitulatif CNaPS / OSTIE / FMFP / IRSA puis détail par employé. */
export function htmlDeclarations(p: PaiePeriode): string {
  const t = p.totaux;
  const irsaSalarie = p.bulletins.filter((b) => !b.irsaPrisEnCharge).reduce((s, b) => s + b.irsa, 0);
  const irsaSociete = p.bulletins.filter((b) => b.irsaPrisEnCharge).reduce((s, b) => s + b.irsa, 0);

  const recap = `<h2>Récapitulatif à déclarer et à verser</h2>
    <table class="etat">
      <thead><tr><th>Organisme</th><th class="num">Part salarié</th><th class="num">Part employeur</th><th class="num">Total à verser</th></tr></thead>
      <tbody>
        <tr><td>CNaPS</td><td class="num">${n(t.cnapsSalarie)}</td><td class="num">${n(t.cnapsEmployeur)}</td><td class="num"><strong>${n(t.cnapsADeclarer)}</strong></td></tr>
        <tr><td>OSTIE (santé)</td><td class="num">${n(t.ostieSalarie)}</td><td class="num">${n(t.ostieEmployeur)}</td><td class="num"><strong>${n(t.ostieADeclarer)}</strong></td></tr>
        <tr><td>FMFP (formation)</td><td class="num">—</td><td class="num">${n(t.fmfpEmployeur)}</td><td class="num"><strong>${n(t.fmfpEmployeur)}</strong></td></tr>
        <tr><td>IRSA (impôt)</td><td class="num">${n(irsaSalarie)}</td><td class="num">${n(irsaSociete)}</td><td class="num"><strong>${n(t.irsa)}</strong></td></tr>
      </tbody>
      <tfoot><tr><td>TOTAL</td><td class="num">${n(t.cnapsSalarie + t.ostieSalarie + irsaSalarie)}</td>
        <td class="num">${n(t.cnapsEmployeur + t.ostieEmployeur + t.fmfpEmployeur + irsaSociete)}</td>
        <td class="num">${n(t.cnapsADeclarer + t.ostieADeclarer + t.fmfpEmployeur + t.irsa)}</td></tr></tfoot>
    </table>
    <div class="note">Part salarié de l’IRSA : retenue sur le salaire. Part employeur de l’IRSA : IRSA pris en charge par la société.</div>`;

  const lignes = p.bulletins
    .map(
      (b, i) => `<tr><td class="num">${i + 1}</td><td>${esc(b.matricule)}</td><td>${esc(b.nom)}</td><td>${esc(b.numeroCnaps) || '—'}</td>
        <td class="num">${n(b.brut)}</td>
        <td class="num">${n(b.cnapsSalarie)}</td><td class="num">${n(b.cnapsEmployeur)}</td>
        <td class="num">${n(b.ostieSalarie)}</td><td class="num">${n(b.ostieEmployeur)}</td>
        <td class="num">${n(b.fmfpEmployeur)}</td><td class="num">${n(b.irsa)}</td></tr>`,
    )
    .join('');
  const detail = `<h2>Détail par employé</h2>
    <table class="etat">
      <thead><tr><th class="num">N°</th><th>Matricule</th><th>Nom et prénoms</th><th>N° CNaPS</th><th class="num">Salaire brut</th>
        <th class="num">CNaPS salarié</th><th class="num">CNaPS employeur</th><th class="num">OSTIE salarié</th><th class="num">OSTIE employeur</th>
        <th class="num">FMFP</th><th class="num">IRSA</th></tr></thead>
      <tbody>${lignes}</tbody>
      <tfoot><tr><td colspan="4">TOTAL</td><td class="num">${n(t.brut)}</td><td class="num">${n(t.cnapsSalarie)}</td><td class="num">${n(t.cnapsEmployeur)}</td>
        <td class="num">${n(t.ostieSalarie)}</td><td class="num">${n(t.ostieEmployeur)}</td><td class="num">${n(t.fmfpEmployeur)}</td><td class="num">${n(t.irsa)}</td></tr></tfoot>
    </table>`;
  return document_('État des déclarations', `${enteteEtat('État des déclarations sociales et fiscales', p)}${recap}${detail}`);
}
