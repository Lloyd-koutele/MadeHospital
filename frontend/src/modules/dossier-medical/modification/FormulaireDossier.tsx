import { LuCheck } from 'react-icons/lu';
import { GROUPES_SANGUINS, SEXES } from '@/modules/patient/creation/regles';
import { useModificationDossier, type DossierEditable } from './useModificationDossier';
// Même présentation que le formulaire de création de patient (classes fp-)
import '@/modules/patient/creation/formulairePatient.css';

type Props = {
  patientId: number;
  dossier: DossierEditable | null | undefined;
  onAnnuler: () => void;
  onSucces: (message: string) => void;
};

/**
 * Modification du dossier médical d'un patient : sexe, constantes, groupe sanguin, antécédents et allergies.
 * Affichage uniquement : la logique est dans useModificationDossier.
 */
function FormulaireDossier({ patientId, dossier, onAnnuler, onSucces }: Props) {
  const f = useModificationDossier(patientId, dossier, onSucces);
  const v = f.valeurs;

  return (
    <form className="fp" onSubmit={f.soumettre} noValidate>
      <div className="fp-corps">
        {f.erreur && (
          <div className="fp-erreur" role="alert">
            {f.erreur}
          </div>
        )}

        <section className="fp-bloc">
          <div className="fp-bloc-titre">
            <span>Constantes et profil clinique</span>
            {f.imc && (
              <span className={`fp-pastille fp-imc-${f.imc.categorie}`}>
                IMC : {f.imc.valeur} ({f.imc.libelle})
              </span>
            )}
          </div>

          <div className="fp-grille">
            <div className="fp-champ">
              <span className="fp-libelle">
                Sexe <span className="fp-requis">*</span>
              </span>
              <div className="fp-segments" role="radiogroup" aria-label="Sexe">
                {SEXES.map((s) => (
                  <button
                    key={s.valeur}
                    type="button"
                    role="radio"
                    aria-checked={v.sexe === s.valeur}
                    className={v.sexe === s.valeur ? 'choisi' : ''}
                    onClick={() => f.changer('sexe', s.valeur)}
                  >
                    {s.libelle}
                  </button>
                ))}
              </div>
            </div>
            <label className="fp-champ">
              <span className="fp-libelle">Groupe sanguin</span>
              <select value={v.groupeSanguin} onChange={(e) => f.changer('groupeSanguin', e.target.value)}>
                <option value="">Non renseigné</option>
                {GROUPES_SANGUINS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </label>
            <label className="fp-champ">
              <span className="fp-libelle">Taille</span>
              <span className="fp-unite">
                <input type="number" min={30} max={250} value={v.taille} onChange={(e) => f.changer('taille', e.target.value)} placeholder="172" />
                <span>cm</span>
              </span>
            </label>
            <label className="fp-champ">
              <span className="fp-libelle">Poids</span>
              <span className="fp-unite">
                <input type="number" min={1} max={350} step={0.1} value={v.poids} onChange={(e) => f.changer('poids', e.target.value)} placeholder="68" />
                <span>kg</span>
              </span>
            </label>
          </div>

          <label className="fp-champ">
            <span className="fp-libelle">Antécédents, allergies (facultatif)</span>
            <textarea
              rows={4}
              value={v.contexte}
              onChange={(e) => f.changer('contexte', e.target.value)}
              placeholder="Ex. Allergie à la pénicilline, diabète de type 2…"
            />
          </label>
        </section>
      </div>

      <footer className="fp-pied">
        <button type="button" className="fp-bouton-secondaire" onClick={onAnnuler}>
          Annuler
        </button>
        <button type="submit" className="fp-bouton-principal" disabled={f.envoi}>
          <LuCheck aria-hidden="true" />
          {f.envoi ? 'Enregistrement…' : 'Enregistrer les modifications'}
        </button>
      </footer>
    </form>
  );
}

export default FormulaireDossier;
