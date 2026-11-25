/**
 * Règles du planning des rendez-vous : statuts, actions possibles, dates. Fonctions pures, sans état ni style.
 */

export type Statut = 'PLANIFIE' | 'CONFIRME' | 'REPORTE' | 'TERMINE' | 'ANNULE' | 'ABSENCE';
export type Action = 'confirmer' | 'terminer' | 'absence' | 'reporter' | 'annuler';
export type Onglet = 'jour' | 'avenir' | 'tous';

export type RendezVous = {
  id: string;
  patientId: number;
  patientNom: string;
  patientPrenom: string;
  dateHeure: string; // « AAAA-MM-JJTHH:mm:ss », heure locale de l'hôpital
  duree: number;
  motif: string;
  notes?: string | null;
  statut: Statut;
  serviceNom?: string | null;
  serviceCode?: string | null;
};

export const STATUTS: Record<Statut, { libelle: string; ton: 'attente' | 'ok' | 'info' | 'neutre' | 'alerte' }> = {
  PLANIFIE: { libelle: 'Planifié', ton: 'attente' },
  CONFIRME: { libelle: 'Confirmé', ton: 'ok' },
  REPORTE: { libelle: 'Reporté', ton: 'info' },
  TERMINE: { libelle: 'Terminé', ton: 'neutre' },
  ANNULE: { libelle: 'Annulé', ton: 'alerte' },
  ABSENCE: { libelle: 'Absent', ton: 'alerte' },
};

/** Actions proposées selon le statut (les statuts finaux n'en ont aucune). */
export const actionsPossibles = (statut: Statut): Action[] => {
  switch (statut) {
    case 'PLANIFIE':
    case 'REPORTE':
      return ['confirmer', 'reporter', 'annuler'];
    case 'CONFIRME':
      return ['terminer', 'absence', 'reporter', 'annuler'];
    default:
      return [];
  }
};

export const estFinal = (statut: Statut) => actionsPossibles(statut).length === 0;

export const DUREES = [15, 30, 45, 60];
export const CRENEAUX_RAPIDES = ['08:30', '10:00', '11:30', '14:00', '15:30', '17:00'];
export const MOTIFS_RAPIDES = ['Consultation', 'Contrôle', 'Suivi', 'Soins', 'Résultats', 'Urgence'];

export const libelleDuree = (minutes: number) => (minutes === 60 ? '1 h' : `${minutes} min`);

const deuxChiffres = (n: number) => String(n).padStart(2, '0');

/** Date du jour « AAAA-MM-JJ » (heure locale). */
export const aujourdHui = () => {
  const d = new Date();
  return `${d.getFullYear()}-${deuxChiffres(d.getMonth() + 1)}-${deuxChiffres(d.getDate())}`;
};

export const jourDe = (dateHeure: string) => dateHeure.slice(0, 10);
export const heureDe = (dateHeure: string) => dateHeure.slice(11, 16);

/** Date et heure saisies → format attendu par le serveur (LocalDateTime, sans fuseau). */
export const versDateHeure = (date: string, heure: string) => `${date}T${heure}:00`;

export const dateLisible = (jour: string) => {
  if (jour === aujourdHui()) return "Aujourd'hui";
  return new Date(`${jour}T12:00:00`).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const dansOnglet = (rdv: RendezVous, onglet: Onglet) => {
  const jour = jourDe(rdv.dateHeure);
  if (onglet === 'jour') return jour === aujourdHui();
  if (onglet === 'avenir') return jour > aujourdHui();
  return true;
};

/** Le créneau [début, début + durée[ chevauche-t-il un rendez-vous encore actif ? */
export const chevauchement = (rendezVous: RendezVous[], date: string, heure: string, duree: number, ignorerId?: string) => {
  if (!date || !heure) return false;
  const debut = new Date(versDateHeure(date, heure)).getTime();
  const fin = debut + duree * 60_000;
  return rendezVous.some((r) => {
    if (r.id === ignorerId || estFinal(r.statut)) return false;
    const d = new Date(r.dateHeure).getTime();
    return debut < d + r.duree * 60_000 && d < fin;
  });
};
