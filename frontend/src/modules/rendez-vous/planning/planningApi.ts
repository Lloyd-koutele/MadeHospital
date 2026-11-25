import api from '@/shared/api/api';
import { serviceActifPourRequete } from '@/modules/service-hospitalier/serviceActif';
import type { Action, RendezVous } from './regles';

const PREFIXE = '/api/rendez-vous';

/** Message lisible depuis une réponse d'erreur du serveur. */
export const messageErreur = (err: any, defaut: string): string => {
  const d = err?.response?.data;
  return (typeof d === 'string' && d) || d?.message || defaut;
};

/** Rendez-vous du médecin connecté (tous statuts). */
export const listerRendezVous = async (): Promise<RendezVous[]> => {
  const reponse = (await api.get(PREFIXE)).data;
  return Array.isArray(reponse?.data) ? reponse.data : [];
};

export type NouveauRendezVous = {
  patientId: number;
  dateHeure: string;
  duree: number;
  motif: string;
  notes?: string;
};

/** Création dans le service actif du médecin (vérifié par le serveur). */
export const creerRendezVous = async (rdv: NouveauRendezVous) =>
  (await api.post(PREFIXE, { ...rdv, ...serviceActifPourRequete() })).data;

export const reporterRendezVous = async (id: string, nouvelleDateHeure: string) =>
  (await api.post(`${PREFIXE}/${id}/reporter`, { nouvelleDateHeure })).data;

const ROUTES: Record<Exclude<Action, 'reporter'>, string> = {
  confirmer: 'confirmer',
  terminer: 'terminer',
  absence: 'absence',
  annuler: 'annuler',
};

export const changerStatut = async (id: string, action: Exclude<Action, 'reporter'>) =>
  (await api.post(`${PREFIXE}/${id}/${ROUTES[action]}`)).data;
