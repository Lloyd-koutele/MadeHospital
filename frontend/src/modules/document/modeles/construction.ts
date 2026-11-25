import type { Bloc, BlocChamp, Section, Structure, TypeChamp } from '../types';
import { cleDepuisLibelle } from '../regles';

/** Opérations pures sur la structure d'un modèle (utilisées par l'éditeur du chef de service). */

export const structureVide = (): Structure => ({
  libre: false,
  sections: [
    {
      titre: 'Patient',
      blocs: [
        { type: 'AUTO', source: 'patient.nom', libelle: 'Patient' },
        { type: 'AUTO', source: 'patient.naissance', libelle: 'Né(e) le' },
      ],
    },
    { titre: 'Contenu', blocs: [] },
  ],
});

export const clesUtilisees = (s: Structure): Set<string> =>
  new Set(
    s.sections.flatMap((x) => x.blocs).flatMap((b) => (b.type === 'CHAMP' ? [b.cle] : b.type === 'TEXTE' && b.cle ? [b.cle] : [])),
  );

const remplacerSection = (s: Structure, i: number, section: Section): Structure => ({
  ...s,
  sections: s.sections.map((x, j) => (j === i ? section : x)),
});

const deplacer = <T,>(liste: T[], i: number, sens: -1 | 1): T[] => {
  const j = i + sens;
  if (j < 0 || j >= liste.length) return liste;
  const copie = [...liste];
  [copie[i], copie[j]] = [copie[j], copie[i]];
  return copie;
};

export const ajouterSection = (s: Structure): Structure => ({
  ...s,
  sections: [...s.sections, { titre: `Section ${s.sections.length + 1}`, blocs: [] }],
});

export const renommerSection = (s: Structure, i: number, titre: string) => remplacerSection(s, i, { ...s.sections[i], titre });

export const retirerSection = (s: Structure, i: number): Structure => ({ ...s, sections: s.sections.filter((_, j) => j !== i) });

export const deplacerSection = (s: Structure, i: number, sens: -1 | 1): Structure => ({ ...s, sections: deplacer(s.sections, i, sens) });

/** Zone de texte libre : grand texte sans titre, que le médecin rédige comme il veut (ex. corps d'une ordonnance). */
export const nouvelleZoneLibre = (s: Structure): BlocChamp => ({
  type: 'CHAMP',
  cle: cleDepuisLibelle('zone libre', clesUtilisees(s)),
  libelle: 'Zone de texte libre',
  champ: 'ZONE_LIBRE',
  obligatoire: false,
});

export const ajouterZoneLibre = (s: Structure, i: number): Structure =>
  remplacerSection(s, i, { ...s.sections[i], blocs: [...s.sections[i].blocs, nouvelleZoneLibre(s)] });

export const nouveauBloc = (s: Structure, type: Bloc['type']): Bloc => {
  if (type === 'TEXTE') return { type: 'TEXTE', texte: '', verrouille: true };
  if (type === 'AUTO') return { type: 'AUTO', source: 'patient.nom', libelle: 'Patient' };
  return {
    type: 'CHAMP',
    cle: cleDepuisLibelle('nouveau champ', clesUtilisees(s)),
    libelle: 'Nouveau champ',
    champ: 'TEXTE_COURT',
    obligatoire: false,
  };
};

export const ajouterBloc = (s: Structure, i: number, type: Bloc['type']): Structure =>
  remplacerSection(s, i, { ...s.sections[i], blocs: [...s.sections[i].blocs, nouveauBloc(s, type)] });

export const modifierBloc = (s: Structure, i: number, j: number, bloc: Bloc): Structure =>
  remplacerSection(s, i, { ...s.sections[i], blocs: s.sections[i].blocs.map((b, k) => (k === j ? bloc : b)) });

export const retirerBloc = (s: Structure, i: number, j: number): Structure =>
  remplacerSection(s, i, { ...s.sections[i], blocs: s.sections[i].blocs.filter((_, k) => k !== j) });

export const deplacerBloc = (s: Structure, i: number, j: number, sens: -1 | 1): Structure =>
  remplacerSection(s, i, { ...s.sections[i], blocs: deplacer(s.sections[i].blocs, j, sens) });

/** Un champ renommé garde sa clé (les documents existants y font référence) ; seul un champ neuf la reçoit. */
export const renommerChamp = (s: Structure, bloc: BlocChamp, libelle: string, nouveau: boolean): BlocChamp => {
  if (!nouveau) return { ...bloc, libelle };
  const cles = clesUtilisees(s);
  cles.delete(bloc.cle);
  return { ...bloc, libelle, cle: cleDepuisLibelle(libelle, cles) };
};

/** Change le type d'un champ en posant des valeurs de départ cohérentes. */
export const changerTypeChamp = (bloc: BlocChamp, champ: TypeChamp): BlocChamp => {
  const b: BlocChamp = { ...bloc, champ };
  if (champ === 'CHOIX' && !(b.options && b.options.length)) b.options = ['Choix 1', 'Choix 2'];
  if (champ === 'TABLEAU' && !(b.colonnes && b.colonnes.length)) {
    b.colonnes = [
      { cle: 'element', libelle: 'Élément' },
      { cle: 'valeur', libelle: 'Valeur' },
    ];
  }
  return b;
};

/** Colonnes d'un tableau saisies une par ligne ; les colonnes « resultat » et « normes » activent le signalement. */
export const colonnesDepuisTexte = (texte: string) => {
  const cles = new Set<string>();
  return texte
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 8)
    .map((libelle) => {
      const cle = cleDepuisLibelle(libelle, cles);
      cles.add(cle);
      return { cle, libelle };
    });
};

export const lignes = (texte: string) =>
  texte
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
