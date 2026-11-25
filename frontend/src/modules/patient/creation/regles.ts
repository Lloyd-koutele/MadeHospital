/**
 * Règles du formulaire de création d'un patient : fonctions pures, sans état ni style.
 */

export const GROUPES_SANGUINS = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'] as const;

/** Valeurs du sexe telles qu'enregistrées dans le dossier médical. */
export const SEXES = [
  { valeur: 'F', libelle: 'Femme' },
  { valeur: 'M', libelle: 'Homme' },
] as const;

export type Sexe = (typeof SEXES)[number]['valeur'];

export const LONGUEUR_MIN_MOT_DE_PASSE = 6;

/** Âge en années à partir d'une date « AAAA-MM-JJ », ou null si la date est vide ou invalide. */
export const ageDepuis = (date: string): number | null => {
  if (!date) return null;
  const naissance = new Date(date);
  if (Number.isNaN(naissance.getTime())) return null;
  const aujourdHui = new Date();
  let age = aujourdHui.getFullYear() - naissance.getFullYear();
  const mois = aujourdHui.getMonth() - naissance.getMonth();
  if (mois < 0 || (mois === 0 && aujourdHui.getDate() < naissance.getDate())) age--;
  return age >= 0 && age <= 125 ? age : null;
};

export const dateDansLePasse = (date: string) => {
  const d = new Date(date);
  return !Number.isNaN(d.getTime()) && d.getTime() < Date.now();
};

export type Imc = { valeur: number; categorie: 'insuffisance' | 'normal' | 'surpoids' | 'obesite'; libelle: string };

/** Indice de masse corporelle (kg / m²), arrondi au dixième, ou null si les mesures sont incomplètes ou aberrantes. */
export const calculerImc = (tailleCm: string, poidsKg: string): Imc | null => {
  const taille = parseFloat(tailleCm);
  const poids = parseFloat(poidsKg);
  if (!taille || !poids || taille <= 0 || poids <= 0) return null;
  const valeur = Math.round((poids / (taille / 100) ** 2) * 10) / 10;
  if (valeur <= 10 || valeur >= 80) return null;
  if (valeur < 18.5) return { valeur, categorie: 'insuffisance', libelle: 'Insuffisance pondérale' };
  if (valeur < 25) return { valeur, categorie: 'normal', libelle: 'Normal' };
  if (valeur < 30) return { valeur, categorie: 'surpoids', libelle: 'Surpoids' };
  return { valeur, categorie: 'obesite', libelle: 'Obésité' };
};
