/** Structure d'un modèle / d'un document (identique à celle du serveur). */

export type TypeChamp =
  | 'TEXTE_COURT'
  | 'TEXTE_LONG'
  | 'NOMBRE'
  | 'DATE'
  | 'HEURE'
  | 'CHOIX'
  | 'CASE'
  | 'EQUIPE'
  | 'TABLEAU'
  | 'DOCUMENT_LIE'
  | 'IMAGES'
  | 'ZONE_LIBRE';

export type Colonne = { cle: string; libelle: string };

export type BlocTexte = { type: 'TEXTE'; texte: string; verrouille: boolean; cle?: string };
export type BlocAuto = { type: 'AUTO'; source: string; libelle: string };
export type BlocChamp = {
  type: 'CHAMP';
  cle: string;
  libelle: string;
  champ: TypeChamp;
  obligatoire: boolean;
  aide?: string;
  unite?: string;
  defaut?: string;
  phrases?: string[];
  options?: string[];
  colonnes?: Colonne[];
  typeLie?: string;
};
export type Bloc = BlocTexte | BlocAuto | BlocChamp;

export type Section = { titre: string; blocs: Bloc[] };
export type Structure = { libre: boolean; sections: Section[] };

export type Valeurs = Record<string, any>;

export type StatutDocument = 'BROUILLON' | 'VALIDE' | 'RECTIFIE' | 'IMPORTE';

export type DocumentResume = {
  id: string;
  numero: string | null;
  type: string;
  typeLibelle: string;
  titre: string;
  serviceNom: string | null;
  auteurNom: string | null;
  statut: StatutDocument;
  dateCreation: string;
  dateValidation: string | null;
  remplaceParId: string | null;
  sejourId: string | null;
};

export type DocumentDetail = {
  resume: DocumentResume;
  patientId: number;
  serviceId: number | null;
  modeleId: number | null;
  modeleVersion: number | null;
  structure: Structure;
  valeurs: Valeurs;
  empreinte: string | null;
  remplaceId: string | null;
  modifiable: boolean;
  rectifiable: boolean;
};

export type ModeleResume = {
  id: number;
  nom: string;
  description: string | null;
  type: string;
  typeLibelle: string;
  serviceId: number | null;
  systeme: boolean;
  version: number;
  statut: 'BROUILLON' | 'PUBLIE' | 'ARCHIVE';
  nombreChamps: number;
  favori: boolean;
  utilisations: number;
  libre: boolean;
};

export type ModeleDetail = { resume: ModeleResume; structure: Structure };

export type Reference = { id: string; libelle: string; type: string; date: string | null };
export type References = { documents: Reference[]; images: Reference[]; equipe: string[] };

export type DemandeModele = {
  id: number;
  serviceId: number;
  serviceNom: string;
  demandeur: string;
  intitule: string;
  details: string | null;
  structureProposee: boolean;
  statut: 'OUVERTE' | 'TRAITEE' | 'REFUSEE';
  modeleId: number | null;
  reponse: string | null;
  dateCreation: string;
};

export type Sejour = {
  id: string;
  numero: string;
  serviceId: number;
  serviceNom: string;
  lit: string | null;
  motif: string | null;
  medecinNom: string | null;
  dateEntree: string;
  dateSortie: string | null;
  enCours: boolean;
};

export type Verification = {
  numero: string;
  type: string | null;
  service: string | null;
  dateValidation: string | null;
  statut: string;
  authentique: boolean;
  remplacePar: string | null;
};
