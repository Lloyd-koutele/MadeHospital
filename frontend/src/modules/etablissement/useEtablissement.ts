import { useEffect, useState } from 'react';
import { lireIdentite, type Identite } from './api/etablissementService';

/**
 * Identité de l'hôpital partagée par toute l'application (barre de navigation, accueil, connexion).
 * Chargée une fois puis rafraîchie après un changement (événement global).
 */
const EVENEMENT = 'etablissement-change';
const PAR_DEFAUT: Identite = { configure: true, nom: 'MadeHospital', forme: 'RONDE', logoParDefaut: true, version: 0 };

let cache: Identite | null = null;
let enCours: Promise<Identite> | null = null;

const charger = (): Promise<Identite> => {
  if (!enCours) {
    enCours = lireIdentite()
      .then((identite) => {
        cache = identite;
        return identite;
      })
      .catch(() => PAR_DEFAUT)
      .finally(() => {
        enCours = null;
      });
  }
  return enCours;
};

/** À appeler après une modification : toutes les vues se rechargent. */
export const signalerChangementIdentite = (identite: Identite) => {
  cache = identite;
  window.dispatchEvent(new CustomEvent<Identite>(EVENEMENT, { detail: identite }));
};

export function useEtablissement() {
  const [identite, setIdentite] = useState<Identite | null>(cache);

  useEffect(() => {
    let actif = true;
    if (!cache) {
      charger().then((i) => {
        if (actif) setIdentite(i);
      });
    }
    const surChangement = (e: Event) => setIdentite((e as CustomEvent<Identite>).detail);
    window.addEventListener(EVENEMENT, surChangement);
    return () => {
      actif = false;
      window.removeEventListener(EVENEMENT, surChangement);
    };
  }, []);

  return { identite: identite ?? PAR_DEFAUT, charge: identite !== null };
}

/** Lecture fraîche (sans cache), pour la garde du premier démarrage. */
export const identiteFraiche = async (): Promise<Identite> => {
  cache = null;
  return charger();
};
