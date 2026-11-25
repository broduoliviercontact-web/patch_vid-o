import { BAV, bav, ZONES, PORTS_IN, PORTS_OUT, U27, SYNCHRO, PTZ, VIDEOHUB, PARC_DEFAUT, PARC_NOMS } from './data.js';
import { compute, SOURCES, DESTS, src, dst, APP_SRC, APP_DST } from './route.js';

const $ = s => document.querySelector(s);
const KEY = 'patchvideo-v1';
const COULEURS = ['#38bdf8', '#f0a53a', '#c792ea', '#4cc38a', '#ff7bd5', '#ffcb6b', '#82aaff', '#ff7b72', '#7fdbca', '#d4a5ff'];
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const uid = () => Math.random().toString(36).slice(2, 9);

let state = load();
let res;

function load() {
  try { const s = JSON.parse(localStorage.getItem(KEY)); if (s?.links) return s; } catch {}
  return fresh();
}
function fresh() { return { artist: '', date: '', links: [], settings: { vpEntree: 'hdmi', vpEntreeVerifiee: false, parc: { ...PARC_DEFAUT } } }; }
function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {} }

const couleur = id => COULEURS[state.links.findIndex(l => l.id === id) % COULEURS.length];

// ------------------------------------------------------------------ rendu général
function render() {
  res = compute(state);
  save();
  $('#artist').value = state.artist || ''; $('#date').value = state.date || '';
  renderUsage(); renderLinks(); renderHub(); renderRegie(); renderPlan(); renderFiche();
}

function renderUsage() {
  const n = state.links.length, ok = res.links.filter(l => l.ok).length;
  const chips = [`<span class="chip"><b>${ok}</b>/${n} liaison${n > 1 ? 's' : ''}</span>`,
    `<span class="chip">Videohub <b>${res.videohub.length}</b></span>`,
    `<span class="chip">Cordons régie <b>${res.cordons.length}</b></span>`];
  const parc = { ...PARC_DEFAUT, ...state.settings.parc };
  for (const [k, v] of Object.entries(res.materiel))
    chips.push(`<span class="chip ${v > parc[k] ? 'full' : ''}">${PARC_NOMS[k].replace(' Blackmagic', '').replace('Passerelle ', '')} <b>${v}/${parc[k]}</b></span>`);
  $('#usage').innerHTML = chips.join('');
}

// ------------------------------------------------------------------ onglet Liaisons
function options(list, sel, other) {
  const groups = {};
  for (const p of list) (groups[p.zone] ||= []).push(p);
  let h = `<option value="">— choisir —</option>`;
  const order = list === SOURCES ? ['plateau', 'salle', 'regie', 'gradins', 'rdc', 'balcons'] : ['salle', 'regie', 'plateau', 'gradins', 'rdc'];
  for (const z of order) if (groups[z]) {
    h += `<optgroup label="${ZONES[z].nom}">`;
    for (const p of groups[z]) h += `<option value="${p.id}" ${p.id === sel ? 'selected' : ''} ${p.id === other ? 'disabled' : ''}>${esc(p.nom)}</option>`;
    h += `</optgroup>`;
  }
  return h;
}
const seg = (name, opts, val, title) => `<span class="seg" data-seg="${name}" title="${title}">${Object.entries(opts).map(([k, v]) =>
  `<button data-v="${k}" class="${k === val ? 'on' : ''}" title="${v}">${k.toUpperCase()}</button>`).join('')}</span>`;

function renderLinks() {
  $('#globalWarn').innerHTML = res.warnings.map(w => `<div class="w err">⚠︎ ${esc(w)}</div>`).join('');
  if (!state.links.length) {
    $('#links').innerHTML = `<div class="row"><p class="empty">Aucune liaison. Commence par « Ordi au plateau → VP » ou « + Liaison ».</p></div>`;
    return;
  }
  $('#links').innerHTML = state.links.map((l, i) => {
    const r = res.links.find(x => x.id === l.id);
    const s = src(l.src), d = dst(l.dst);
    const showSrcApp = s && s.id !== 'ptz';
    const showDstApp = d && !d.fixe && !d.vp;
    const body = !r ? '' : `
      <div class="sum"><span class="cdot" style="background:${couleur(l.id)}"></span>${r.chips.map(c => `<span class="k">${esc(c)}</span>`).join('<span class="arr">→</span>')}</div>
      ${r.warnings.map(w => `<div class="w err">⚠︎ ${esc(w)}</div>`).join('')}
      ${r.ok ? `<ol class="steps">${r.steps.map(st => `<li class="${st.fixe ? 'fixe' : ''} ${st.option ? 'option' : ''}"><span class="lieu ${esc(st.lieu)}">${esc(st.lieu)}</span>${st.txt}</li>`).join('')}</ol>` : ''}
      ${r.infos.map(w => `<div class="info">${esc(w)}</div>`).join('')}`;
    return `<div class="row ${r && !r.ok ? 'bad' : ''}" data-id="${l.id}">
      <div class="main">
        <input class="nom" data-f="nom" value="${esc(l.nom)}" placeholder="Nom (ex. Ordi artiste)">
        <select data-f="src">${options(SOURCES, l.src)}</select>
        ${showSrcApp ? seg('srcApp', APP_SRC, l.srcApp || 'hdmi', 'Ce que tu branches') : ''}
        <span class="arr2">→</span>
        <select data-f="dst">${options(DESTS, l.dst, l.src)}</select>
        ${showDstApp ? seg('dstApp', APP_DST, l.dstApp || 'hdmi', 'Ce qui reçoit l\'image') : ''}
        <button class="icon" data-del title="Supprimer">✕</button>
      </div>${body}</div>`;
  }).join('');
}

$('#links').addEventListener('input', e => {
  const row = e.target.closest('.row'); const f = e.target.dataset.f; if (!row || !f) return;
  const l = state.links.find(x => x.id === row.dataset.id); l[f] = e.target.value;
  if (f === 'nom') { res = compute(state); save(); renderUsage(); renderHub(); renderRegie(); renderPlan(); renderFiche(); return; }
  render();
});
$('#links').addEventListener('click', e => {
  const row = e.target.closest('.row'); if (!row?.dataset.id) return;
  const l = state.links.find(x => x.id === row.dataset.id);
  if (e.target.closest('[data-del]')) { state.links = state.links.filter(x => x !== l); render(); return; }
  const b = e.target.closest('.seg button');
  if (b) { l[b.parentElement.dataset.seg] = b.dataset.v; render(); }
});

const PRESETS = {
  ordiVP: () => ({ nom: 'Ordi plateau', src: libreSrc(['BAV-20:VID-I19', 'BAV-23:VID-I25', 'BAV-21:VID-I21', 'BAV-22:VID-I23']), srcApp: 'hdmi', dst: libreDst(['BAV-05:VID-01', 'BAV-05:VID-02']) }),
  ptzSV: () => ({ nom: 'Caméra PTZ', src: 'ptz', dst: libreDst(['sv1', 'sv2']) }),
  ptzUSB: () => ({ nom: 'PTZ vers ordi', src: 'ptz', dst: libreDst(['BAV-03:VID-02', 'BAV-03:VID-03', 'BAV-02:VID-01']), dstApp: 'usb' }),
};
function libreSrc(ids) { return ids.find(id => !state.links.some(l => l.src === id)) || ids[0]; }
function libreDst(ids) { return ids.find(id => !state.links.some(l => l.dst === id)) || ids[0]; }
document.querySelectorAll('[data-preset]').forEach(b => b.onclick = () => { state.links.push({ id: uid(), ...PRESETS[b.dataset.preset]() }); render(); });
$('#addLink').onclick = () => { state.links.push({ id: uid(), nom: '', src: '', srcApp: 'hdmi', dst: '', dstApp: 'hdmi' }); render(); };

// ------------------------------------------------------------------ onglet Videohub
function renderHub() {
  const usedIn = new Set(res.videohub.map(v => v.in)), usedOut = new Set(res.videohub.map(v => v.out));
  const routes = res.videohub.length ? `<table class="t"><tr><th>Sortie</th><th>va vers</th><th></th><th>Entrée</th><th>vient de</th><th>Liaison</th></tr>
    ${res.videohub.map(v => `<tr><td class="big">${v.out}</td><td>${esc(PORTS_OUT[v.out]?.label)}</td><td>←</td><td class="big">${v.in}</td><td>${esc(PORTS_IN[v.in]?.label)}</td>
      <td><span class="cdot" style="background:${couleur(v.link)}"></span>${esc(v.nom)}</td></tr>`).join('')}</table>`
    : `<p class="empty">Aucun routage pour l'instant.</p>`;
  const ports = (dir, used) => {
    const P = dir === 'in' ? PORTS_IN : PORTS_OUT;
    let h = `<table class="t ports"><tr><th>${dir === 'in' ? 'Entrée' : 'Sortie'}</th><th>Câble</th><th>Branché à</th></tr>`;
    for (let p = 1; p <= 40; p++) { const x = P[p];
      h += `<tr class="${used.has(p) ? 'used' : ''} ${!x || x.kind === 'absent' ? 'absent' : ''}"><td>${p}</td><td>${x?.cable || ''}</td><td>${esc(x?.label || 'libre')}</td></tr>`; }
    return h + '</table>';
  };
  $('#tab-hub').innerHTML = `
    <h3>Routage à faire</h3>
    <p class="hint">${VIDEOHUB.nom}, ${VIDEOHUB.lieu}. Se pilote depuis l'appli Blackmagic Videohub Control sur le réseau (matrice en Ethernet, câble ${VIDEOHUB.reseau.cable}, sur le ${VIDEOHUB.reseau.vers}).</p>
    ${routes}
    <h3>Tous les ports</h3>
    <p class="hint">Les plaques des boîtiers portent le numéro de port : <b>VID-I19</b> = entrée 19, <b>VID-O15</b> = sortie 15. Grisé : prévu pour le mélangeur, qui n'est pas installé.</p>
    <div class="cols"><div>${ports('in', usedIn)}</div><div>${ports('out', usedOut)}</div></div>`;
}

// ------------------------------------------------------------------ onglet Patch régie
function renderRegie() {
  const W = 1040, x0 = 50, dx = 62, yA = 110, yB = 300;
  const X = i => x0 + (i - 1) * dx;
  const pos = n => n.startsWith('A') ? { x: X(+n.slice(1)), y: yA } : { x: X(+n.slice(1)), y: yB };
  let s = `<svg viewBox="0 0 ${W} 455" xmlns="http://www.w3.org/2000/svg" font-family="system-ui" font-size="11">`;
  s += `<text x="20" y="28" fill="#e6e8ec" font-size="14" font-weight="700">U28 · Patch BNC A</text><text x="200" y="28" fill="#9aa3b2">relié à la matrice du nodal</text>`;
  s += `<rect x="20" y="${yA - 22}" width="${W - 40}" height="44" rx="6" fill="#1f232b" stroke="#333a46"/>`;
  s += `<rect x="20" y="${yB - 22}" width="${W - 40}" height="44" rx="6" fill="#1f232b" stroke="#333a46"/>`;
  s += `<text x="20" y="${yB + 140}" fill="#e6e8ec" font-size="14" font-weight="700">U27 · Patch BNC B</text><text x="200" y="${yB + 140}" fill="#9aa3b2">lignes directes vers les boîtiers (sans matrice)</text>`;
  for (let i = 1; i <= 16; i++) {
    const lab = i <= 8 ? `IN ${i}` : `OUT ${i - 8}`;
    s += `<text x="${X(i)}" y="${yA - 34}" text-anchor="middle" fill="${i <= 8 ? '#82aaff' : '#f0a53a'}" font-weight="600">${lab}</text>`;
    s += `<text x="${X(i)}" y="${yA - 48}" text-anchor="middle" fill="#6b7280">${i <= 8 ? 2000 + i : 2032 + i}</text>`;
    s += `<circle cx="${X(i)}" cy="${yA}" r="11" fill="#0e1014" stroke="#9aa3b2"/><text x="${X(i)}" y="${yA + 4}" text-anchor="middle" fill="#9aa3b2" font-size="9">A${i}</text>`;
    const u = U27['B' + i];
    s += `<circle cx="${X(i)}" cy="${yB}" r="11" fill="#0e1014" stroke="#9aa3b2"/><text x="${X(i)}" y="${yB + 4}" text-anchor="middle" fill="#9aa3b2" font-size="9">B${i}</text>`;
    s += `<text x="${X(i)}" y="${yB + 36}" text-anchor="middle" fill="#e6e8ec" font-weight="600">${u.bav === 'BAV-05' ? 'VP' : u.bav.replace('BAV-', 'BAV ')}</text>`;
    s += `<text x="${X(i)}" y="${yB + 49}" text-anchor="middle" fill="#9aa3b2">${u.plaque}</text>`;
    s += `<text x="${X(i)}" y="${yB + 62}" text-anchor="middle" fill="#6b7280">${u.cable}</text>`;
  }
  s += `<text x="${X(1)}" y="${yA - 64}" fill="#82aaff">← entrées 1–8 de la matrice</text><text x="${X(9)}" y="${yA - 64}" fill="#f0a53a">sorties 1–8 de la matrice →</text>`;
  const grp = [['BAV-01', 'Fond de salle jardin'], ['BAV-02', 'Mur son'], ['BAV-03', 'Mur vidéo'], ['BAV-04', 'Fond de salle cour'], ['BAV-05', 'Vidéoprojecteur']];
  for (const [id, nom] of grp) {
    const bs = Object.values(U27).filter(u => u.bav === id).map(u => +u.u27.slice(1));
    const a = X(Math.min(...bs)) - 20, b = X(Math.max(...bs)) + 20;
    s += `<path d="M${a} ${yB + 74}v6h${b - a}v-6" fill="none" stroke="#4a5262"/><text x="${(a + b) / 2}" y="${yB + 96}" text-anchor="middle" fill="#9aa3b2" font-size="10.5">${nom}</text>`;
  }
  for (const c of res.cordons) {
    const p = pos(c.de), q = pos(c.vers), col = couleur(c.link);
    const d = p.y === q.y ? `M${p.x} ${p.y + 11} C${p.x} ${p.y + 90} ${q.x} ${q.y + 90} ${q.x} ${q.y + 11}`
      : `M${p.x} ${Math.max(p.y, q.y) === p.y ? p.y - 11 : p.y + 11} C${p.x} ${(p.y + q.y) / 2} ${q.x} ${(p.y + q.y) / 2} ${q.x} ${q.y > p.y ? q.y - 11 : q.y + 11}`;
    s += `<path d="${d}" fill="none" stroke="#000" stroke-width="7" opacity=".5"/><path d="${d}" fill="none" stroke="${col}" stroke-width="4"/>`;
    for (const z of [p, q]) s += `<circle cx="${z.x}" cy="${z.y}" r="7" fill="${col}"/>`;
  }
  s += '</svg>';
  const list = res.cordons.length ? `<table class="t"><tr><th></th><th>De</th><th>À</th><th>Pour</th></tr>${res.cordons.map(c =>
    `<tr><td><span class="cdot" style="background:${couleur(c.link)}"></span></td><td><b>${c.de.startsWith('A') ? 'U28 ' : 'U27 '}${c.de}</b></td><td><b>${c.vers.startsWith('A') ? 'U28 ' : 'U27 '}${c.vers}</b></td><td>${esc(c.nom)}</td></tr>`).join('')}</table>`
    : `<p class="empty">Aucun cordon à poser.</p>`;
  $('#tab-regie').innerHTML = `<p class="hint">Les deux bandeaux BNC de la baie régie. Pour qu'une image de la matrice aille vers le VP, le fond de salle ou les murs régie, il faut un cordon entre U28 (sorties A9–A16) et U27.</p>
    <div class="svgwrap">${s}</div><h3>Cordons à poser</h3>${list}`;
}

// ------------------------------------------------------------------ onglet Plan
const BOX = {};
function layoutPlan() {
  let y = 30;
  const zones = ['plateau', 'gradins', 'rdc', 'balcons'];
  const L = [];
  for (const z of zones) {
    L.push({ type: 'zone', z, x: 20, y, w: 300 }); y += 26;
    for (const b of BAV.filter(b => b.zone === z && (b.ins || b.outs))) { BOX[b.id] = { x: 34, y, w: 272, h: 24, id: b.id, sub: b.lieu, zone: z }; y += 30; }
    y += 12;
  }
  BOX.hub = { x: 470, y: 60, w: 150, h: 560, id: 'Videohub 40×40', sub: 'Nodal · baie vidéo', zone: 'nodal' };
  BOX.U28 = { x: 790, y: 70, w: 160, h: 34, id: 'U28 · patch A', sub: 'IN/OUT 1–8 matrice', zone: 'regie' };
  BOX.U27 = { x: 790, y: 170, w: 160, h: 34, id: 'U27 · patch B', sub: 'lignes directes', zone: 'regie' };
  BOX.sv = { x: 990, y: 70, w: 170, h: 34, id: 'SmartView Duo', sub: 'sorties 9 et 10', zone: 'regie' };
  BOX.ecran24 = { x: 990, y: 130, w: 170, h: 34, id: 'Écran 24"', sub: 'via BAV-03 VID-01', zone: 'regie' };
  BOX['BAV-02'] = { x: 990, y: 190, w: 170, h: 34, id: 'BAV-02', sub: 'Mur son', zone: 'regie' };
  BOX['BAV-03'] = { x: 990, y: 250, w: 170, h: 34, id: 'BAV-03', sub: 'Mur vidéo', zone: 'regie' };
  BOX.pupitre = { x: 790, y: 290, w: 160, h: 34, id: 'Pupitre AW-RP60', sub: 'table régie', zone: 'regie' };
  BOX['BAV-01'] = { x: 790, y: 470, w: 160, h: 34, id: 'BAV-01', sub: 'Fond de salle jardin', zone: 'salle' };
  BOX['BAV-04'] = { x: 790, y: 530, w: 160, h: 34, id: 'BAV-04', sub: 'Fond de salle cour', zone: 'salle' };
  BOX['BAV-05'] = { x: 990, y: 470, w: 170, h: 34, id: 'BAV-05 · VP', sub: 'Vidéoprojecteur', zone: 'salle' };
  BOX.ptz = { x: 990, y: 560, w: 170, h: 34, id: 'Caméra PTZ AW-UE80', sub: 'au-dessus de la régie son', zone: 'salle' };
  return L;
}
const ZL = layoutPlan();
const ctr = k => { const b = BOX[k]; return { x: b.x + b.w / 2, y: b.y + b.h / 2 }; };
const edge = (k, side) => { const b = BOX[k]; return { x: side === 'l' ? b.x : b.x + b.w, y: b.y + b.h / 2 }; };

function boxOf(pointId, isSrc) {
  const p = isSrc ? src(pointId) : dst(pointId);
  if (!p) return null;
  if (p.id === 'ptz') return 'ptz'; if (p.id === 'sv1' || p.id === 'sv2') return 'sv'; if (p.id === 'ecran24') return 'ecran24';
  return p.bav;
}

function renderPlan() {
  let s = `<svg viewBox="0 0 1180 720" xmlns="http://www.w3.org/2000/svg" font-family="system-ui" font-size="12">`;
  s += `<rect x="760" y="20" width="410" height="330" rx="8" fill="none" stroke="#5aa9ff" stroke-dasharray="6 5"/><text x="772" y="42" fill="#5aa9ff" font-weight="700">RÉGIE SPECTACLE</text>`;
  s += `<rect x="760" y="420" width="410" height="200" rx="8" fill="none" stroke="#ffcb6b" stroke-dasharray="6 5"/><text x="772" y="442" fill="#ffcb6b" font-weight="700">SALLE</text>`;
  s += `<rect x="440" y="20" width="210" height="620" rx="8" fill="none" stroke="#ffcb6b" stroke-opacity=".5" stroke-dasharray="6 5"/><text x="452" y="42" fill="#ffcb6b" font-weight="700">NODAL</text>`;
  for (const z of ZL) s += `<text x="${z.x}" y="${z.y + 16}" fill="${ZONES[z.z].couleur}" font-weight="700">${ZONES[z.z].nom.toUpperCase()}</text>`;
  // câblage fixe (gris)
  const fixe = [];
  for (const b of BAV) if (BOX[b.id] && (b.ins || b.outs)) fixe.push([edge(b.id, 'r'), edge('hub', 'l')]);
  fixe.push([edge('hub', 'r'), edge('U28', 'l')], [edge('hub', 'r'), edge('sv', 'l')], [ctr('U28'), ctr('U27')]);
  for (const k of ['BAV-01', 'BAV-04', 'BAV-05', 'BAV-02', 'BAV-03']) fixe.push([edge('U27', 'r'), edge(k, 'l')]);
  fixe.push([edge('ptz', 'l'), edge('hub', 'r')], [edge('BAV-03', 'l'), edge('pupitre', 'r')], [ctr('BAV-03'), ctr('ecran24')]);
  for (const [a, b] of fixe) s += `<path d="${curve([a, b])}" fill="none" stroke="#333a46" stroke-width="1.5"/>`;
  // liaisons actives
  res.links.forEach((r, i) => {
    const l = state.links.find(x => x.id === r.id); if (!r.ok || !l) return;
    const sb = boxOf(l.src, true), db = boxOf(l.dst, false), s0 = src(l.src), d0 = dst(l.dst);
    const pts = [ctr(sb)];
    const direct = res.cordons.some(c => c.link === l.id && c.de.startsWith('B') && c.vers.startsWith('B'));
    if (s0.type === 'tie') { pts.push(ctr('U27')); if (!direct) pts.push(ctr('U28')); }
    if (!direct) pts.push(ctr('hub'));
    if (d0.type === 'tie' && d0.id !== 'ecran24' && !direct) pts.push(ctr('U28'), ctr('U27'));
    if (d0.id === 'ecran24') { if (!direct) pts.push(ctr('U28')); pts.push(ctr('U27'), ctr('BAV-03')); }
    pts.push(ctr(db));
    const off = (i % 5 - 2) * 3;
    s += `<path d="${curve(pts.map(p => ({ x: p.x + off, y: p.y + off })))}" fill="none" stroke="${couleur(l.id)}" stroke-width="3.5" opacity=".9"/>`;
  });
  // boîtes
  const active = new Set(state.links.flatMap(l => [boxOf(l.src, true), boxOf(l.dst, false)]));
  for (const [k, b] of Object.entries(BOX)) {
    const on = active.has(k);
    s += `<g class="bx" data-box="${k}"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="5" fill="${on ? '#272c36' : '#1f232b'}" stroke="${on ? '#e6e8ec' : '#4a5262'}"/>`;
    if (k === 'hub') {
      s += `<text x="${b.x + b.w / 2}" y="${b.y + 26}" text-anchor="middle" fill="#e6e8ec" font-weight="700">Videohub 40×40</text><text x="${b.x + b.w / 2}" y="${b.y + 42}" text-anchor="middle" fill="#9aa3b2" font-size="11">Blackmagic 12G</text>`;
      res.videohub.forEach((v, j) => s += `<text x="${b.x + b.w / 2}" y="${b.y + 80 + j * 20}" text-anchor="middle" fill="${couleur(v.link)}" font-weight="700">IN ${v.in} → OUT ${v.out}</text>`);
      s += `<text x="${b.x + 8}" y="${b.y + b.h - 12}" fill="#6b7280" font-size="10.5">entrées ←</text><text x="${b.x + b.w - 8}" y="${b.y + b.h - 12}" text-anchor="end" fill="#6b7280" font-size="10.5">→ régie</text>`;
    } else {
      s += `<text x="${b.x + 8}" y="${b.y + (b.h > 30 ? 15 : 16)}" fill="#e6e8ec" font-weight="600">${esc(b.id)}</text>`;
      s += `<text x="${b.h > 30 ? b.x + 8 : b.x + b.w - 8}" y="${b.y + (b.h > 30 ? 28 : 16)}" ${b.h > 30 ? '' : 'text-anchor="end"'} fill="#9aa3b2" font-size="11">${esc(b.sub)}</text>`;
    }
    s += `</g>`;
  }
  s += '</svg>';
  $('#tab-plan').innerHTML = `<p class="hint">Schéma simplifié du synoptique vidéo. Les liaisons du jour sont en couleur. Clique sur un boîtier pour voir ses prises.</p>
    <div class="svgwrap" id="planSvg">${s}</div>
    <div class="legend">${state.links.map(l => `<span><span class="cdot" style="background:${couleur(l.id)}"></span>${esc(l.nom || 'sans nom')}</span>`).join('')}</div>`;
}
function curve(p) {
  if (p.length === 2) { const [a, b] = p, mx = (a.x + b.x) / 2; return `M${a.x} ${a.y} C${mx} ${a.y} ${mx} ${b.y} ${b.x} ${b.y}`; }
  let d = `M${p[0].x} ${p[0].y}`;
  for (let i = 1; i < p.length; i++) { const a = p[i - 1], b = p[i], mx = (a.x + b.x) / 2; d += ` C${mx} ${a.y} ${mx} ${b.y} ${b.x} ${b.y}`; }
  return d;
}
$('#tab-plan').addEventListener('click', e => {
  const g = e.target.closest('[data-box]'); if (!g) return;
  const k = g.dataset.box;
  if (bav(k)) return openBav(k);
  const go = { ptz: 'ptz', pupitre: 'ptz', hub: 'hub', U28: 'regie', U27: 'regie' }[k];
  if (go) tab(go);
});

function openBav(id) {
  const b = bav(id);
  const rows = [
    ...(b.ins || []).map(i => `<tr><td>${i.plaque}</td><td>Entrée ${i.port} de la matrice</td><td>${i.cable}</td></tr>`),
    ...(b.outs || []).map(o => `<tr><td>${o.plaque}</td><td>Sortie ${o.port} de la matrice</td><td>${o.cable}</td></tr>`),
    ...(b.vid || []).map(v => `<tr><td>${v.plaque}</td><td>Régie U27 ${v.u27}${v.occupe ? ' · ' + esc(v.occupe) : ''}</td><td>${v.cable}</td></tr>`),
    ...(b.synchro ? [`<tr><td>${b.synchro.plaque}</td><td>Synchro, patch nodal ${b.synchro.patch}</td><td>${b.synchro.cable}</td></tr>`] : []),
    ...(b.eth ? [`<tr><td>${b.eth.plaque}</td><td>${esc(b.eth.usage)}</td><td>${b.eth.cable}</td></tr>`] : []),
  ];
  $('#panelBody').innerHTML = `<h2>${b.id}</h2><div class="hint">${esc(b.lieu)} · ${b.modele}</div>
    <table class="t" style="margin-top:14px"><tr><th>Prise</th><th>Va à</th><th>Câble</th></tr>${rows.join('')}</table>
    ${b.img ? `<p class="hint">Tableau des circuits du boîtier (vidéo et autres) :</p><div class="thumbs"><img src="boitiers/${b.img}.png" alt="${b.id}" data-zoom style="height:auto;max-width:100%"></div>` : ''}`;
  $('#panel').hidden = false;
}
$('#panelClose').onclick = () => $('#panel').hidden = true;
$('#panelBody').addEventListener('click', e => { if (e.target.dataset.zoom !== undefined) { $('#imgEl').src = e.target.src; $('#img').showModal(); } });

// ------------------------------------------------------------------ onglet Caméra PTZ
function renderPTZ() {
  $('#tab-ptz').innerHTML = `
    <h2>Caméra ${PTZ.camera}</h2>
    <p>${PTZ.lieu}. Elle sort en 3G-SDI directement sur l'<b>entrée 29</b> de la matrice (câble ${PTZ.sdi.cable}) : son image est disponible partout où la matrice peut l'envoyer.</p>
    <div class="bar">
      <button data-preset2="ptzSV" class="primary">Voir la PTZ sur le SmartView</button>
      <button data-preset2="ptzVP">PTZ → VP</button>
      <button data-preset2="ptzUSB">PTZ → ordi en USB (Inogeni)</button>
    </div>
    <h2>La piloter avec le pupitre ${PTZ.pupitre}</h2>
    <div class="box"><ol>
      <li>Le pupitre est sur la table régie, branché en réseau (PoE) sur la prise <b>${PTZ.pupitreLan.prise}</b> (câble ${PTZ.pupitreLan.cable}) du mur vidéo.</li>
      <li>La caméra est alimentée et reliée au réseau par un <b>injecteur PoE++</b> dans la baie régie : switch régie (câble ${PTZ.lan.switch}) → injecteur → câble ${PTZ.lan.injecteur} → patch RJ45 <b>${PTZ.lan.u}</b> → câble ${PTZ.lan.cable} → caméra.</li>
      <li>Si la caméra ne répond pas : vérifie que l'injecteur PoE++ est allumé et que le cordon du patch RJ45 C24 est en place.</li>
      <li>Pupitre et caméra doivent être sur le même réseau IP. Le synoptique ne dit pas sur quel réseau arrive ETH-01 du BAV-03 : <b>à vérifier</b>.</li>
    </ol></div>
    <h2>Les autres prises de la caméra</h2>
    <ul>
      <li><b>GL IN</b> : synchro (genlock), câble ${PTZ.synchro.cable} depuis le patch synchro du nodal ${PTZ.synchro.patch}. Inutile sans mélangeur.</li>
      <li><b>HDMI OUT</b> : sortie HDMI locale, pas câblée.</li>
      <li><b>Audio IN</b> (jack 3,5) et <b>RS-422</b> : pas câblés.</li>
    </ul>`;
  document.querySelectorAll('[data-preset2]').forEach(b => b.onclick = () => {
    const p = b.dataset.preset2 === 'ptzVP' ? { nom: 'Caméra PTZ', src: 'ptz', dst: libreDst(['BAV-05:VID-01', 'BAV-05:VID-02']) } : PRESETS[b.dataset.preset2]();
    state.links.push({ id: uid(), ...p }); render(); tab('links');
  });
}

// ------------------------------------------------------------------ onglet Fiche
function renderFiche() {
  const parc = { ...PARC_DEFAUT, ...state.settings.parc };
  const mat = Object.entries(res.materiel);
  $('#fiche').innerHTML = `<div class="print-head">Patch vidéo · Auditorium · ${esc(state.artist || '')} ${esc(state.date || '')}</div>
    <h3>Liaisons</h3>
    ${res.links.length ? res.links.map(r => { const l = state.links.find(x => x.id === r.id);
      return `<p><b>${esc(l.nom || 'Sans nom')}</b> : ${esc(src(l.src)?.nom || '?')} → ${esc(dst(l.dst)?.nom || '?')}</p>
      ${r.ok ? `<ol>${r.steps.map(s => `<li>[${esc(s.lieu)}] ${s.txt}</li>`).join('')}</ol>` : `<p class="w err">${r.warnings.map(esc).join(' ')}</p>`}`; }).join('') : '<p class="empty">Aucune liaison.</p>'}
    <h3>Videohub</h3>
    ${res.videohub.length ? `<table><tr><th>Sortie</th><th></th><th>Entrée</th></tr>${res.videohub.map(v => `<tr><td>${v.out} · ${esc(PORTS_OUT[v.out]?.label)}</td><td>←</td><td>${v.in} · ${esc(PORTS_IN[v.in]?.label)}</td></tr>`).join('')}</table>` : '<p class="empty">Rien.</p>'}
    <h3>Cordons patch régie</h3>
    ${res.cordons.length ? `<table>${res.cordons.map(c => `<tr><td>${c.de.startsWith('A') ? 'U28' : 'U27'} ${c.de}</td><td>→</td><td>${c.vers.startsWith('A') ? 'U28' : 'U27'} ${c.vers}</td><td>${esc(c.nom)}</td></tr>`).join('')}</table>` : '<p class="empty">Aucun.</p>'}
    <h3>Matériel</h3>
    ${mat.length ? `<ul class="materiel">${mat.map(([k, n]) => `<li class="${n > parc[k] ? 'over' : ''}">${n} × ${PARC_NOMS[k]} (parc : ${parc[k]})</li>`).join('')}</ul>` : '<p class="empty">Pas de convertisseur.</p>'}`;
}
$('#print').onclick = () => window.print();

// ------------------------------------------------------------------ onglet Comprendre
function renderLearn() {
  $('#tab-learn').innerHTML = `
    <h2>Le principe</h2>
    <p>Toute la vidéo de l'auditorium est en <b>SDI</b> (câble coaxial BNC). Au centre, au nodal, une <b>matrice Blackmagic Videohub 40×40</b> : n'importe quelle entrée peut aller vers n'importe quelle sortie, et une entrée peut partir vers plusieurs sorties à la fois.</p>
    <div class="box"><b>Lire une plaque de boîtier</b> : <b>VID-I19</b> = entrée 19 de la matrice. <b>VID-O15</b> = sortie 15. Le numéro gravé est le numéro à choisir dans Videohub Control.</div>
    <h2>Deux sortes de prises</h2>
    <ul>
      <li><b>Prises reliées à la matrice</b> : plateau (BAV-20, 21, 22, 23, 26, 28), gradins (BAV-PMS-2, BAV-17), RDC (BAV-15, 16, 18), balcons (BAV-08, 09) et la caméra PTZ. Une prise est soit une entrée, soit une sortie.</li>
      <li><b>Lignes directes</b> vers le patch <b>U27</b> de la régie, <b>sans matrice</b> : fond de salle (BAV-01, BAV-04), <b>vidéoprojecteur (BAV-05)</b>, murs de la régie (BAV-02, BAV-03). Ce sont de simples câbles : ils marchent dans les deux sens.</li>
    </ul>
    <div class="box"><b>Le piège</b> : le VP n'est pas sur la matrice. Pour lui envoyer une image de la matrice, il faut en régie un cordon BNC entre une sortie de la matrice (U28 A9 à A16 = sorties 1 à 8) et la ligne du VP (U27 B15 ou B16).</div>
    <h2>Ordi HDMI au plateau → VP, pas à pas</h2>
    <ol>
      <li>Ordi en HDMI → <b>convertisseur HDMI → SDI</b> → BNC dans une prise d'entrée du plateau, par exemple BAV-20 VID-I19.</li>
      <li>Videohub : entrée 19 → sortie 1.</li>
      <li>Régie : cordon U28 A9 (sortie 1) → U27 B15 (VP VID-01).</li>
      <li>Au VP : BAV-05 VID-01 → <b>convertisseur SDI → HDMI</b> → entrée HDMI du VP (ou direct en SDI si le VP a une entrée SDI).</li>
      <li>Pour contrôler en régie, route aussi l'entrée 19 vers la sortie 9 ou 10 (SmartView Duo).</li>
    </ol>
    <div class="box"><b>Ordi</b> : règle la sortie en 1920×1080 (50 ou 60 Hz), le format le plus sûr pour des convertisseurs 3G. Les contenus protégés (HDCP : Netflix, certains lecteurs) donnent un écran noir à travers un convertisseur.</div>
    <h2>Le parc mobile</h2>
    <ul>
      <li>Convertisseur HDMI → SDI et convertisseur SDI → HDMI Blackmagic.</li>
      <li>Passerelle <b>Inogeni HDMI → USB</b> : fait entrer une image dans un ordi comme une webcam (visio, stream). Avec le convertisseur SDI → HDMI devant, n'importe quelle image de la matrice peut aller dans un ordi.</li>
      <li>NewTek <b>Spark Plus IO</b> (4 en HDMI, 4 en SDI) : transportent la vidéo en NDI sur le réseau. Autre façon d'amener un ordi au plateau, mais il faut un réseau prévu pour : à étudier plus tard.</li>
    </ul>
    <h2>Synchro (genlock)</h2>
    <p>Un patch BNC « synchro » au nodal envoie une référence vers certains boîtiers (BAV-08, 09, 16, 17, 18, 21, 22, PMS-2), la caméra PTZ et la matrice. Elle sert quand on mélange plusieurs caméras. <b>Sans mélangeur, tu n'en as pas besoin.</b> Le générateur de synchro n'est pas dessiné sur le synoptique.</p>
    <h2>À vérifier sur place</h2>
    <ul>
      <li>Le <b>mélangeur vidéo</b> n'existe pas : les sorties 23 à 26 et les entrées 30-31 de la matrice sont peut-être câblées dans le vide, ou pas câblées.</li>
      <li>L'entrée du vidéoprojecteur : HDMI ou SDI (Réglages).</li>
      <li>Le format accepté par les convertisseurs (3G = 1080p max).</li>
      <li>Sur quel réseau arrive le pupitre caméra (BAV-03 ETH-01).</li>
      <li>Synchro : ${SYNCHRO.length} départs au patch synchro du nodal, source non dessinée.</li>
    </ul>
    <p class="hint">Source : synoptique LGS2-INE-EXE-22-SCH-AUD-TN-8002, indice 0 (02/10/2025), et tableaux de circuits des boîtiers.</p>`;
}

// ------------------------------------------------------------------ en-tête, onglets, réglages
function tab(name) {
  document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === name));
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('on', t.id === 'tab-' + name));
}
$('#tabs').onclick = e => { const b = e.target.closest('button'); if (b) tab(b.dataset.tab); };
$('#artist').oninput = e => { state.artist = e.target.value; save(); renderFiche(); };
$('#date').oninput = e => { state.date = e.target.value; save(); renderFiche(); };
$('#bNew').onclick = () => { if (confirmNew()) { const st = state.settings; state = fresh(); state.settings = st; render(); } };
function confirmNew() { return !state.links.length || window.confirm('Effacer le patch en cours ?'); }
$('#bExport').onclick = () => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(state, null, 1)], { type: 'application/json' }));
  a.download = `patch-video-${(state.artist || 'auditorium').replace(/[^\w-]+/g, '_')}${state.date ? '-' + state.date : ''}.json`;
  a.click(); URL.revokeObjectURL(a.href);
};
$('#bImport').onchange = async e => {
  try { const s = JSON.parse(await e.target.files[0].text()); if (!Array.isArray(s.links)) throw 0; state = { ...fresh(), ...s }; render(); }
  catch { alert('Fichier non reconnu.'); }
  e.target.value = '';
};
$('#bSettings').onclick = () => {
  const st = state.settings, parc = { ...PARC_DEFAUT, ...st.parc };
  $('#vpEntree').value = st.vpEntree || 'hdmi'; $('#vpVerif').checked = !!st.vpEntreeVerifiee;
  $('#parcFields').innerHTML = Object.entries(PARC_NOMS).map(([k, n]) => `<label>${n}<input type="number" min="0" max="20" data-parc="${k}" value="${parc[k]}"></label>`).join('');
  $('#settings').showModal();
};
$('#settings').addEventListener('close', () => {
  const st = state.settings;
  st.vpEntree = $('#vpEntree').value; st.vpEntreeVerifiee = $('#vpVerif').checked;
  st.parc = { ...PARC_DEFAUT, ...st.parc };
  document.querySelectorAll('[data-parc]').forEach(i => st.parc[i.dataset.parc] = Math.max(0, +i.value || 0));
  render();
});

renderPTZ(); renderLearn(); render();
