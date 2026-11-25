import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '@/shared/api/api';
import { getPatients, invalidatePatientsCache } from '@/modules/medecin/api/medecinService';
import { updateDossierMedical } from '@/modules/medecin/api/medecinService';
import { getConsultation, ajouterConsultation } from '@/modules/dossier-medical/api/consultationService';
import { ajouterOrdonnanceConsultation } from '@/modules/dossier-medical/api/ordonnanceService';
import { ageDepuis, calculerImc } from '@/modules/patient/creation/regles';
import type { ConsultationResume } from '@/modules/medecin/espace/useDossierPatient';

export type Dossier = {
  id?: string;
  sexe?: string | null;
  groupeSanguin?: string | null;
  poids?: string | null;
  taille?: string | null;
  contexte?: string | null;
  allergies?: string | null;
  traitements?: string | null;
};

export type Identite = {
  id: number;
  nom: string;
  prenom: string;
  telephone?: string;
  email?: string;
  dateNaissance?: string;
};

export type NouvelleConsultation = { type: string; description: string; ordonnance: string };

const message = (err: any, defaut: string) => {
  const d = err?.response?.data;
  return (typeof d === 'string' && d) || d?.message || defaut;
};

/**
 * Données et actions de la page « dossier médical » : identité, dossier, consultations (des services
 * du médecin), mises à jour par bloc et ajout de consultation. Aucun affichage ici.
 */
export function useDossierComplet(patientId: number) {
  const [identite, setIdentite] = useState<Identite | null>(null);
  const [dossier, setDossier] = useState<Dossier | null>(null);
  const [consultations, setConsultations] = useState<ConsultationResume[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');

  const chargerConsultations = useCallback(async () => {
    const liste = await getConsultation(patientId);
    const triees: ConsultationResume[] = Array.isArray(liste) ? [...liste] : [];
    triees.sort((a, b) => new Date(b.dateCreation ?? 0).getTime() - new Date(a.dateCreation ?? 0).getTime());
    setConsultations(triees);
  }, [patientId]);

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur('');
    try {
      const [patients, reponseDossier] = await Promise.all([
        getPatients(),
        api.get(`/api/medecin/patients/${patientId}/dossier-medical`),
      ]);
      setIdentite((Array.isArray(patients) ? patients : []).find((p: Identite) => p.id === patientId) ?? null);
      setDossier(reponseDossier.data);
      await chargerConsultations();
    } catch (err) {
      setErreur(
        (err as any)?.response?.status === 403
          ? "Vous n'avez pas accès au dossier de ce patient."
          : message(err, 'Impossible de charger le dossier médical.'),
      );
    } finally {
      setChargement(false);
    }
  }, [patientId, chargerConsultations]);

  useEffect(() => {
    charger();
  }, [charger]);

  /** Enregistre une partie du dossier ; la route remplace tout le dossier, on fusionne donc avec l'existant. */
  const enregistrer = async (modifications: Partial<Dossier>) => {
    const complet = { ...dossier, ...modifications };
    await updateDossierMedical(patientId, {
      sexe: complet.sexe || 'F',
      groupeSanguin: complet.groupeSanguin || null,
      poids: complet.poids || null,
      taille: complet.taille || null,
      contexte: complet.contexte?.trim() || null,
      allergies: complet.allergies?.trim() || null,
      traitements: complet.traitements?.trim() || null,
    });
    setDossier(complet);
    invalidatePatientsCache();
  };

  const ajouter = async (c: NouvelleConsultation) => {
    const creee = await ajouterConsultation(patientId, { type: c.type.trim(), description: c.description.trim() });
    if (c.ordonnance.trim() && creee?.id) {
      await ajouterOrdonnanceConsultation(patientId, creee.id, { medicaments: c.ordonnance.trim() });
    }
    await chargerConsultations();
  };

  const age = useMemo(() => (identite?.dateNaissance ? ageDepuis(identite.dateNaissance.slice(0, 10)) : null), [identite]);
  const imc = useMemo(() => calculerImc(dossier?.taille ?? '', dossier?.poids ?? ''), [dossier]);

  return {
    identite,
    dossier,
    consultations,
    age,
    imc,
    chargement,
    erreur,
    enregistrer,
    ajouter,
    rechargerConsultations: chargerConsultations,
    messageErreur: message,
  };
}
