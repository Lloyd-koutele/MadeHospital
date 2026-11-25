import api from '@/shared/api/api';

/** Entrée du journal d'audit telle que renvoyée par /api/admin/audit. */
export type EntreeAudit = {
  sequence: number;
  horodatage: string;
  acteurEmail: string;
  acteurRole?: string | null;
  action: string;
  libelle: string;
  methodeHttp?: string | null;
  chemin?: string | null;
  ressourceId?: string | null;
  patientId?: number | null;
  resultat: 'SUCCES' | 'REFUS' | 'ECHEC';
  codeHttp?: number | null;
  adresseIp?: string | null;
  details?: string | null;
  empreintePrecedente: string;
  empreinte: string;
  signature: string;
};

export type PageAudit = {
  entrees: EntreeAudit[];
  page: number;
  taille: number;
  total: number;
  pages: number;
};

export type Verification = {
  integre: boolean;
  entreesVerifiees: number;
  sequenceRupture?: number | null;
  raison?: string | null;
  verifieeLe: string;
};

export type FiltresAudit = {
  acteur?: string;
  action?: string;
  patientId?: string;
  resultat?: '' | 'SUCCES' | 'REFUS' | 'ECHEC';
  du?: string;
  au?: string;
};

/** Paramètres de requête sans les filtres vides. */
const parametres = (filtres: FiltresAudit) =>
  Object.fromEntries(Object.entries(filtres).filter(([, v]) => v !== undefined && v !== ''));

export const rechercherJournal = async (filtres: FiltresAudit, page: number, taille: number): Promise<PageAudit> =>
  (await api.get('/api/admin/audit', { params: { ...parametres(filtres), page, taille } })).data;

export const actionsJournal = async (): Promise<string[]> => (await api.get('/api/admin/audit/actions')).data;

export const verifierJournal = async (): Promise<Verification> => (await api.get('/api/admin/audit/verification')).data;

/** Télécharge l'export CSV des entrées filtrées. */
export const exporterJournal = async (filtres: FiltresAudit) => {
  const reponse = await api.get('/api/admin/audit/export', { params: parametres(filtres), responseType: 'blob' });
  const disposition: string = reponse.headers['content-disposition'] ?? '';
  const nom = /filename="([^"]+)"/.exec(disposition)?.[1] ?? 'journal-audit.csv';
  const url = URL.createObjectURL(reponse.data);
  const lien = document.createElement('a');
  lien.href = url;
  lien.download = nom;
  lien.click();
  URL.revokeObjectURL(url);
};
