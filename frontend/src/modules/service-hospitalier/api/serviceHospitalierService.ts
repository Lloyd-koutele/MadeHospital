import api from '@/shared/api/api';

/** Service de l'hôpital (Imagerie, Odontologie...). */
export type ServiceHospitalier = {
  id: number;
  nom: string;
  code: string;
  description?: string | null;
  actif: boolean;
  medecinIds?: number[];
  /** Médecin chef du service (gère ses modèles de documents). */
  chefId?: number | null;
  /** Pour le médecin connecté : il dirige ce service. */
  chef?: boolean;
};

/** Création / modification : le code court est généré par le serveur à partir du nom. */
export type ServiceRequete = {
  nom: string;
  description?: string;
};

/** Message d'erreur renvoyé par le serveur, ou message par défaut. */
export const messageErreur = (error: any, defaut: string): string =>
  error?.response?.data?.message || defaut;

// ---------- Administration ----------

export const listerServices = async (): Promise<ServiceHospitalier[]> =>
  (await api.get('/api/admin/services')).data;

export const creerService = async (requete: ServiceRequete): Promise<ServiceHospitalier> =>
  (await api.post('/api/admin/services', requete)).data;

export const modifierService = async (id: number, requete: ServiceRequete): Promise<ServiceHospitalier> =>
  (await api.put(`/api/admin/services/${id}`, requete)).data;

export const changerStatutService = async (id: number, actif: boolean): Promise<ServiceHospitalier> =>
  (await api.patch(`/api/admin/services/${id}/statut`, { actif })).data;

export const affecterMedecins = async (id: number, medecinIds: number[]): Promise<ServiceHospitalier> =>
  (await api.put(`/api/admin/services/${id}/medecins`, { medecinIds })).data;

export const designerChef = async (id: number, medecinId: number | null): Promise<ServiceHospitalier> =>
  (await api.put(`/api/admin/services/${id}/chef`, { medecinId })).data;

// ---------- Médecin ----------

export const mesServices = async (): Promise<ServiceHospitalier[]> =>
  (await api.get('/api/medecin/mes-services')).data;
