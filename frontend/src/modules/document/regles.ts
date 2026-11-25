import type { IconType } from 'react-icons';
import {
  LuBedDouble,
  LuClipboardList,
  LuFileCheck,
  LuFilePen,
  LuFileText,
  LuFlaskConical,
  LuPill,
  LuScan,
  LuScissors,
  LuStethoscope,
} from 'react-icons/lu';
import type { Bloc, BlocAuto, BlocChamp, StatutDocument, Structure, TypeChamp, Valeurs } from './types';

/** Règles d'affichage et de saisie des documents (sans composant). */

export const LIBELLES_TYPES: Record<string, string> = {
  COMPTE_RENDU_CONSULTATION: 'Compte rendu de consultation',
  ORDONNANCE: 'Ordonnance',
  DEMANDE_EXAMEN: "Demande d'examen",
  RESULTAT_EXAMEN: "Résultats d'examen",
  COMPTE_RENDU_IMAGERIE: "Compte rendu d'imagerie",
  COMPTE_RENDU_HOSPITALISATION: "Compte rendu d'hospitalisation",
  COMPTE_RENDU_OPERATOIRE: 'Compte rendu opératoire',
  CERTIFICAT: 'Certificat médical',
  DOCUMENT_LIBRE: 'Document libre',
  AUTRE: 'Autre document',
};

const ICONES: Record<string, IconType> = {
  COMPTE_RENDU_CONSULTATION: LuStethoscope,
  ORDONNANCE: LuPill,
  DEMANDE_EXAMEN: LuClipboardList,
  RESULTAT_EXAMEN: LuFlaskConical,
  COMPTE_RENDU_IMAGERIE: LuScan,
  COMPTE_RENDU_HOSPITALISATION: LuBedDouble,
  COMPTE_RENDU_OPERATOIRE: LuScissors,
  CERTIFICAT: LuFileCheck,
  DOCUMENT_LIBRE: LuFilePen,
};

export const iconeType = (type: string): IconType => ICONES[type] ?? LuFileText;

export const LIBELLES_STATUTS: Record<StatutDocument, string> = {
  BROUILLON: 'Brouillon',
  VALIDE: 'Validé',
  RECTIFIE: 'Rectifié',
  IMPORTE: 'Ancien dossier',
};

export const LIBELLES_CHAMPS: Record<TypeChamp, string> = {
  TEXTE_COURT: 'Texte court',
  TEXTE_LONG: 'Texte long',
  NOMBRE: 'Nombre',
  DATE: 'Date',
  HEURE: 'Heure',
  CHOIX: 'Liste de choix',
  CASE: 'Case à cocher',
  EQUIPE: "Membres de l'équipe",
  TABLEAU: 'Tableau',
  DOCUMENT_LIE: 'Document lié',
  IMAGES: 'Images (DICOM)',
  ZONE_LIBRE: 'Zone de texte libre (sans titre)',
};

export const SOURCES_AUTO: Record<string, string> = {
  'patient.nom': 'Nom du patient',
  'patient.naissance': 'Date de naissance',
  'patient.sexe': 'Sexe',
  'patient.dossier': 'N° de dossier',
  'medecin.nom': 'Médecin (auteur)',
  'medecin.specialite': 'Spécialité du médecin',
  'service.nom': 'Service',
  date: 'Date du document',
  'sejour.numero': 'N° de séjour',
  'sejour.entree': "Date d'entrée",
  'sejour.sortie': 'Date de sortie',
  'sejour.lit': 'Lit',
  'sejour.motif': "Motif d'admission",
};

export const dateCourte = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('fr-FR') : '');
export const dateHeure = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '';
export const dateIso = (iso: string) => {
  const [a, m, j] = iso.split('-');
  return j && m && a ? `${j}/${m}/${a}` : iso;
};

/** Valeurs hors norme (même règle que le serveur). */
export type Ecart = 'BAS' | 'HAUT' | null;

const nombre = (texte: string): number | null => {
  const m = texte.replace(',', '.').replace(/\s/g, '').match(/-?\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : null;
};

export const ecartNorme = (resultat?: string, normes?: string): Ecart => {
  const v = resultat ? nombre(resultat) : null;
  if (v === null || !normes) return null;
  const n = normes.replace(/,/g, '.');
  const borne = n.match(/^\s*(<=|>=|≤|≥|<|>)\s*(-?\d+(?:\.\d+)?)/);
  if (borne) {
    const limite = Number(borne[2]);
    switch (borne[1]) {
      case '<':
        return v >= limite ? 'HAUT' : null;
      case '<=':
      case '≤':
        return v > limite ? 'HAUT' : null;
      case '>':
        return v <= limite ? 'BAS' : null;
      default:
        return v < limite ? 'BAS' : null;
    }
  }
  const intervalle = n.match(/(-?\d+(?:\.\d+)?)\s*(?:-|–|à|a)\s*(-?\d+(?:\.\d+)?)/);
  if (intervalle) {
    if (v < Number(intervalle[1])) return 'BAS';
    if (v > Number(intervalle[2])) return 'HAUT';
  }
  return null;
};

export const estChamp = (b: Bloc): b is BlocChamp => b.type === 'CHAMP';

/** Valeur vide (pour les champs obligatoires et l'aperçu). */
export const estVide = (v: unknown) =>
  v === undefined || v === null || (typeof v === 'string' && v.trim() === '') || (Array.isArray(v) && v.length === 0);

/** Libellés des champs obligatoires encore vides. */
export const champsManquants = (structure: Structure, valeurs: Valeurs): string[] =>
  structure.sections
    .flatMap((s) => s.blocs)
    .filter((b): b is BlocChamp => estChamp(b) && b.obligatoire && estVide(valeurs[b.cle]))
    .map((b) => b.libelle);

/** Une section qui ne contient que des champs automatiques s'affiche comme un bloc d'identité. */
export const sectionIdentite = (blocs: Bloc[]) => blocs.length > 0 && blocs.every((b) => b.type === 'AUTO');

/** Une section qui commence par des données automatiques (ex. « Patient ») s'affiche sans titre, comme l'identité. */
export const commenceParIdentite = (blocs: Bloc[]) => blocs.length > 0 && blocs[0].type === 'AUTO';

export type GroupeBlocs = { auto: BlocAuto[]; debut: number } | { bloc: Bloc; index: number };

/** Regroupe les données automatiques consécutives (affichées deux par ligne) ; les autres blocs restent seuls. */
export const grouperBlocs = (blocs: Bloc[]): GroupeBlocs[] => {
  const groupes: GroupeBlocs[] = [];
  blocs.forEach((bloc, index) => {
    const dernier = groupes[groupes.length - 1];
    if (bloc.type === 'AUTO') {
      if (dernier && 'auto' in dernier) dernier.auto.push(bloc);
      else groupes.push({ auto: [bloc], debut: index });
    } else {
      groupes.push({ bloc, index });
    }
  });
  return groupes;
};

/** Clé de champ à partir d'un libellé (minuscules, sans accent). */
export const cleDepuisLibelle = (libelle: string, existantes: Set<string>): string => {
  const base =
    libelle
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .replace(/^(\d)/, 'c_$1')
      .slice(0, 34) || 'champ';
  let cle = base;
  let n = 2;
  while (existantes.has(cle)) cle = `${base}_${n++}`;
  return cle;
};
