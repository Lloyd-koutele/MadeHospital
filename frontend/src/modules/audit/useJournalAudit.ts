import { useCallback, useEffect, useState } from 'react';
import {
  actionsJournal,
  exporterJournal,
  rechercherJournal,
  verifierJournal,
  type FiltresAudit,
  type PageAudit,
  type Verification,
} from './api/auditService';

const TAILLE_PAGE = 25;

/**
 * Logique de l'onglet « Journal d'audit » : recherche filtrée paginée, vérification de la chaîne, export.
 * Aucun affichage ici.
 */
export function useJournalAudit() {
  const [filtres, setFiltres] = useState<FiltresAudit>({});
  const [page, setPage] = useState(0);
  const [resultat, setResultat] = useState<PageAudit | null>(null);
  const [actions, setActions] = useState<string[]>([]);
  const [verification, setVerification] = useState<Verification | null>(null);
  const [verificationEnCours, setVerificationEnCours] = useState(false);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur('');
    try {
      setResultat(await rechercherJournal(filtres, page, TAILLE_PAGE));
    } catch {
      setErreur("Impossible de charger le journal d'audit.");
    } finally {
      setChargement(false);
    }
  }, [filtres, page]);

  const verifier = useCallback(async () => {
    setVerificationEnCours(true);
    try {
      setVerification(await verifierJournal());
    } catch {
      setErreur('La vérification de la chaîne a échoué.');
    } finally {
      setVerificationEnCours(false);
    }
  }, []);

  useEffect(() => {
    charger();
  }, [charger]);

  useEffect(() => {
    verifier();
    actionsJournal().then(setActions).catch(() => setActions([]));
  }, [verifier]);

  const changerFiltre = <K extends keyof FiltresAudit>(cle: K, valeur: FiltresAudit[K]) => {
    setPage(0);
    setFiltres((f) => ({ ...f, [cle]: valeur }));
  };

  return {
    filtres,
    changerFiltre,
    reinitialiser: () => {
      setPage(0);
      setFiltres({});
    },
    page,
    setPage,
    resultat,
    actions,
    verification,
    verificationEnCours,
    verifier,
    exporter: () => exporterJournal(filtres).catch(() => setErreur("L'export a échoué.")),
    rafraichir: charger,
    chargement,
    erreur,
  };
}
