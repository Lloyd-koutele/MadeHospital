import { useCallback, useEffect, useRef, useState } from 'react';
import {
  compterNonLues,
  listerNotifications,
  marquerLue,
  marquerToutesLues,
  type Notification,
} from '../api/notificationService';
import { INTERVALLE_RAFRAICHISSEMENT } from '../regles';

/**
 * État des notifications de l'utilisateur connecté : compteur rafraîchi régulièrement,
 * liste chargée à l'ouverture du panneau, lecture individuelle ou globale.
 */
export function useNotifications() {
  const [nonLues, setNonLues] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [page, setPage] = useState(0);
  const [suite, setSuite] = useState(false);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const actif = useRef(true);

  const rafraichirCompteur = useCallback(async () => {
    try {
      const n = await compterNonLues();
      if (actif.current) setNonLues(n);
    } catch {
      // silencieux : le compteur réessaiera au prochain intervalle
    }
  }, []);

  useEffect(() => {
    actif.current = true;
    rafraichirCompteur();
    const intervalle = setInterval(() => {
      if (document.visibilityState === 'visible') rafraichirCompteur();
    }, INTERVALLE_RAFRAICHISSEMENT);
    const auRetour = () => {
      if (document.visibilityState === 'visible') rafraichirCompteur();
    };
    document.addEventListener('visibilitychange', auRetour);
    return () => {
      actif.current = false;
      clearInterval(intervalle);
      document.removeEventListener('visibilitychange', auRetour);
    };
  }, [rafraichirCompteur]);

  const charger = useCallback(async (numero = 0) => {
    setChargement(true);
    setErreur(null);
    try {
      const resultat = await listerNotifications(numero);
      setNotifications((avant) => (numero === 0 ? resultat.notifications : [...avant, ...resultat.notifications]));
      setNonLues(resultat.nonLues);
      setSuite(resultat.suite);
      setPage(numero);
    } catch {
      setErreur('Impossible de charger les notifications.');
    } finally {
      setChargement(false);
    }
  }, []);

  const chargerSuite = useCallback(() => charger(page + 1), [charger, page]);

  const lire = useCallback(async (notification: Notification) => {
    if (notification.lue) return;
    setNotifications((liste) => liste.map((n) => (n.id === notification.id ? { ...n, lue: true } : n)));
    setNonLues((n) => Math.max(0, n - 1));
    try {
      await marquerLue(notification.id);
    } catch {
      rafraichirCompteur();
    }
  }, [rafraichirCompteur]);

  const toutLire = useCallback(async () => {
    setNotifications((liste) => liste.map((n) => ({ ...n, lue: true })));
    setNonLues(0);
    try {
      await marquerToutesLues();
    } catch {
      charger(0);
    }
  }, [charger]);

  return { nonLues, notifications, suite, chargement, erreur, charger, chargerSuite, lire, toutLire };
}
