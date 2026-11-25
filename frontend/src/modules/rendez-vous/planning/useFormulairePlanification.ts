import { useMemo, useState, type FormEvent } from 'react';
import { aujourdHui, chevauchement, versDateHeure, type RendezVous } from './regles';
import type { NouveauRendezVous } from './planningApi';
import type { PatientAutorise } from './usePlanning';

type Options = {
  patients: PatientAutorise[];
  rendezVous: RendezVous[];
  creer: (rdv: NouveauRendezVous, nomPatient: string) => Promise<string | null>;
};

/**
 * Logique du formulaire « Planifier un rendez-vous » : recherche du patient, date, durée, motif,
 * détection des chevauchements et envoi. Aucun style ici.
 */
export function useFormulairePlanification({ patients, rendezVous, creer }: Options) {
  const [recherchePatient, setRecherchePatient] = useState('');
  const [patient, setPatient] = useState<PatientAutorise | null>(null);
  const [listeOuverte, setListeOuverte] = useState(false);
  const [date, setDate] = useState(aujourdHui());
  const [heure, setHeure] = useState('');
  const [duree, setDuree] = useState(30);
  const [motif, setMotif] = useState('');
  const [notes, setNotes] = useState('');
  const [notesVisibles, setNotesVisibles] = useState(false);
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);

  const suggestions = useMemo(() => {
    const q = recherchePatient.trim().toLowerCase();
    return patients
      .filter((p) => !q || [`${p.prenom} ${p.nom}`, `${p.nom} ${p.prenom}`, p.telephone, String(p.id)].filter(Boolean).some((v) => String(v).toLowerCase().includes(q)))
      .slice(0, 30);
  }, [patients, recherchePatient]);

  const conflit = useMemo(() => chevauchement(rendezVous, date, heure, duree), [rendezVous, date, heure, duree]);

  const choisirPatient = (p: PatientAutorise) => {
    setPatient(p);
    setRecherchePatient(`${p.prenom} ${p.nom} (#${String(p.id).padStart(4, '0')})`);
    setListeOuverte(false);
  };

  const effacerPatient = () => {
    setPatient(null);
    setRecherchePatient('');
    setListeOuverte(true);
  };

  const soumettre = async (e: FormEvent) => {
    e.preventDefault();
    if (!patient) return setErreur('Sélectionnez un patient dans la liste.');
    if (!date || !heure) return setErreur("Choisissez la date et l'heure du rendez-vous.");
    if (new Date(versDateHeure(date, heure)).getTime() < Date.now()) return setErreur('Le rendez-vous doit être dans le futur.');
    if (!motif.trim()) return setErreur('Le motif est obligatoire.');
    setErreur('');
    setEnvoi(true);
    const probleme = await creer(
      { patientId: patient.id, dateHeure: versDateHeure(date, heure), duree, motif: motif.trim(), notes: notes.trim() || undefined },
      `${patient.prenom} ${patient.nom}`,
    );
    setEnvoi(false);
    if (probleme) {
      setErreur(probleme);
      return;
    }
    setPatient(null);
    setRecherchePatient('');
    setHeure('');
    setMotif('');
    setNotes('');
    setNotesVisibles(false);
  };

  return {
    recherchePatient,
    setRecherchePatient: (v: string) => {
      setRecherchePatient(v);
      setPatient(null);
      setListeOuverte(true);
    },
    patient,
    suggestions,
    listeOuverte,
    setListeOuverte,
    choisirPatient,
    effacerPatient,
    date,
    setDate,
    heure,
    setHeure,
    duree,
    setDuree,
    motif,
    setMotif,
    notes,
    setNotes,
    notesVisibles,
    basculerNotes: () => setNotesVisibles((v) => !v),
    conflit,
    erreur,
    envoi,
    soumettre,
  };
}
