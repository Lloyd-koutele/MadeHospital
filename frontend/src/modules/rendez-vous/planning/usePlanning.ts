import { useCallback, useEffect, useMemo, useState } from 'react';
import { getPatients } from '@/modules/medecin/api/medecinService';
import { changerStatut, creerRendezVous, listerRendezVous, messageErreur, reporterRendezVous, type NouveauRendezVous } from './planningApi';
import { aujourdHui, dansOnglet, type Action, type Onglet, type RendezVous } from './regles';

export type PatientAutorise = {
  id: number;
  nom: string;
  prenom: string;
  telephone?: string;
  dateNaissance?: string;
};

const MESSAGES_ACTION: Record<Exclude<Action, 'reporter'>, string> = {
  confirmer: 'Rendez-vous confirmé.',
  terminer: 'Rendez-vous marqué comme terminé.',
  absence: 'Absence du patient enregistrée.',
  annuler: 'Rendez-vous annulé.',
};

/**
 * Données et actions du planning du médecin : rendez-vous, patients accessibles, onglets, recherche,
 * changement de statut, report et création. Aucun affichage ici.
 */
export function usePlanning() {
  const [rendezVous, setRendezVous] = useState<RendezVous[]>([]);
  const [patients, setPatients] = useState<PatientAutorise[]>([]);
  const [onglet, setOnglet] = useState<Onglet>('jour');
  const [recherche, setRecherche] = useState('');
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [actionEnCours, setActionEnCours] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur('');
    try {
      const [liste, accessibles] = await Promise.all([listerRendezVous(), getPatients().catch(() => [])]);
      setRendezVous(liste);
      setPatients(Array.isArray(accessibles) ? accessibles : []);
    } catch (err) {
      setErreur(messageErreur(err, 'Impossible de charger vos rendez-vous.'));
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    charger();
  }, [charger]);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(''), 3200);
    return () => clearTimeout(t);
  }, [message]);

  const compteurs = useMemo(
    () => ({
      jour: rendezVous.filter((r) => dansOnglet(r, 'jour')).length,
      avenir: rendezVous.filter((r) => dansOnglet(r, 'avenir')).length,
      tous: rendezVous.length,
    }),
    [rendezVous],
  );

  const affiches = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return rendezVous
      .filter((r) => dansOnglet(r, onglet))
      .filter(
        (r) =>
          !q ||
          [`${r.patientPrenom} ${r.patientNom}`, r.motif, r.notes, String(r.patientId)]
            .filter(Boolean)
            .some((v) => String(v).toLowerCase().includes(q)),
      )
      .sort((a, b) => a.dateHeure.localeCompare(b.dateHeure));
  }, [rendezVous, onglet, recherche]);

  const agir = async (rdv: RendezVous, action: Exclude<Action, 'reporter'>) => {
    setActionEnCours(rdv.id);
    setErreur('');
    try {
      await changerStatut(rdv.id, action);
      await charger();
      setMessage(`${MESSAGES_ACTION[action]} (${rdv.patientPrenom} ${rdv.patientNom})`);
    } catch (err) {
      setErreur(messageErreur(err, "L'action n'a pas pu être effectuée."));
    } finally {
      setActionEnCours(null);
    }
  };

  /** Report : renvoie un message d'erreur, ou null si tout s'est bien passé. */
  const reporter = async (rdv: RendezVous, nouvelleDateHeure: string): Promise<string | null> => {
    try {
      await reporterRendezVous(rdv.id, nouvelleDateHeure);
      await charger();
      setMessage(`Rendez-vous de ${rdv.patientPrenom} ${rdv.patientNom} reporté.`);
      return null;
    } catch (err) {
      return messageErreur(err, "Le rendez-vous n'a pas pu être reporté.");
    }
  };

  /** Création : renvoie un message d'erreur, ou null si tout s'est bien passé. */
  const creer = async (rdv: NouveauRendezVous, nomPatient: string): Promise<string | null> => {
    try {
      await creerRendezVous(rdv);
      await charger();
      setOnglet(rdv.dateHeure.slice(0, 10) > aujourdHui() ? 'avenir' : 'jour');
      setMessage(`Rendez-vous planifié pour ${nomPatient}.`);
      return null;
    } catch (err) {
      return messageErreur(err, "Le rendez-vous n'a pas pu être planifié.");
    }
  };

  return {
    rendezVous,
    affiches,
    patients,
    compteurs,
    onglet,
    setOnglet,
    recherche,
    setRecherche,
    chargement,
    erreur,
    message,
    actionEnCours,
    actualiser: charger,
    agir,
    reporter,
    creer,
  };
}
