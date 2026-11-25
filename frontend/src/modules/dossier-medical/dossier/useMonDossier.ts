import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '@/shared/api/api';
import { ageDepuis, calculerImc } from '@/modules/patient/creation/regles';
import type { Dossier } from './useDossierComplet';

export type IdentitePatient = {
  patientId: number;
  nom: string;
  prenom: string;
  telephone?: string | null;
  dateNaissance?: string | null;
};

export type Ordonnance = { id: string; medicaments?: string; posologie?: string; instructions?: string; nomMedecin?: string; date?: string };
export type Analyse = { id: string; typeAnalyse?: string; resultat?: string; laboratoire?: string; dateAnalyse?: string };
export type Image = { id: string; typeImage?: string; description?: string; date?: string };

export type ConsultationPatient = {
  id: string;
  type: string;
  description?: string;
  nomMedecin?: string;
  dateCreation?: string;
  service?: { id: number; nom: string; code?: string; couleur?: string } | null;
  ordonnances?: Ordonnance[];
  analyses?: Analyse[];
  images?: Image[];
};

/** Dossier médical du patient connecté, en lecture seule : identité, dossier et consultations. */
export function useMonDossier() {
  const [identite, setIdentite] = useState<IdentitePatient | null>(null);
  const [dossier, setDossier] = useState<Dossier | null>(null);
  const [consultations, setConsultations] = useState<ConsultationPatient[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur('');
    const [id, dos, cons] = await Promise.allSettled([
      api.get('/api/patient'),
      api.get('/api/patient/mon-dossier-medical'),
      api.get('/api/patient/mes-consultations'),
    ]);
    if (id.status === 'fulfilled') setIdentite(id.value.data);
    if (dos.status === 'fulfilled') setDossier(dos.value.data);
    else setErreur('Impossible de charger votre dossier médical.');
    if (cons.status === 'fulfilled') {
      const liste: ConsultationPatient[] = Array.isArray(cons.value.data) ? [...cons.value.data] : [];
      liste.sort((a, b) => new Date(b.dateCreation ?? 0).getTime() - new Date(a.dateCreation ?? 0).getTime());
      setConsultations(liste);
    }
    setChargement(false);
  }, []);

  useEffect(() => {
    charger();
  }, [charger]);

  const age = useMemo(() => (identite?.dateNaissance ? ageDepuis(identite.dateNaissance.slice(0, 10)) : null), [identite]);
  const imc = useMemo(() => calculerImc(dossier?.taille ?? '', dossier?.poids ?? ''), [dossier]);

  return { identite, dossier, consultations, age, imc, chargement, erreur };
}
