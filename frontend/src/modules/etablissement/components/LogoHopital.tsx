import { urlLogo } from '../api/etablissementService';
import { useEtablissement } from '../useEtablissement';
import './logo.css';

type Props = {
  /** Hauteur en pixels. */
  taille?: number;
  /** Variante pour fond sombre (pastille claire derrière le symbole). */
  surFondSombre?: boolean;
  className?: string;
};

/** Symbole de l'hôpital, avec sa forme (ronde, carrée ou rectangle). */
function LogoHopital({ taille = 36, surFondSombre = false, className = '' }: Props) {
  const { identite } = useEtablissement();
  const largeur = identite.forme === 'RECTANGLE' ? Math.round(taille * 1.5) : taille;
  return (
    <span
      className={`logo-hopital forme-${identite.forme.toLowerCase()}${surFondSombre ? ' sombre' : ''} ${className}`}
      style={{ width: largeur, height: taille }}
    >
      <img src={urlLogo(identite.version)} alt={`Symbole de ${identite.nom}`} />
    </span>
  );
}

export default LogoHopital;
