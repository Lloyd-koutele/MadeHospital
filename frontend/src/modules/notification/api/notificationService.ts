import api from '@/shared/api/api';

export type Priorite = 'INFO' | 'IMPORTANT' | 'CRITIQUE';

export type Notification = {
  id: number;
  type: string;
  priorite: Priorite;
  titre: string;
  message: string;
  lien: string | null;
  lue: boolean;
  dateCreation: string;
};

export type PageNotifications = {
  notifications: Notification[];
  nonLues: number;
  suite: boolean;
};

const PREFIXE = '/api/notifications';

export const listerNotifications = async (page = 0, taille = 20): Promise<PageNotifications> => {
  const { data } = await api.get<PageNotifications>(PREFIXE, { params: { page, taille } });
  return data;
};

export const compterNonLues = async (): Promise<number> => {
  const { data } = await api.get<{ nonLues: number }>(`${PREFIXE}/compteur`);
  return data.nonLues;
};

export const marquerLue = async (id: number): Promise<void> => {
  await api.patch(`${PREFIXE}/${id}/lue`);
};

export const marquerToutesLues = async (): Promise<void> => {
  await api.post(`${PREFIXE}/tout-lire`);
};
