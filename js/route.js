// Calcul des chemins vidéo. Fonctions pures (pas de DOM) : testées par npm test.
import { BAV, PORTS_IN, PORTS_OUT, PTZ, PARC_DEFAUT, PARC_NOMS, ZONES } from './data.js';

// ---------------------------------------------------------------------------------------------
// Points de départ et d'arrivée
//   type 'matIn'  : prise reliée à une entrée de la matrice
//   type 'matOut' : prise / appareil relié à une sortie de la matrice
//   type 'tie'    : ligne directe vers le patch U27 de la régie (passive, marche dans les deux sens)
// ---------------------------------------------------------------------------------------------
export const SOURCES = [], DESTS = [];
for (const b of BAV) {
  for (const i of b.ins || []) SOURCES.push({ id: `${b.id}:${i.plaque}`, type: 'matIn', zone: b.zone, bav: b.id, plaque: i.plaque,
    port: i.port, cable: i.cable, lieu: b.lieu, synchro: b.synchro, nom: `${b.id} ${i.plaque} · ${b.lieu}` });
  for (const o of b.outs || []) DESTS.push({ id: `${b.id}:${o.plaque}`, type: 'matOut', zone: b.zone, bav: b.id, plaque: o.plaque,
    port: o.port, cable: o.cable, lieu: b.lieu, nom: `${b.id} ${o.plaque} · ${b.lieu}` });
  for (const v of b.vid || []) {
    const vp = b.id === 'BAV-05';
    const p = { id: `${b.id}:${v.plaque}`, type: 'tie', zone: b.zone, bav: b.id, plaque: v.plaque, u27: v.u27, cable: v.cable,
      lieu: b.lieu, vp, nom: vp ? `Vidéoprojecteur · BAV-05 ${v.plaque}` : `${b.id} ${v.plaque} · ${b.lieu}` };
    if (v.occupe) { DESTS.push({ ...p, id: 'ecran24', fixe: true, nom: 'Écran 24" table régie (via BAV-03 VID-01)', occupe: v.occupe }); continue; }
    SOURCES.push(p); DESTS.push(p);
  }
}
SOURCES.push({ id: 'ptz', type: 'matIn', zone: 'salle', port: 29, cable: 2029, fixe: true, lieu: 'Fond de salle',
  nom: `Caméra PTZ ${PTZ.camera} · fond de salle` });
DESTS.push({ id: 'sv1', type: 'matOut', zone: 'regie', port: 9, cable: 2049, fixe: true, lieu: 'Régie', nom: 'SmartView Duo · écran gauche (régie)' });
DESTS.push({ id: 'sv2', type: 'matOut', zone: 'regie', port: 10, cable: 2050, fixe: true, lieu: 'Régie', nom: 'SmartView Duo · écran droit (régie)' });

export const src = id => SOURCES.find(s => s.id === id);
export const dst = id => DESTS.find(d => d.id === id);

export const APP_SRC = { hdmi: 'Ordi / source HDMI', sdi: 'Caméra / source SDI' };
export const APP_DST = { hdmi: 'Écran / VP en HDMI', sdi: 'Appareil en SDI', usb: 'Ordi en USB (Inogeni)' };

// Lieu d'une étape, pour l'étiquette colorée
const lieuDe = p => p.id === 'ptz' ? 'Salle' : p.vp ? 'VP' : ZONES[p.zone]?.nom || '';

// ---------------------------------------------------------------------------------------------
// compute(state) → pour chaque liaison : étapes, routage Videohub, cordons régie, matériel, alertes.
// state = { links:[{id, nom, src, srcApp, dst, dstApp}], settings:{ vpEntree:'hdmi'|'sdi', parc:{…} } }
// ---------------------------------------------------------------------------------------------
export function compute(state) {
  const settings = { vpEntree: 'hdmi', ...(state.settings || {}) };
  const parc = { ...PARC_DEFAUT, ...(settings.parc || {}) };
  const links = (state.links || []).filter(l => l.src && l.dst);
  const res = { links: [], videohub: [], cordons: [], materiel: {}, warnings: [] };

  // 1. Une ligne directe source utilisée vers une seule ligne directe → cordon U27 ↔ U27 sans matrice.
  //    Sinon (plusieurs destinations, ou destination sur la matrice) la source entre dans la matrice par U28 A1–A8.
  const parSource = {};
  for (const l of links) (parSource[l.src] ||= []).push(l);

  const u28In = {}, u28Out = {};           // clé point → n° de port matrice 1–8
  const usedIn = new Set(), usedOut = new Set();
  const take = (used, key, map) => {
    if (map[key]) return map[key];
    for (let p = 1; p <= 8; p++) if (!used.has(p)) { used.add(p); return (map[key] = p); }
    return null;
  };
  const routes = {};                        // sortie matrice → entrée matrice
  const destUsed = {};

  for (const l of links) {
    const s = src(l.src), d = dst(l.dst);
    const out = { id: l.id, nom: l.nom || '', ok: true, steps: [], chips: [], warnings: [], infos: [] };
    res.links.push(out);
    if (!s || !d) { out.ok = false; out.warnings.push('Point inconnu.'); continue; }
    if (s.type === 'tie' && d.type === 'tie' && s.id === d.id) { out.ok = false; out.warnings.push('Départ et arrivée identiques.'); continue; }
    if (destUsed[d.id]) { out.ok = false; out.warnings.push(`${d.nom} reçoit déjà « ${destUsed[d.id]} ». Une prise ne reçoit qu'une image.`); continue; }
    destUsed[d.id] = l.nom || s.nom;

    const srcApp = s.id === 'ptz' ? 'ptz' : (l.srcApp || 'hdmi');
    const dstApp = d.id === 'ecran24' ? 'ecran24' : d.id === 'sv1' || d.id === 'sv2' ? 'smartview'
      : d.vp ? (settings.vpEntree === 'sdi' ? 'sdi' : 'hdmi') : (l.dstApp || 'hdmi');
    const step = (lieu, txt, extra = {}) => out.steps.push({ lieu, txt, ...extra });

    // --- départ ---
    if (srcApp === 'ptz') {
      step('Salle', `La caméra PTZ sort en 3G-SDI (câble ${PTZ.sdi.cable}) directement sur l'entrée 29 de la matrice. Rien à brancher.`, { fixe: true });
    } else if (srcApp === 'hdmi') {
      count(res.materiel, 'hdmi2sdi');
      step(lieuDe(s), `Ordi → câble HDMI → <b>convertisseur HDMI → SDI</b> (alimenté) → câble BNC → prise <b>${s.bav} ${s.plaque}</b>.`);
    } else {
      step(lieuDe(s), `Source SDI → câble BNC → prise <b>${s.bav} ${s.plaque}</b>.`);
      if (s.synchro) step(lieuDe(s), `Si la caméra a une entrée genlock : câble BNC depuis la prise <b>${s.bav} ${s.synchro.plaque}</b> (synchro ${s.synchro.cable}, patch synchro nodal ${s.synchro.patch}).`, { option: true });
    }
    out.chips.push(s.bav ? `${s.bav} ${s.plaque}` : 'PTZ');

    // --- chemin ---
    const direct = s.type === 'tie' && d.type === 'tie' && parSource[l.src].length === 1;
    if (direct) {
      res.cordons.push({ de: s.u27, vers: d.u27, nom: l.nom || s.nom, link: l.id });
      step('Régie', `Patch U27 : cordon BNC de <b>${s.u27}</b> (${s.bav} ${s.plaque}) à <b>${d.u27}</b> (${d.bav} ${d.plaque}). Pas besoin de la matrice.`);
      out.chips.push(`U27 ${s.u27}→${d.u27}`);
    } else {
      // entrée matrice
      let inPort = s.port;
      if (s.type === 'tie') {
        inPort = take(usedIn, s.id, u28In);
        if (!inPort) { out.ok = false; out.warnings.push('Plus d\'entrée libre sur U28 (A1–A8).'); continue; }
        if (u28In[s.id] === inPort && !res.cordons.some(c => c.de === s.u27 && c.vers === `A${inPort}`))
          res.cordons.push({ de: s.u27, vers: `A${inPort}`, nom: l.nom || s.nom, link: l.id });
        step('Régie', `Patch : cordon BNC de <b>U27 ${s.u27}</b> (${s.bav} ${s.plaque}) à <b>U28 A${inPort}</b> = entrée ${inPort} de la matrice.`);
        out.chips.push(`U27 ${s.u27}→U28 A${inPort}`);
      }
      // sortie matrice
      let outPort = d.port;
      if (d.type === 'tie') {
        outPort = take(usedOut, d.id, u28Out);
        if (!outPort) { out.ok = false; out.warnings.push('Plus de sortie libre sur U28 (A9–A16).'); continue; }
      }
      if (routes[outPort] && routes[outPort] !== inPort) { out.ok = false; out.warnings.push(`La sortie ${outPort} de la matrice est déjà utilisée.`); continue; }
      routes[outPort] = inPort;
      res.videohub.push({ out: outPort, in: inPort, nom: l.nom || s.nom, link: l.id });
      step('Nodal', `Videohub : router l'<b>entrée ${inPort}</b> (${PORTS_IN[inPort]?.label || s.nom}) vers la <b>sortie ${outPort}</b>${d.type === 'tie' ? ' (retour en régie)' : ''}. Depuis Videohub Control sur le réseau, pas besoin d'aller au nodal.`);
      out.chips.push(`Hub ${inPort}→${outPort}`);
      if (d.type === 'tie') {
        res.cordons.push({ de: `A${outPort + 8}`, vers: d.u27, nom: l.nom || s.nom, link: l.id });
        step('Régie', `Patch : cordon BNC de <b>U28 A${outPort + 8}</b> (sortie ${outPort} de la matrice) à <b>U27 ${d.u27}</b> (${d.bav} ${d.plaque}).`);
        out.chips.push(`U28 A${outPort + 8}→U27 ${d.u27}`);
      }
    }

    // --- arrivée ---
    const ici = d.vp ? 'VP' : d.id === 'ecran24' || d.id === 'sv1' || d.id === 'sv2' ? 'Régie' : lieuDe(d);
    if (dstApp === 'smartview') step('Régie', `L'image s'affiche sur le <b>${d.nom.split(' · ')[1]}</b> du SmartView Duo. Rien à brancher.`, { fixe: true });
    else if (dstApp === 'ecran24') step('Régie', 'L\'écran 24" de la table régie est branché à demeure (convertisseur SDI → HDMI fixe, câbles 2097 et 2501).', { fixe: true });
    else if (dstApp === 'sdi') step(ici, `Prise <b>${d.bav} ${d.plaque}</b> → câble BNC → entrée SDI ${d.vp ? 'du vidéoprojecteur' : 'de l\'appareil'}.`);
    else if (dstApp === 'usb') {
      count(res.materiel, 'sdi2hdmi'); count(res.materiel, 'inogeni');
      step(ici, `Prise <b>${d.bav} ${d.plaque}</b> → câble BNC → <b>convertisseur SDI → HDMI</b> → câble HDMI → <b>Inogeni</b> → câble USB → ordi. L'ordi voit une webcam.`);
    } else {
      count(res.materiel, 'sdi2hdmi');
      step(ici, `Prise <b>${d.bav} ${d.plaque}</b> → câble BNC → <b>convertisseur SDI → HDMI</b> (alimenté) → câble HDMI → ${d.vp ? 'entrée HDMI du vidéoprojecteur' : 'écran'}.`);
    }
    out.chips.push(d.vp ? 'VP' : d.id === 'ecran24' ? 'Écran 24"' : d.id.startsWith('sv') ? 'SmartView' : `${d.bav} ${d.plaque}`);

    if (srcApp === 'hdmi') out.infos.push('Ordi : règle la sortie en 1920×1080 (50 ou 60 Hz). Les vidéos protégées (HDCP) donnent un écran noir à travers un convertisseur.');
    if (d.vp && !settings.vpEntreeVerifiee) out.infos.push(`Entrée du VP réglée sur ${settings.vpEntree.toUpperCase()} : à vérifier sur place (Réglages).`);
  }

  // 2. Parc
  for (const [k, n] of Object.entries(res.materiel))
    if (n > (parc[k] ?? 0)) res.warnings.push(`Il faut ${n} × ${PARC_NOMS[k]}, tu en as ${parc[k] ?? 0}.`);

  res.videohub.sort((a, b) => a.out - b.out);
  return res;
}

function count(m, k) { m[k] = (m[k] || 0) + 1; }

