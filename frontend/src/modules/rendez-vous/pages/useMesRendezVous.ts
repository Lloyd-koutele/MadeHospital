import { useCallback, useEffect, useMemo, useState } from 'react';
import { annulerRendezVous, getMesRendezVousPatient } from '../api/rendezVousService';

export type RendezVousPatient = {
  id: string;
  dateHeure: string;
  duree?: number;
  statut: string;
  motif?: string | null;
  medecinNom?: string | null;
  medecinPrenom?: string | null;
  serviceId?: number | null;
  serviceNom?: string | null;
  serviceCode?: string | null;
};

const ACTIFS = ['PLANIFIE', 'CONFIRME', 'REPORTE'];

/** Un rendez-vous à venir et encore actif peut être annulé par le patient. */
export const estAVenir = (r: RendezVousPatient, maintenant = new Date()) =>
  ACTIFS.includes(r.statut) && new Date(r.dateHeure) >= maintenant;

/** Rendez-vous du patient connecté, séparés en « à venir » (du plus proche) et « historique » (du plus récent). */
export function useMesRendezVous() {
  const [liste, setListe] = useState<RendezVousPatient[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [message, setMessage] = useState('');

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur('');
    try {
      const reponse = await getMesRendezVousPatient();
      if (reponse?.success) setListe(Array.isArray(reponse.data) ? reponse.data : []);
      else setErreur(reponse?.message || 'Impossible de charger vos rendez-vous.');
    } catch {
      setErreur('Impossible de charger vos rendez-vous.');
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    charger();
  }, [charger]);

  const { aVenir, historique } = useMemo(() => {
    const maintenant = new Date();
    const temps = (r: RendezVousPatient) => new Date(r.dateHeure).getTime();
    return {
      aVenir: liste.filter((r) => estAVenir(r, maintenant)).sort((a, b) => temps(a) - temps(b)),
      historique: liste.filter((r) => !estAVenir(r, maintenant)).sort((a, b) => temps(b) - temps(a)),
    };
  }, [liste]);

  const annuler = async (r: RendezVousPatient): Promise<boolean> => {
    setErreur('');
    try {
      const reponse = await annulerRendezVous(r.id);
      if (!reponse?.success) {
        setErreur(reponse?.message || "Le rendez-vous n'a pas pu être annulé.");
        return false;
      }
      setMessage('Rendez-vous annulé. Le médecin est prévenu.');
      await charger();
      return true;
    } catch {
      setErreur("Le rendez-vous n'a pas pu être annulé.");
      return false;
    }
  };

  return { aVenir, historique, chargement, erreur, message, setMessage, annuler, recharger: charger };
}
