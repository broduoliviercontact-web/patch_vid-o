// L'installation vidéo de l'auditorium des Grandes Serres.
// Source : synoptique LGS2-INE-EXE-22-SCH-AUD-TN-8002 indice 0 (« Synoptique vidéo auditorium », 02/10/2025)
// et tableaux de circuits des boîtiers (repris de Salle 3D / patch-auditorium).
// Les plaques des boîtiers sont gravées avec le numéro de port de la matrice : VID-I19 = entrée 19 du Videohub,
// VID-O15 = sortie 15 du Videohub.

export const ZONES = {
  plateau: { nom: 'Plateau', couleur: '#f0a53a' },
  gradins: { nom: 'Gradins', couleur: '#c792ea' },
  rdc:     { nom: 'RDC', couleur: '#82aaff' },
  balcons: { nom: 'Balcons', couleur: '#4cc38a' },
  salle:   { nom: 'Fond de salle', couleur: '#ffcb6b' },
  regie:   { nom: 'Régie', couleur: '#5aa9ff' },
};

// ---------------------------------------------------------------------------------------------
// Boîtiers AV (BAV).
//   ins / outs : prises reliées à la MATRICE (directionnelles). plaque = gravure, port = n° Videohub, cable = n° de câble.
//   vid : lignes passives (« tie lines ») qui arrivent sur le patch BNC U27 de la régie, SANS passer par la matrice.
//         Un câble coaxial passif marche dans les deux sens.
//   synchro : prise de synchro (genlock) venant du patch BNC synchro du nodal.
// ---------------------------------------------------------------------------------------------
export const BAV = [
  // Plateau
  { id: 'BAV-20', audio: true, zone: 'plateau', lieu: 'Plateau face jardin', modele: 'ASG BM3-6M', img: 'BAV-20',
    ins:  [{ plaque: 'VID-I19', port: 19, cable: 2019 }, { plaque: 'VID-I20', port: 20, cable: 2020 }],
    outs: [{ plaque: 'VID-O15', port: 15, cable: 2055 }, { plaque: 'VID-O16', port: 16, cable: 2056 }] },
  { id: 'BAV-21', audio: true, zone: 'plateau', lieu: 'Plateau face jardin', modele: 'ASG BM3-4M', img: 'BAV-21',
    ins:  [{ plaque: 'VID-I21', port: 21, cable: 2021 }, { plaque: 'VID-I22', port: 22, cable: 2022 }],
    outs: [{ plaque: 'VID-O17', port: 17, cable: 2057 }], synchro: { plaque: 'SYNCH', cable: 9508, patch: 'A8' } },
  { id: 'BAV-22', audio: true, zone: 'plateau', lieu: 'Plateau face cour', modele: 'ASG BM3-4M', img: 'BAV-22',
    ins:  [{ plaque: 'VID-I23', port: 23, cable: 2023 }, { plaque: 'VID-I24', port: 24, cable: 2024 }],
    outs: [{ plaque: 'VID-O18', port: 18, cable: 2058 }], synchro: { plaque: 'SYNCH', cable: 9509, patch: 'A9' } },
  { id: 'BAV-23', audio: true, zone: 'plateau', lieu: 'Plateau face cour', modele: 'ASG BM3-6M', img: 'BAV-23',
    ins:  [{ plaque: 'VID-I25', port: 25, cable: 2025 }, { plaque: 'VID-I26', port: 26, cable: 2026 }],
    outs: [{ plaque: 'VID-O19', port: 19, cable: 2059 }, { plaque: 'VID-O20', port: 20, cable: 2060 }] },
  { id: 'BAV-26', audio: true, zone: 'plateau', lieu: 'Plateau lointain jardin', modele: 'ASG BM3-4M', img: 'BAV-26',
    ins:  [{ plaque: 'VID-I27', port: 27, cable: 2027 }],
    outs: [{ plaque: 'VID-O21', port: 21, cable: 2061 }] },
  { id: 'BAV-28', audio: true, zone: 'plateau', lieu: 'Plateau lointain cour', modele: 'ASG BM3-4M', img: 'BAV-28',
    ins:  [{ plaque: 'VID-I28', port: 28, cable: 2028 }],
    outs: [{ plaque: 'VID-O22', port: 22, cable: 2062 }] },
  // Gradins
  { id: 'BAV-PMS-2', zone: 'gradins', lieu: 'Gradins rang 8', modele: 'ASG BM3-4M',
    ins:  [{ plaque: 'SDI IN 1', port: 11, cable: 2011 }, { plaque: 'SDI IN 2', port: 12, cable: 2012 }, { plaque: 'SDI IN 3', port: 13, cable: 2013 }],
    outs: [{ plaque: 'SDI OUT 1', port: 11, cable: 2051 }, { plaque: 'SDI OUT 2', port: 12, cable: 2052 }],
    synchro: { plaque: 'SYNCHRO', cable: 9502, patch: 'A2' } },
  { id: 'BAV-17', zone: 'gradins', lieu: 'Gradins rang 2', modele: 'ASG BM2-3M',
    ins:  [{ plaque: 'SDI IN', port: 17, cable: 2017 }], outs: [], synchro: { plaque: 'SYNCHRO', cable: 9506, patch: 'A6' } },
  // RDC
  { id: 'BAV-15', audio: true, zone: 'rdc', lieu: 'Mur RDC', note: 'Repéré « salle de musique - mur » sur le synoptique', modele: 'ASG BM3-4M', img: 'BAV-15',
    ins:  [{ plaque: 'VID-I14', port: 14, cable: 2014 }, { plaque: 'VID-I15', port: 15, cable: 2015 }],
    outs: [{ plaque: 'VID-O13', port: 13, cable: 2053 }, { plaque: 'VID-O14', port: 14, cable: 2054 }] },
  { id: 'BAV-16', zone: 'rdc', lieu: 'R0 jardin', modele: 'ASG BM2-3M',
    ins:  [{ plaque: 'SDI IN', port: 16, cable: 2016 }], outs: [], synchro: { plaque: 'SYNCHRO', cable: 9505, patch: 'A5' } },
  { id: 'BAV-18', zone: 'rdc', lieu: 'R0 cour', modele: 'ASG BM2-3M',
    ins:  [{ plaque: 'SDI IN', port: 18, cable: 2018 }], outs: [], synchro: { plaque: 'SYNCHRO', cable: 9507, patch: 'A7' } },
  // Balcons
  { id: 'BAV-08', zone: 'balcons', lieu: 'Balcon jardin', modele: 'ASG BM2-3M',
    ins:  [{ plaque: 'SDI IN', port: 9, cable: 2009 }], outs: [], synchro: { plaque: 'SYNCHRO', cable: 9503, patch: 'A3' } },
  { id: 'BAV-09', zone: 'balcons', lieu: 'Balcon cour', modele: 'ASG BM2-3M',
    ins:  [{ plaque: 'SDI IN', port: 10, cable: 2010 }], outs: [], synchro: { plaque: 'SYNCHRO', cable: 9504, patch: 'A4' } },
  // Lignes directes vers la régie (patch U27), sans matrice
  { id: 'BAV-01', audio: true, zone: 'salle', lieu: 'Fond de salle jardin', modele: 'ASG BM3-4M', img: 'BAV-01',
    vid: [{ plaque: 'VID-01', cable: 2081, u27: 'B1' }, { plaque: 'VID-02', cable: 2082, u27: 'B2' }, { plaque: 'VID-03', cable: 2083, u27: 'B3' }] },
  { id: 'BAV-04', audio: true, zone: 'salle', lieu: 'Fond de salle cour', modele: 'ASG BM3-4M', img: 'BAV-04',
    vid: [{ plaque: 'VID-01', cable: 2092, u27: 'B12' }, { plaque: 'VID-02', cable: 2093, u27: 'B13' }, { plaque: 'VID-03', cable: 2094, u27: 'B14' }] },
  { id: 'BAV-05', zone: 'salle', lieu: 'Vidéoprojecteur', modele: 'ASG BM3-4M',
    vid: [{ plaque: 'VID-01', cable: 2095, u27: 'B15' }, { plaque: 'VID-02', cable: 2096, u27: 'B16' }] },
  { id: 'BAV-02', audio: true, zone: 'regie', lieu: 'Régie · mur son', modele: 'ASG BM3-5M', img: 'BAV-02',
    vid: [{ plaque: 'VID-01', cable: 2084, u27: 'B4' }, { plaque: 'VID-02', cable: 2085, u27: 'B5' }] },
  { id: 'BAV-03', audio: true, zone: 'regie', lieu: 'Régie · mur vidéo', modele: 'ASG BM3-6M', img: 'BAV-03',
    vid: [{ plaque: 'VID-01', cable: 2086, u27: 'B6', occupe: 'Convertisseur SDI→HDMI fixe de l\'écran 24" (table régie)' },
          { plaque: 'VID-02', cable: 2087, u27: 'B7' }, { plaque: 'VID-03', cable: 2088, u27: 'B8' },
          { plaque: 'VID-04', cable: 2089, u27: 'B9' }, { plaque: 'VID-05', cable: 2090, u27: 'B10' },
          { plaque: 'VID-06', cable: 2091, u27: 'B11' }],
    eth: { plaque: 'ETH-01', cable: 4223, usage: 'Pupitre caméra AW-RP60' } },
];

export const bav = id => BAV.find(b => b.id === id);

// ---------------------------------------------------------------------------------------------
// Matrice Blackmagic Videohub 40×40 12G (nodal, baie vidéo). Ce qui est câblé sur chaque port.
// ---------------------------------------------------------------------------------------------
export const VIDEOHUB = { nom: 'Blackmagic Videohub 40×40 12G', lieu: 'Nodal · baie vidéo', taille: 40,
  reseau: { cable: 4097, vers: 'Switch Cisco CBS350 de la baie son (nodal)' }, ref: { cable: 9510, patch: 'A10' } };

const portsIn = {}, portsOut = {};
for (let p = 1; p <= 8; p++) {
  portsIn[p]  = { label: `Régie U28 A${p}`, kind: 'regie', u28: `A${p}`, cable: 2000 + p };
  portsOut[p] = { label: `Régie U28 A${p + 8}`, kind: 'regie', u28: `A${p + 8}`, cable: 2040 + p };
}
for (const b of BAV) {
  for (const i of b.ins || []) portsIn[i.port] = { label: `${b.id} ${i.plaque}`, kind: 'bav', bav: b.id, cable: i.cable };
  for (const o of b.outs || []) portsOut[o.port] = { label: `${b.id} ${o.plaque}`, kind: 'bav', bav: b.id, cable: o.cable };
}
portsIn[29] = { label: 'Caméra PTZ AW-UE80', kind: 'ptz', cable: 2029 };
portsIn[30] = { label: 'Mélangeur OUT 1 (non installé)', kind: 'absent', cable: 2030 };
portsIn[31] = { label: 'Mélangeur OUT 2 (non installé)', kind: 'absent', cable: 2031 };
portsOut[9]  = { label: 'SmartView Duo · écran gauche', kind: 'smartview', cable: 2049 };
portsOut[10] = { label: 'SmartView Duo · écran droit', kind: 'smartview', cable: 2050 };
for (let p = 23; p <= 26; p++) portsOut[p] = { label: `Mélangeur IN ${p - 22} (non installé)`, kind: 'absent', cable: 2040 + p };
export const PORTS_IN = portsIn, PORTS_OUT = portsOut;
export const portLabel = (dir, p) => (dir === 'in' ? portsIn : portsOut)[p]?.label || 'libre';

// Patch BNC U28 (régie, baie) : A1–A8 = entrées 1–8 de la matrice, A9–A16 = sorties 1–8.
// Patch BNC U27 (régie, baie) : B1–B16 = lignes directes vers BAV-01, 02, 03, 04, 05.
export const U27 = Object.fromEntries(BAV.flatMap(b => (b.vid || []).map(v => [v.u27, { bav: b.id, ...v }])));

// ---------------------------------------------------------------------------------------------
// Synchro (genlock) : patch BNC du nodal, bandeau 1U, baie vidéo. Le générateur de synchro n'est pas dessiné.
// ---------------------------------------------------------------------------------------------
export const SYNCHRO = [
  { patch: 'A1', cable: 9501, vers: 'Caméra PTZ (GL IN)' },
  { patch: 'A2', cable: 9502, vers: 'BAV-PMS-2' }, { patch: 'A3', cable: 9503, vers: 'BAV-08' },
  { patch: 'A4', cable: 9504, vers: 'BAV-09' }, { patch: 'A5', cable: 9505, vers: 'BAV-16' },
  { patch: 'A6', cable: 9506, vers: 'BAV-17' }, { patch: 'A7', cable: 9507, vers: 'BAV-18' },
  { patch: 'A8', cable: 9508, vers: 'BAV-21' }, { patch: 'A9', cable: 9509, vers: 'BAV-22' },
  { patch: 'A10', cable: 9510, vers: 'Matrice (REF IN)' }, { patch: 'A11', cable: 9511, vers: 'Mélangeur (non installé)' },
];

// ---------------------------------------------------------------------------------------------
// Caméra PTZ et pupitre
// ---------------------------------------------------------------------------------------------
export const PTZ = {
  camera: 'Panasonic AW-UE80', lieu: 'Fond de salle, au-dessus de la régie son (support mural ASG SCAM250B)',
  sdi: { cable: 2029, port: 29 }, synchro: { cable: 9501, patch: 'A1' },
  lan: { cable: 4192, u: 'C24', injecteur: 4217, switch: 4194 },
  pupitre: 'Panasonic AW-RP60GJ', pupitreLieu: 'Table régie', pupitreLan: { cable: 4223, prise: 'BAV-03 ETH-01' },
  // Pupitre : LAN (PoE) câblé ; Alim 12V DC (XLR4), RS422-1 à 5 (RJ45) et TALLY/GPI (SubD15) non câblés sur le synoptique.
};

// ---------------------------------------------------------------------------------------------
// Destinations « appareil » et parc
// ---------------------------------------------------------------------------------------------
// Site audio (patch des prises AUD des boîtiers)
export const SITE_AUDIO = 'https://patch-auditorium.vercel.app';

export const PARC_DEFAUT = { hdmi2sdi: 1, sdi2hdmi: 1, inogeni: 1, sparkHdmi: 4, sparkSdi: 4 };
export const PARC_NOMS = {
  hdmi2sdi: 'Convertisseur HDMI → SDI Blackmagic', sdi2hdmi: 'Convertisseur SDI → HDMI Blackmagic',
  inogeni: 'Passerelle Inogeni HDMI → USB',
  sparkHdmi: 'NewTek Spark Plus IO 4K HDMI (NDI)', sparkSdi: 'NewTek Spark Plus IO 3G-SDI (NDI)',
};
