import { useCallback, useEffect, useState } from 'react';
import {
  archiverModele,
  demandesDuChef,
  messageErreur,
  modelesDuChef,
  supprimerModele,
  traiterDemande,
} from '../api/documentService';
import type { DemandeModele, ModeleResume } from '../types';

/** Modèles des services dirigés et demandes des médecins. */
export function useGestionModeles() {
  const [modeles, setModeles] = useState<ModeleResume[]>([]);
  const [demandes, setDemandes] = useState<DemandeModele[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [message, setMessage] = useState('');

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      const [m, d] = await Promise.all([modelesDuChef(), demandesDuChef()]);
      setModeles(m);
      setDemandes(d);
      setErreur('');
    } catch (e) {
      setErreur(messageErreur(e, 'Modèles indisponibles.'));
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    charger();
  }, [charger]);

  const action = async (fn: () => Promise<unknown>, succes: string) => {
    try {
      await fn();
      setMessage(succes);
      await charger();
      return true;
    } catch (e) {
      setErreur(messageErreur(e, 'Action impossible.'));
      return false;
    }
  };

  return {
    modelesService: modeles.filter((m) => !m.systeme),
    demandes,
    demandesOuvertes: demandes.filter((d) => d.statut === 'OUVERTE').length,
    chargement,
    erreur,
    message,
    archiver: (m: ModeleResume) => action(() => archiverModele(m.id), `« ${m.nom} » est archivé.`),
    supprimer: (m: ModeleResume) => action(() => supprimerModele(m.id), `« ${m.nom} » est supprimé.`),
    refuser: (d: DemandeModele, reponse: string) => action(() => traiterDemande(d.id, null, reponse, true), 'Demande refusée.'),
    marquerTraitee: (d: DemandeModele, modeleId: number | null) =>
      action(() => traiterDemande(d.id, modeleId, '', false), 'Demande traitée : le médecin est prévenu.'),
  };
}
