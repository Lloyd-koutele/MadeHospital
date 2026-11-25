import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { ajouterConsultation, getConsultation } from '@/modules/dossier-medical/api/consultationService';
import { ajouterOrdonnanceConsultation } from '@/modules/dossier-medical/api/ordonnanceService';

export type ConsultationResume = {
  id: string;
  type: string;
  description: string;
  nomMedecin?: string;
  dateCreation?: string;
  service?: { nom?: string; code?: string } | null;
};

/**
 * Historique d'un patient (consultations des services du médecin) et saisie rapide
 * d'une consultation, avec ordonnance facultative. Aucun affichage ici.
 */
export function useDossierPatient(patientId: number | null, onEnregistre: (message: string) => void) {
  const [historique, setHistorique] = useState<ConsultationResume[]>([]);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState('');
  const [type, setType] = useState('');
  const [note, setNote] = useState('');
  const [ordonnance, setOrdonnance] = useState('');
  const [envoi, setEnvoi] = useState(false);

  const charger = useCallback(async () => {
    if (patientId == null) return;
    setChargement(true);
    setErreur('');
    try {
      const liste = await getConsultation(patientId);
      const consultations: ConsultationResume[] = Array.isArray(liste) ? liste : [];
      consultations.sort(
        (a, b) => new Date(b.dateCreation ?? 0).getTime() - new Date(a.dateCreation ?? 0).getTime(),
      );
      setHistorique(consultations);
    } catch (e: any) {
      setErreur(e?.response?.data?.message || "Impossible de charger l'historique.");
      setHistorique([]);
    } finally {
      setChargement(false);
    }
  }, [patientId]);

  useEffect(() => {
    setType('');
    setNote('');
    setOrdonnance('');
    charger();
  }, [charger]);

  const enregistrer = async (e: FormEvent) => {
    e.preventDefault();
    if (patientId == null) return;
    if (!type.trim() || !note.trim()) {
      setErreur('Le type de consultation et la note sont obligatoires.');
      return;
    }
    setEnvoi(true);
    setErreur('');
    try {
      const consultation = await ajouterConsultation(patientId, { type: type.trim(), description: note.trim() });
      if (ordonnance.trim() && consultation?.id) {
        // Prescription en texte libre ; posologie et instructions gardent leur valeur par défaut côté serveur
        await ajouterOrdonnanceConsultation(patientId, consultation.id, { medicaments: ordonnance.trim() });
      }
      setType('');
      setNote('');
      setOrdonnance('');
      await charger();
      onEnregistre('Consultation enregistrée.');
    } catch (err: any) {
      setErreur(err?.response?.data?.message || err?.message || "La consultation n'a pas pu être enregistrée.");
    } finally {
      setEnvoi(false);
    }
  };

  return {
    historique,
    chargement,
    erreur,
    saisie: { type, setType, note, setNote, ordonnance, setOrdonnance },
    envoi,
    enregistrer,
  };
}
