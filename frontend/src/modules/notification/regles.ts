import type { IconType } from 'react-icons';
import {
  LuBell,
  LuCalendarCheck,
  LuCalendarClock,
  LuCalendarX,
  LuFileText,
  LuFlaskConical,
  LuImage,
  LuKeyRound,
  LuShieldAlert,
  LuStethoscope,
  LuUserPlus,
  LuBuilding2,
} from 'react-icons/lu';

/** Intervalle de rafraîchissement du compteur (ms). */
export const INTERVALLE_RAFRAICHISSEMENT = 60_000;

const ICONES: Record<string, IconType> = {
  RDV_PLANIFIE: LuCalendarClock,
  RDV_CONFIRME: LuCalendarCheck,
  RDV_REPORTE: LuCalendarClock,
  RDV_ANNULE: LuCalendarX,
  RDV_RAPPEL: LuCalendarClock,
  RDV_PROGRAMME_DU_JOUR: LuCalendarCheck,
  CONSULTATION_AJOUTEE: LuStethoscope,
  ORDONNANCE_AJOUTEE: LuFileText,
  RESULTAT_ANALYSE: LuFlaskConical,
  IMAGE_AJOUTEE: LuImage,
  ACCES_ACCORDE: LuKeyRound,
  ACCES_REVOQUE: LuKeyRound,
  ACCES_EXPIRE_BIENTOT: LuKeyRound,
  COMPTE_CREE: LuUserPlus,
  MOT_DE_PASSE_REINITIALISE: LuShieldAlert,
  SERVICE_AFFECTE: LuBuilding2,
  SERVICE_RETIRE: LuBuilding2,
  SERVICE_DESACTIVE_AVEC_MEDECINS: LuBuilding2,
  MEDECIN_SANS_SERVICE: LuBuilding2,
  AUDIT_RUPTURE: LuShieldAlert,
  CONNEXIONS_ECHOUEES: LuShieldAlert,
};

export const iconeDuType = (type: string): IconType => ICONES[type] ?? LuBell;

/** « à l'instant », « il y a 5 min », « il y a 3 h », « hier », puis la date. */
export const tempsRelatif = (iso: string, maintenant: Date = new Date()): string => {
  const date = new Date(iso);
  const secondes = Math.floor((maintenant.getTime() - date.getTime()) / 1000);
  if (secondes < 60) return "à l'instant";
  const minutes = Math.floor(secondes / 60);
  if (minutes < 60) return `il y a ${minutes} min`;
  const heures = Math.floor(minutes / 60);
  if (heures < 24) return `il y a ${heures} h`;
  const jours = Math.floor(heures / 24);
  if (jours === 1) return 'hier';
  if (jours < 7) return `il y a ${jours} jours`;
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
};

/** Le badge plafonne l'affichage à 99. */
export const libelleBadge = (nonLues: number): string => (nonLues > 99 ? '99+' : String(nonLues));
