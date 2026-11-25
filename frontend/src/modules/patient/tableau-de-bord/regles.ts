/** Règles d'affichage du tableau de bord patient (sans dépendance à React). */

export type NiveauImc = 'normal' | 'attention' | 'alerte';

export type Imc = { valeur: string; libelle: string; niveau: NiveauImc };

const nombre = (v: unknown): number | null => {
  const n = parseFloat(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
};

/** Indice de masse corporelle à partir du poids (kg) et de la taille (cm) ; null si l'un manque. */
export const calculerImc = (poids: unknown, taille: unknown): Imc | null => {
  const p = nombre(poids);
  const t = nombre(taille);
  if (p === null || t === null) return null;
  const imc = p / (t / 100) ** 2;
  const valeur = `${imc.toFixed(1).replace('.', ',')} kg/m²`;
  if (imc < 18.5) return { valeur, libelle: 'Insuffisance pondérale', niveau: 'attention' };
  if (imc < 25) return { valeur, libelle: 'Corpulence normale', niveau: 'normal' };
  if (imc < 30) return { valeur, libelle: 'Surpoids', niveau: 'attention' };
  return { valeur, libelle: 'Obésité', niveau: 'alerte' };
};

export const libelleSexe = (sexe?: string | null): string => {
  if (sexe === 'M') return 'Masculin';
  if (sexe === 'F') return 'Féminin';
  return sexe || 'Non renseigné';
};

/** Même numéro de dossier que sur les documents médicaux (P-000001). */
export const numeroDossier = (patientId?: number | null): string | null =>
  patientId ? `P-${String(patientId).padStart(6, '0')}` : null;

export const initiales = (nom: string): string =>
  nom
    .replace(/^Dr\.?\s*/i, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((m) => m[0].toUpperCase())
    .join('') || 'DR';

const JOUR = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
const HEURE = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });

export const dateCourte = (iso?: string | null): string => (iso ? JOUR.format(new Date(iso)) : '');
export const heure = (iso?: string | null): string => (iso ? HEURE.format(new Date(iso)) : '');

const STATUTS_ACTIFS = ['PLANIFIE', 'CONFIRME', 'REPORTE'];

export const LIBELLES_RDV: Record<string, string> = {
  PLANIFIE: 'Planifié',
  CONFIRME: 'Confirmé',
  REPORTE: 'Reporté',
};

/** Rendez-vous à venir, du plus proche au plus lointain. */
export const rendezVousAVenir = <T extends { dateHeure: string; statut: string }>(liste: T[], maintenant = new Date()): T[] =>
  liste
    .filter((r) => STATUTS_ACTIFS.includes(r.statut) && new Date(r.dateHeure) >= maintenant)
    .sort((a, b) => new Date(a.dateHeure).getTime() - new Date(b.dateHeure).getTime());

/** Une autorisation est active tant qu'elle n'a pas expiré. */
export const accesActif = (a: { dateExpiration?: string | null }, maintenant = new Date()): boolean =>
  !a.dateExpiration || new Date(a.dateExpiration) > maintenant;
