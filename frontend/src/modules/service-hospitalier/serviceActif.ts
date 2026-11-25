import { useEffect, useState } from 'react';
import { mesServices, type ServiceHospitalier } from './api/serviceHospitalierService';

/**
 * Service dans lequel le médecin travaille actuellement.
 * Mémorisé dans le navigateur ; le serveur revérifie à chaque création que le service est bien l'un des siens.
 */
const CLE = 'serviceActif';
const EVENEMENT = 'service-actif-change';

export const getServiceActifId = (): number | null => {
  const brut = localStorage.getItem(CLE);
  return brut ? Number(brut) : null;
};

export const setServiceActifId = (id: number | null) => {
  if (id === null) {
    localStorage.removeItem(CLE);
  } else {
    localStorage.setItem(CLE, String(id));
  }
  window.dispatchEvent(new Event(EVENEMENT));
};

/** Paramètre à ajouter aux créations (consultation, rendez-vous). */
export const serviceActifPourRequete = (): { serviceId?: number } => {
  const id = getServiceActifId();
  return id ? { serviceId: id } : {};
};

/**
 * Services du médecin connecté et service actif.
 * Si le service mémorisé ne fait plus partie de ses services actifs, le premier service actif est retenu.
 */
export function useServicesMedecin() {
  const [services, setServices] = useState<ServiceHospitalier[]>([]);
  const [serviceActifId, setServiceActif] = useState<number | null>(getServiceActifId());
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    let annule = false;
    mesServices()
      .then((liste) => {
        if (annule) return;
        setServices(liste);
        const actifs = liste.filter((s) => s.actif);
        const memorise = getServiceActifId();
        if (!actifs.some((s) => s.id === memorise)) {
          setServiceActifId(actifs.length > 0 ? actifs[0].id : null);
        }
      })
      .catch(() => {
        if (!annule) setServices([]);
      })
      .finally(() => {
        if (!annule) setChargement(false);
      });

    const surChangement = () => setServiceActif(getServiceActifId());
    window.addEventListener(EVENEMENT, surChangement);
    return () => {
      annule = true;
      window.removeEventListener(EVENEMENT, surChangement);
    };
  }, []);

  return {
    services,
    servicesActifs: services.filter((s) => s.actif),
    serviceActifId,
    choisirService: setServiceActifId,
    chargement,
  };
}
