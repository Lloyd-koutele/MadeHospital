import { useCallback, useEffect, useMemo, useState } from 'react';
import { basculerFavori, creerDocument, demanderModele, galerieModeles, messageErreur } from '../api/documentService';
import type { ModeleResume } from '../types';

/** Galerie des modèles du service actif : recherche, favoris, création d'un document, demande de modèle. */
export function useGalerie(patientId: number, serviceId: number | null) {
  const [modeles, setModeles] = useState<ModeleResume[]>([]);
  const [recherche, setRecherche] = useState('');
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [creation, setCreation] = useState<number | null>(null);

  useEffect(() => {
    let actif = true;
    setChargement(true);
    galerieModeles(serviceId)
      .then((m) => actif && setModeles(m))
      .catch((e) => actif && setErreur(messageErreur(e, 'Modèles indisponibles.')))
      .finally(() => actif && setChargement(false));
    return () => {
      actif = false;
    };
  }, [serviceId]);

  const filtres = useMemo(() => {
    const r = recherche.trim().toLowerCase();
    return r
      ? modeles.filter((m) => `${m.nom} ${m.typeLibelle} ${m.description ?? ''}`.toLowerCase().includes(r))
      : modeles;
  }, [modeles, recherche]);

  const groupes = useMemo(
    () => ({
      favoris: filtres.filter((m) => m.favori),
      service: filtres.filter((m) => !m.favori && m.serviceId !== null),
      hopital: filtres.filter((m) => !m.favori && m.serviceId === null),
    }),
    [filtres],
  );

  const favori = useCallback(async (m: ModeleResume) => {
    try {
      const etat = await basculerFavori(m.id);
      setModeles((liste) => liste.map((x) => (x.id === m.id ? { ...x, favori: etat } : x)));
    } catch (e) {
      setErreur(messageErreur(e, 'Favori non enregistré.'));
    }
  }, []);

  const creer = useCallback(
    async (m: ModeleResume, sejourId?: string | null): Promise<string | null> => {
      setCreation(m.id);
      setErreur('');
      try {
        return (await creerDocument(patientId, m.id, serviceId, sejourId)).resume.id;
      } catch (e) {
        setErreur(messageErreur(e, 'Création du document impossible.'));
        return null;
      } finally {
        setCreation(null);
      }
    },
    [patientId, serviceId],
  );

  const demander = useCallback(
    async (intitule: string, details: string): Promise<boolean> => {
      try {
        await demanderModele(serviceId, intitule, details);
        return true;
      } catch (e) {
        setErreur(messageErreur(e, 'Demande non envoyée.'));
        return false;
      }
    },
    [serviceId],
  );

  return { modeles, groupes, recherche, setRecherche, chargement, erreur, creation, favori, creer, demander };
}
