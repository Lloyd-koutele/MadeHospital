import { useEffect, useState, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { identiteFraiche } from './useEtablissement';

/**
 * Premier démarrage : tant que l'identité de l'hôpital n'est pas configurée,
 * l'administrateur est conduit à l'assistant (le serveur refuse de toute façon les créations de comptes).
 */
function GardeIdentite({ children }: { children: ReactNode }) {
  const [etat, setEtat] = useState<'chargement' | 'ok' | 'a-configurer'>('chargement');

  useEffect(() => {
    let actif = true;
    identiteFraiche().then((i) => {
      if (actif) setEtat(i.configure ? 'ok' : 'a-configurer');
    });
    return () => {
      actif = false;
    };
  }, []);

  if (etat === 'chargement') return null;
  if (etat === 'a-configurer') return <Navigate to="/admin/identite" replace />;
  return <>{children}</>;
}

export default GardeIdentite;
