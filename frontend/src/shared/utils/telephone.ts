/**
 * Numéros de téléphone internationaux : pays (indicatif), format de saisie et longueur attendue.
 * Fonctions pures, partagées par les formulaires. Le Sénégal est le pays par défaut.
 */

export type Pays = {
  code: string; // ISO 3166-1 alpha-2
  nom: string;
  indicatif: string;
  drapeau: string;
  /** Découpage du numéro national, ex. [2, 3, 2, 2] → « 77 000 00 00 » */
  groupes: number[];
};

export const PAYS: Pays[] = [
  { code: 'SN', nom: 'Sénégal', indicatif: '+221', drapeau: '🇸🇳', groupes: [2, 3, 2, 2] },
  { code: 'ML', nom: 'Mali', indicatif: '+223', drapeau: '🇲🇱', groupes: [2, 2, 2, 2] },
  { code: 'MR', nom: 'Mauritanie', indicatif: '+222', drapeau: '🇲🇷', groupes: [2, 2, 2, 2] },
  { code: 'GM', nom: 'Gambie', indicatif: '+220', drapeau: '🇬🇲', groupes: [3, 4] },
  { code: 'GN', nom: 'Guinée', indicatif: '+224', drapeau: '🇬🇳', groupes: [3, 2, 2, 2] },
  { code: 'GW', nom: 'Guinée-Bissau', indicatif: '+245', drapeau: '🇬🇼', groupes: [3, 3, 3] },
  { code: 'CI', nom: "Côte d'Ivoire", indicatif: '+225', drapeau: '🇨🇮', groupes: [2, 2, 2, 2, 2] },
  { code: 'BF', nom: 'Burkina Faso', indicatif: '+226', drapeau: '🇧🇫', groupes: [2, 2, 2, 2] },
  { code: 'NE', nom: 'Niger', indicatif: '+227', drapeau: '🇳🇪', groupes: [2, 2, 2, 2] },
  { code: 'TG', nom: 'Togo', indicatif: '+228', drapeau: '🇹🇬', groupes: [2, 2, 2, 2] },
  { code: 'BJ', nom: 'Bénin', indicatif: '+229', drapeau: '🇧🇯', groupes: [2, 2, 2, 2, 2] },
  { code: 'CM', nom: 'Cameroun', indicatif: '+237', drapeau: '🇨🇲', groupes: [1, 2, 2, 2, 2] },
  { code: 'CV', nom: 'Cap-Vert', indicatif: '+238', drapeau: '🇨🇻', groupes: [3, 2, 2] },
  { code: 'MA', nom: 'Maroc', indicatif: '+212', drapeau: '🇲🇦', groupes: [1, 2, 2, 2, 2] },
  { code: 'FR', nom: 'France', indicatif: '+33', drapeau: '🇫🇷', groupes: [1, 2, 2, 2, 2] },
  { code: 'BE', nom: 'Belgique', indicatif: '+32', drapeau: '🇧🇪', groupes: [3, 2, 2, 2] },
  { code: 'ES', nom: 'Espagne', indicatif: '+34', drapeau: '🇪🇸', groupes: [3, 3, 3] },
  { code: 'IT', nom: 'Italie', indicatif: '+39', drapeau: '🇮🇹', groupes: [3, 3, 4] },
  { code: 'US', nom: 'États-Unis / Canada', indicatif: '+1', drapeau: '🇺🇸', groupes: [3, 3, 4] },
];

export const PAYS_PAR_DEFAUT = 'SN';

export const paysDe = (code?: string | null): Pays => PAYS.find((p) => p.code === code) ?? PAYS[0];

const longueur = (pays: Pays) => pays.groupes.reduce((total, g) => total + g, 0);

/** Garde les chiffres attendus pour le pays et les groupe, ex. « 77 000 00 00 » pour le Sénégal. */
export const formaterTelephone = (saisie: string, codePays: string = PAYS_PAR_DEFAUT): string => {
  const pays = paysDe(codePays);
  const chiffres = saisie.replace(/\D/g, '').slice(0, longueur(pays));
  const morceaux: string[] = [];
  let position = 0;
  for (const taille of pays.groupes) {
    if (position >= chiffres.length) break;
    morceaux.push(chiffres.slice(position, position + taille));
    position += taille;
  }
  return morceaux.join(' ');
};

/** Numéro complet envoyé au serveur, ex. « +221 77 000 00 00 ». */
export const telephoneComplet = (local: string, codePays: string = PAYS_PAR_DEFAUT) =>
  `${paysDe(codePays).indicatif} ${formaterTelephone(local, codePays)}`;

export const telephoneValide = (local: string, codePays: string = PAYS_PAR_DEFAUT) =>
  local.replace(/\D/g, '').length === longueur(paysDe(codePays));

/** Exemple de saisie pour le pays (texte indicatif du champ). */
export const exempleTelephone = (codePays: string = PAYS_PAR_DEFAUT) =>
  paysDe(codePays).groupes.map((g) => '0'.repeat(g)).join(' ');

/**
 * Décompose un numéro enregistré en pays + partie locale. Le pays est reconnu par son indicatif
 * (le plus long qui correspond) ; un numéro sans indicatif est considéré comme sénégalais.
 */
export const analyserTelephone = (numero?: string | null): { pays: string; local: string } => {
  if (!numero) return { pays: PAYS_PAR_DEFAUT, local: '' };
  const brut = numero.trim();
  if (brut.startsWith('+')) {
    const compact = '+' + brut.slice(1).replace(/\D/g, '');
    const trouve = [...PAYS]
      .sort((a, b) => b.indicatif.length - a.indicatif.length)
      .find((p) => compact.startsWith(p.indicatif));
    if (trouve) {
      return { pays: trouve.code, local: formaterTelephone(compact.slice(trouve.indicatif.length), trouve.code) };
    }
  }
  return { pays: PAYS_PAR_DEFAUT, local: formaterTelephone(brut, PAYS_PAR_DEFAUT) };
};
