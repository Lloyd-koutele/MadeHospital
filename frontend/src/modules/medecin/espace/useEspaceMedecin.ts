import { useCallback, useEffect, useMemo, useState } from 'react';
import { getPatients, invalidatePatientsCache } from '../api/medecinService';
import { getRendezVousDuJour } from '@/modules/rendez-vous/api/rendezVousService';
import { useServicesMedecin } from '@/modules/service-hospitalier/serviceActif';

/** Patient tel que renvoyé par /api/medecin/patients (champs utilisés par l'espace médecin). */
export type PatientMedecin = {
  id: number;
  nom: string;
  prenom: string;
  email?: string;
  telephone?: string;
  dateNaissance?: string;
  dossierMedical?: {
    sexe?: string;
    groupeSanguin?: string;
    contexte?: string;
    poids?: string;
    taille?: string;
  } | null;
};

export type RendezVousJour = {
  id: string;
  patientId: number;
  patientNom: string;
  patientPrenom: string;
  dateHeure: string;
  duree: number;
  motif: string;
  statut: 'PLANIFIE' | 'CONFIRME' | 'ANNULE' | 'REPORTE' | 'TERMINE' | 'ABSENT' | string;
  serviceNom?: string;
};

/** Situation du patient aujourd'hui, déduite de ses rendez-vous du jour. */
export type StatutJour = 'attente' | 'consulte' | null;
export type Filtre = 'tous' | 'attente' | 'consulte';

const STATUTS_ATTENTE = ['PLANIFIE', 'CONFIRME', 'REPORTE'];

export const ageDe = (dateNaissance?: string): number | null => {
  if (!dateNaissance) return null;
  const naissance = new Date(dateNaissance);
  if (Number.isNaN(naissance.getTime())) return null;
  const aujourdHui = new Date();
  let age = aujourdHui.getFullYear() - naissance.getFullYear();
  const pasEncore =
    aujourdHui.getMonth() < naissance.getMonth() ||
    (aujourdHui.getMonth() === naissance.getMonth() && aujourdHui.getDate() < naissance.getDate());
  if (pasEncore) age--;
  return age;
};

export const heureDe = (dateHeure: string) =>
  new Date(dateHeure).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

/**
 * Données et filtres de l'espace médecin : patients accessibles, rendez-vous du jour,
 * service actif. Aucun affichage ici.
 */
export function useEspaceMedecin() {
  const [patients, setPatients] = useState<PatientMedecin[]>([]);
  const [rendezVous, setRendezVous] = useState<RendezVousJour[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [recherche, setRecherche] = useState('');
  const [filtre, setFiltre] = useState<Filtre>('tous');
  const { servicesActifs, serviceActifId } = useServicesMedecin();

  const charger = useCallback(async (forcer = false) => {
    setChargement(true);
    setErreur('');
    if (forcer) invalidatePatientsCache();
    try {
      const [liste, rdv] = await Promise.all([
        getPatients(),
        getRendezVousDuJour().catch(() => null),
      ]);
      setPatients(Array.isArray(liste) ? liste : []);
      const donnees = rdv?.data ?? rdv;
      setRendezVous(
        (Array.isArray(donnees) ? donnees : []).sort(
          (a: RendezVousJour, b: RendezVousJour) => new Date(a.dateHeure).getTime() - new Date(b.dateHeure).getTime(),
        ),
      );
    } catch (e: any) {
      setErreur(e?.message || 'Impossible de charger vos patients.');
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    charger();
  }, [charger]);

  /** Statut du jour par patient : « consulté » si un rendez-vous du jour est terminé, sinon « en attente ». */
  const statutParPatient = useMemo(() => {
    const carte = new Map<number, StatutJour>();
    rendezVous.forEach((r) => {
      if (r.statut === 'TERMINE') carte.set(r.patientId, 'consulte');
      else if (STATUTS_ATTENTE.includes(r.statut) && carte.get(r.patientId) !== 'consulte') carte.set(r.patientId, 'attente');
    });
    return carte;
  }, [rendezVous]);

  const patientsAffiches = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return patients.filter((p) => {
      const statut = statutParPatient.get(p.id) ?? null;
      if (filtre !== 'tous' && statut !== filtre) return false;
      if (!q) return true;
      return [`${p.prenom} ${p.nom}`, `${p.nom} ${p.prenom}`, p.email, p.telephone, String(p.id)]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [patients, recherche, filtre, statutParPatient]);

  const serviceActif = servicesActifs.find((s) => s.id === serviceActifId) ?? null;

  return {
    patients,
    patientsAffiches,
    rendezVous,
    statutParPatient,
    serviceActif,
    chargement,
    erreur,
    recherche,
    setRecherche,
    filtre,
    setFiltre,
    recharger: () => charger(true),
  };
}
