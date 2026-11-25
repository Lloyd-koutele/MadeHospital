/**
 * Règles du formulaire utilisateur : fonctions pures, sans état ni style.
 * Elles sont utilisées par le hook useFormulaireUtilisateur et testables isolément.
 */

export type RoleCompte = 'ADMIN' | 'MEDECIN' | 'CHERCHEUR';

/** Description des rôles proposés à la création (affichage des cartes de choix). */
export const ROLES_COMPTE: { role: RoleCompte; titre: string; description: string }[] = [
  { role: 'ADMIN', titre: 'Administrateur', description: 'Gestion des comptes, des rôles et des services.' },
  { role: 'MEDECIN', titre: 'Médecin', description: 'Dossiers patients, consultations et prescriptions dans ses services.' },
  { role: 'CHERCHEUR', titre: 'Chercheur', description: 'Consultation des données cliniques pour la recherche.' },
];

/** Suggestions pour le champ propre à chaque rôle (saisie libre possible). */
export const SUGGESTIONS: Record<RoleCompte, string[]> = {
  ADMIN: ['Administration centrale', "Direction des systèmes d'information", 'Ressources humaines médicales'],
  MEDECIN: ['Médecine générale', 'Cardiologie', 'Pédiatrie', 'Radiologie', 'Odontologie', 'Neurologie', 'Oncologie'],
  CHERCHEUR: ['Épidémiologie et santé publique', 'Maladies infectieuses et tropicales', 'Génétique', 'Essais cliniques'],
};

// ---------- Téléphone (Sénégal, +221) : règles partagées ----------

export { analyserTelephone, formaterTelephone, telephoneComplet, telephoneValide } from '@/shared/utils/telephone';

// ---------- Mot de passe ----------

/** Seule exigence : 6 caractères minimum (même règle que le serveur). */
export const LONGUEUR_MIN_MOT_DE_PASSE = 6;

export type Robustesse = { score: 0 | 1 | 2 | 3 | 4; libelle: string; niveau: 'vide' | 'faible' | 'moyen' | 'bon' | 'fort' };

/**
 * Indication de robustesse, purement informative : tout mot de passe de 6 caractères ou plus est accepté.
 * Bonus : 10 caractères ou plus, mélange majuscule / chiffre / symbole.
 */
export const evaluerMotDePasse = (motDePasse: string): Robustesse => {
  if (!motDePasse) return { score: 0, libelle: 'Saisissez un mot de passe', niveau: 'vide' };
  if (motDePasse.length < LONGUEUR_MIN_MOT_DE_PASSE) return { score: 1, libelle: 'Trop court', niveau: 'faible' };
  let bonus = 0;
  if (motDePasse.length >= 10) bonus++;
  if ((/[A-Z]/.test(motDePasse) && /[0-9]/.test(motDePasse)) || /[^A-Za-z0-9]/.test(motDePasse)) bonus++;
  if (bonus === 0) return { score: 2, libelle: 'Valide', niveau: 'moyen' };
  if (bonus === 1) return { score: 3, libelle: 'Bon', niveau: 'bon' };
  return { score: 4, libelle: 'Très sécurisé', niveau: 'fort' };
};
