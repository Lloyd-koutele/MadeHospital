import { exempleTelephone, PAYS, paysDe } from '@/shared/utils/telephone';
import './champTelephone.css';

type Props = {
  pays: string;
  numero: string;
  onPays: (code: string) => void;
  onNumero: (saisie: string) => void;
  id?: string;
};

/**
 * Champ téléphone international : choix du pays (drapeau + indicatif) puis numéro national.
 * Le formatage et la validation sont faits par l'appelant avec shared/utils/telephone.
 */
function ChampTelephone({ pays, numero, onPays, onNumero, id }: Props) {
  const choisi = paysDe(pays);
  return (
    <span className="ct">
      <span className="ct-pays">
        <span className="ct-affichage" aria-hidden="true">
          {choisi.drapeau} {choisi.indicatif}
        </span>
        <select value={choisi.code} onChange={(e) => onPays(e.target.value)} aria-label="Pays du numéro">
          {PAYS.map((p) => (
            <option key={p.code} value={p.code}>
              {p.drapeau} {p.nom} ({p.indicatif})
            </option>
          ))}
        </select>
      </span>
      <input
        id={id}
        type="tel"
        inputMode="numeric"
        value={numero}
        onChange={(e) => onNumero(e.target.value)}
        placeholder={exempleTelephone(choisi.code)}
        aria-label="Numéro de téléphone"
      />
    </span>
  );
}

export default ChampTelephone;
