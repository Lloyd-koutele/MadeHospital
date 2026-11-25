import api from '@/shared/api/api';
import type {
  DemandeModele,
  DocumentDetail,
  DocumentResume,
  ModeleDetail,
  ModeleResume,
  References,
  Sejour,
  Structure,
  Valeurs,
  Verification,
} from '../types';

export const messageErreur = (e: any, defaut: string): string => e?.response?.data?.message || defaut;

// ---------- Galerie et documents (médecin) ----------

export const galerieModeles = async (serviceId: number | null): Promise<ModeleResume[]> =>
  (await api.get('/api/medecin/modeles', { params: serviceId ? { serviceId } : {} })).data;

export const lireModele = async (id: number): Promise<ModeleDetail> => (await api.get(`/api/medecin/modeles/${id}`)).data;

export const basculerFavori = async (id: number): Promise<boolean> =>
  (await api.post(`/api/medecin/modeles/${id}/favori`)).data.favori;

export const demanderModele = async (serviceId: number | null, intitule: string, details: string): Promise<DemandeModele> =>
  (await api.post('/api/medecin/demandes-modeles', { serviceId, intitule, details })).data;

export const documentsDuPatient = async (patientId: number): Promise<DocumentResume[]> =>
  (await api.get(`/api/medecin/patients/${patientId}/documents`)).data;

export const creerDocument = async (
  patientId: number,
  modeleId: number,
  serviceId: number | null,
  sejourId?: string | null,
): Promise<DocumentDetail> =>
  (await api.post(`/api/medecin/patients/${patientId}/documents`, { modeleId, serviceId, sejourId: sejourId ?? null })).data;

export const lireDocument = async (id: string): Promise<DocumentDetail> => (await api.get(`/api/medecin/documents/${id}`)).data;

export const enregistrerDocument = async (
  id: string,
  valeurs: Valeurs,
  titre?: string,
  structure?: Structure,
): Promise<DocumentDetail> => (await api.put(`/api/medecin/documents/${id}`, { valeurs, titre, structure })).data;

export const validerDocument = async (id: string): Promise<DocumentDetail> =>
  (await api.post(`/api/medecin/documents/${id}/valider`)).data;

export const rectifierDocument = async (id: string): Promise<DocumentDetail> =>
  (await api.post(`/api/medecin/documents/${id}/rectifier`)).data;

export const supprimerBrouillon = async (id: string): Promise<void> => {
  await api.delete(`/api/medecin/documents/${id}`);
};

export const proposerCommeModele = async (id: string, intitule: string, details: string): Promise<DemandeModele> =>
  (await api.post(`/api/medecin/documents/${id}/proposer-modele`, { intitule, details })).data;

export const referencesDuPatient = async (patientId: number, serviceId: number | null): Promise<References> =>
  (await api.get(`/api/medecin/patients/${patientId}/references`, { params: serviceId ? { serviceId } : {} })).data;

/** Ouvre un PDF protégé (le jeton est envoyé par l'en-tête, pas dans l'adresse). */
export const ouvrirPdf = async (chemin: string): Promise<void> => {
  const fenetre = window.open('', '_blank');
  const { data } = await api.get(chemin, { responseType: 'blob', headers: { Accept: 'application/pdf' } });
  const url = URL.createObjectURL(new Blob([data], { type: 'application/pdf' }));
  if (fenetre) {
    fenetre.location.href = url;
  } else {
    window.location.href = url;
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
};

export const pdfMedecin = (id: string) => ouvrirPdf(`/api/medecin/documents/${id}/pdf`);
export const pdfPatient = (id: string) => ouvrirPdf(`/api/patient/mes-documents/${id}/pdf`);

// ---------- Séjours ----------

export const sejoursDuPatient = async (patientId: number): Promise<Sejour[]> =>
  (await api.get(`/api/medecin/patients/${patientId}/sejours`)).data;

export const admettrePatient = async (
  patientId: number,
  serviceId: number | null,
  lit: string,
  motif: string,
): Promise<Sejour> => (await api.post(`/api/medecin/patients/${patientId}/sejours`, { serviceId, lit, motif })).data;

export const declarerSortie = async (id: string): Promise<Sejour> => (await api.post(`/api/medecin/sejours/${id}/sortie`, {})).data;

// ---------- Chef de service ----------

export const modelesDuChef = async (): Promise<ModeleResume[]> => (await api.get('/api/medecin/chef/modeles')).data;

export type RequeteModele = {
  serviceId: number | null;
  nom: string;
  description: string;
  type: string;
  structure: Structure;
};

export const creerModele = async (r: RequeteModele): Promise<ModeleDetail> => (await api.post('/api/medecin/chef/modeles', r)).data;

export const modifierModele = async (id: number, r: RequeteModele): Promise<ModeleDetail> =>
  (await api.put(`/api/medecin/chef/modeles/${id}`, r)).data;

export const archiverModele = async (id: number): Promise<ModeleResume> =>
  (await api.post(`/api/medecin/chef/modeles/${id}/archiver`)).data;

export const supprimerModele = async (id: number): Promise<void> => {
  await api.delete(`/api/medecin/chef/modeles/${id}`);
};

export const demandesDuChef = async (): Promise<DemandeModele[]> => (await api.get('/api/medecin/chef/demandes')).data;

export const structureProposee = async (id: number): Promise<Structure | null> => {
  const r = await api.get(`/api/medecin/chef/demandes/${id}/structure`);
  return r.status === 204 ? null : r.data;
};

export const traiterDemande = async (id: number, modeleId: number | null, reponse: string, refuser: boolean): Promise<DemandeModele> =>
  (await api.post(`/api/medecin/chef/demandes/${id}/traiter`, { modeleId, reponse, refuser })).data;

// ---------- Patient et vérification ----------

export const mesDocuments = async (): Promise<DocumentResume[]> => (await api.get('/api/patient/mes-documents')).data;
export const mesSejours = async (): Promise<Sejour[]> => (await api.get('/api/patient/mes-sejours')).data;

export const verifierDocument = async (numero: string, empreinte: string | null): Promise<Verification> =>
  (await api.get(`/api/documents/verifier/${encodeURIComponent(numero)}`, { params: empreinte ? { e: empreinte } : {} })).data;
