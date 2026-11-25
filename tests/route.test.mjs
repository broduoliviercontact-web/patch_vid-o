import test from 'node:test';
import assert from 'node:assert/strict';
import { compute, SOURCES, DESTS } from '../js/route.js';
import { PORTS_IN, PORTS_OUT, U27 } from '../js/data.js';

const run = (links, settings = {}) => compute({ links: links.map((l, i) => ({ id: 'l' + i, ...l })), settings });

test('ordi HDMI sur BAV-20 → VP : entrée 19, sortie 1, U28 A9 → U27 B15, deux convertisseurs', () => {
  const r = run([{ nom: 'Ordi', src: 'BAV-20:VID-I19', srcApp: 'hdmi', dst: 'BAV-05:VID-01' }]);
  const l = r.links[0];
  assert.equal(l.ok, true);
  assert.deepEqual(r.videohub, [{ out: 1, in: 19, nom: 'Ordi', link: 'l0' }]);
  assert.deepEqual(r.cordons.map(c => [c.de, c.vers]), [['A9', 'B15']]);
  assert.deepEqual(r.materiel, { hdmi2sdi: 1, sdi2hdmi: 1 });
  assert.equal(r.warnings.length, 0);
});

test('VP en SDI : pas de convertisseur SDI → HDMI', () => {
  const r = run([{ src: 'BAV-21:VID-I21', srcApp: 'sdi', dst: 'BAV-05:VID-02' }], { vpEntree: 'sdi' });
  assert.deepEqual(r.materiel, {});
  assert.deepEqual(r.cordons.map(c => [c.de, c.vers]), [['A9', 'B16']]);
});

test('PTZ → SmartView : routage seul, rien en régie', () => {
  const r = run([{ src: 'ptz', dst: 'sv1' }]);
  assert.deepEqual(r.videohub.map(v => [v.in, v.out]), [[29, 9]]);
  assert.equal(r.cordons.length, 0);
});

test('ligne directe → ligne directe : cordon U27 sans matrice', () => {
  const r = run([{ src: 'BAV-03:VID-02', srcApp: 'hdmi', dst: 'BAV-05:VID-01' }]);
  assert.deepEqual(r.cordons.map(c => [c.de, c.vers]), [['B7', 'B15']]);
  assert.equal(r.videohub.length, 0);
});

test('une source vers deux destinations : passe par la matrice, une seule entrée U28', () => {
  const r = run([
    { src: 'BAV-01:VID-01', srcApp: 'sdi', dst: 'BAV-05:VID-01' },
    { src: 'BAV-01:VID-01', srcApp: 'sdi', dst: 'sv1' },
  ]);
  assert.deepEqual(r.videohub.map(v => [v.in, v.out]), [[1, 1], [1, 9]]);
  assert.deepEqual(r.cordons.map(c => [c.de, c.vers]), [['B1', 'A1'], ['A9', 'B15']]);
});

test('une prise ne reçoit qu\'une image ; parc dépassé signalé', () => {
  const r = run([
    { src: 'BAV-20:VID-I19', srcApp: 'hdmi', dst: 'BAV-05:VID-01' },
    { src: 'BAV-23:VID-I25', srcApp: 'hdmi', dst: 'BAV-05:VID-01' },
    { src: 'BAV-23:VID-I26', srcApp: 'hdmi', dst: 'sv2' },
  ]);
  assert.equal(r.links[1].ok, false);
  assert.ok(r.warnings.some(w => /HDMI → SDI/.test(w)));
});

test('ordi en USB : SDI → HDMI + Inogeni', () => {
  const r = run([{ src: 'ptz', dst: 'BAV-03:VID-03', dstApp: 'usb' }]);
  assert.deepEqual(r.materiel, { sdi2hdmi: 1, inogeni: 1 });
  assert.deepEqual(r.cordons.map(c => [c.de, c.vers]), [['A9', 'B8']]);
});

test('données : plaques = ports matrice, U27 complet B1–B16', () => {
  assert.equal(PORTS_IN[19].label, 'BAV-20 VID-I19');
  assert.equal(PORTS_OUT[22].label, 'BAV-28 VID-O22');
  assert.equal(Object.keys(U27).length, 16);
  for (let i = 1; i <= 16; i++) assert.ok(U27['B' + i], 'B' + i);
  for (const s of SOURCES) if (s.plaque?.startsWith('VID-I')) assert.equal(+s.plaque.slice(5), s.port);
  for (const d of DESTS) if (d.plaque?.startsWith('VID-O')) assert.equal(+d.plaque.slice(5), d.port);
});
