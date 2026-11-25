import { useEffect, useState } from 'react';
import { useServicesMedecin } from '@/modules/service-hospitalier';
import { demandesDuChef } from '../api/documentService';

/** Pour un médecin chef de service : services dirigés et nombre de demandes de modèles en attente. */
export function useFonctionChef() {
  const { services } = useServicesMedecin();
  const servicesDiriges = services.filter((s) => s.chef).map((s) => s.nom);
  const estChef = servicesDiriges.length > 0;
  const [demandesOuvertes, setDemandesOuvertes] = useState(0);

  useEffect(() => {
    if (!estChef) return undefined;
    let actif = true;
    demandesDuChef()
      .then((d) => actif && setDemandesOuvertes(d.filter((x) => x.statut === 'OUVERTE').length))
      .catch(() => undefined);
    return () => {
      actif = false;
    };
  }, [estChef]);

  return { servicesDiriges, demandesOuvertes };
}
