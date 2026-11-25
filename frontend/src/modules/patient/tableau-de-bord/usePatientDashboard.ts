import { useCallback, useEffect, useState } from 'react';
import {
  getMedecinsAvecAcces,
  getMesConsultations,
  getMesRendezVous,
  getMonDossierMedical,
  getMonIdentite,
} from '../api/patientDashboardService';
import { accesActif, rendezVousAVenir } from './regles';

export type Dossier = {
  sexe?: string | null;
  groupeSanguin?: string | null;
  poids?: string | null;
  taille?: string | null;
  contexte?: string | null;
  allergies?: string | null;
  dateCreation?: string | null;
};

export type Identite = { patientId: number; nom: string; prenom: string };

export type RendezVous = {
  id: string;
  dateHeure: string;
  statut: string;
  motif?: string | null;
  medecinNom?: string | null;
  medecinPrenom?: string | null;
  serviceNom?: string | null;
};

export type Consultation = { id: string; type?: string | null; dateCreation: string; nomMedecin?: string | null; description?: string | null };

export type Acces = {
  id: string;
  medecinAutoriseId: number;
  medecinAutoriseNom: string;
  niveauAcces?: string | null;
  dateCreation?: string | null;
  dateExpiration?: string | null;
};

/** Charge en parallèle tout ce qu'affiche le tableau de bord ; une partie en échec n'empêche pas les autres. */
export function usePatientDashboard() {
  const [identite, setIdentite] = useState<Identite | null>(null);
  const [dossier, setDossier] = useState<Dossier | null>(null);
  const [rendezVous, setRendezVous] = useState<RendezVous[]>([]);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [acces, setAcces] = useState<Acces[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur('');
    const [id, dos, rdv, cons, acc] = await Promise.allSettled([
      getMonIdentite(),
      getMonDossierMedical(),
      getMesRendezVous(),
      getMesConsultations(),
      getMedecinsAvecAcces(),
    ]);
    if (id.status === 'fulfilled') setIdentite(id.value);
    if (dos.status === 'fulfilled') setDossier(dos.value);
    else setErreur('Impossible de charger votre dossier médical. Réessayez plus tard.');
    if (rdv.status === 'fulfilled') setRendezVous(Array.isArray(rdv.value) ? rdv.value : []);
    if (cons.status === 'fulfilled') setConsultations(Array.isArray(cons.value) ? cons.value : []);
    if (acc.status === 'fulfilled') setAcces(Array.isArray(acc.value) ? acc.value : []);
    setChargement(false);
  }, []);

  useEffect(() => {
    charger();
  }, [charger]);

  const consultationsRecentes = [...consultations]
    .sort((a, b) => new Date(b.dateCreation).getTime() - new Date(a.dateCreation).getTime())
    .slice(0, 3);

  return {
    identite,
    dossier,
    prochainsRendezVous: rendezVousAVenir(rendezVous).slice(0, 3),
    consultationsRecentes,
    acces,
    accesActifs: acces.filter((a) => accesActif(a)).length,
    chargement,
    erreur,
    recharger: charger,
  };
}
