import { LuCheck, LuEye, LuEyeOff } from 'react-icons/lu';
import ChampTelephone from '@/shared/ui/ChampTelephone';
import { useCreationPatient } from './useCreationPatient';
import { GROUPES_SANGUINS, LONGUEUR_MIN_MOT_DE_PASSE, SEXES } from './regles';
import './formulairePatient.css';

type Props = {
  onAnnuler: () => void;
  onSucces: (message: string) => void;
};

/**
 * Formulaire « Nouveau dossier patient » en trois blocs : identité, constantes, accès au portail.
 * Affichage uniquement : la logique est dans useCreationPatient, les règles dans regles.ts.
 */
function FormulairePatient({ onAnnuler, onSucces }: Props) {
  const f = useCreationPatient(onSucces);
  const v = f.valeurs;

  return (
    <form className="fp" onSubmit={f.soumettre} autoComplete="off" noValidate>
      <div className="fp-corps">
        {f.erreur && (
          <div className="fp-erreur" role="alert">
            {f.erreur}
          </div>
        )}

        {/* 1. Identité et coordonnées */}
        <section className="fp-bloc">
          <div className="fp-bloc-titre">
            <span>1. Identité et coordonnées</span>
            <span className="fp-note">* Champs obligatoires</span>
          </div>
          <div className="fp-grille">
            <label className="fp-champ">
              <span className="fp-libelle">
                Nom <span className="fp-requis">*</span>
              </span>
              <input value={v.nom} onChange={(e) => f.changer('nom', e.target.value)} placeholder="Ex. Diop" />
            </label>
            <label className="fp-champ">
              <span className="fp-libelle">
                Prénom <span className="fp-requis">*</span>
              </span>
              <input value={v.prenom} onChange={(e) => f.changer('prenom', e.target.value)} placeholder="Ex. Aminata" />
            </label>
            <label className="fp-champ">
              <span className="fp-libelle">
                Date de naissance <span className="fp-requis">*</span>
                {f.age !== null && (
                  <span className="fp-pastille">
                    {f.age} an{f.age > 1 ? 's' : ''}
                  </span>
                )}
              </span>
              <input
                type="date"
                value={v.dateNaissance}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => f.changer('dateNaissance', e.target.value)}
              />
            </label>
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
            <div className="fp-champ">
              <label className="fp-libelle" htmlFor="fp-telephone">
                Téléphone <span className="fp-requis">*</span>
              </label>
              <ChampTelephone
                id="fp-telephone"
                pays={v.paysTelephone}
                numero={v.telephone}
                onPays={f.changerPaysTelephone}
                onNumero={f.changerTelephone}
              />
            </div>
            <label className="fp-champ">
              <span className="fp-libelle">
                Email <span className="fp-requis">*</span>
              </span>
              <input
                type="email"
                autoComplete="off"
                value={v.email}
                onChange={(e) => f.changer('email', e.target.value)}
                placeholder="patient@exemple.sn"
              />
            </label>
          </div>
        </section>

        {/* 2. Constantes et profil clinique */}
        <section className="fp-bloc">
          <div className="fp-bloc-titre">
            <span>2. Constantes et profil clinique</span>
            {f.imc && (
              <span className={`fp-pastille fp-imc-${f.imc.categorie}`}>
                IMC : {f.imc.valeur} ({f.imc.libelle})
              </span>
            )}
          </div>
          <div className="fp-grille fp-grille-3">
            <label className="fp-champ">
              <span className="fp-libelle">Taille</span>
              <span className="fp-unite">
                <input
                  type="number"
                  min={40}
                  max={250}
                  value={v.taille}
                  onChange={(e) => f.changer('taille', e.target.value)}
                  placeholder="172"
                />
                <span>cm</span>
              </span>
            </label>
            <label className="fp-champ">
              <span className="fp-libelle">Poids</span>
              <span className="fp-unite">
                <input
                  type="number"
                  min={2}
                  max={350}
                  step={0.1}
                  value={v.poids}
                  onChange={(e) => f.changer('poids', e.target.value)}
                  placeholder="68"
                />
                <span>kg</span>
              </span>
            </label>
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
          </div>
          <label className="fp-champ">
            <span className="fp-libelle">Antécédents, allergies (facultatif)</span>
            <textarea
              rows={2}
              value={v.contexte}
              onChange={(e) => f.changer('contexte', e.target.value)}
              placeholder="Ex. Allergie à la pénicilline, diabète de type 2…"
            />
          </label>
        </section>

        {/* 3. Accès au portail patient */}
        <section className="fp-bloc">
          <div className="fp-bloc-titre">
            <span>3. Accès au portail patient</span>
            <span className="fp-note">Minimum {LONGUEUR_MIN_MOT_DE_PASSE} caractères</span>
          </div>
          <label className="fp-champ">
            <span className="fp-libelle">
              Mot de passe provisoire <span className="fp-requis">*</span>
            </span>
            <span className="fp-mdp">
              <input
                type={f.motDePasseVisible ? 'text' : 'password'}
                autoComplete="new-password"
                value={v.password}
                onChange={(e) => f.changer('password', e.target.value)}
                placeholder="Mot de passe temporaire"
              />
              <button
                type="button"
                onClick={f.basculerVisibilite}
                aria-label={f.motDePasseVisible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              >
                {f.motDePasseVisible ? <LuEyeOff /> : <LuEye />}
              </button>
            </span>
          </label>
          <p className="fp-aide">Le patient se connecte au portail avec son email et ce mot de passe.</p>
        </section>
      </div>

      <footer className="fp-pied">
        <button type="button" className="fp-bouton-secondaire" onClick={onAnnuler}>
          Annuler
        </button>
        <button type="submit" className="fp-bouton-principal" disabled={f.envoi}>
          <LuCheck aria-hidden="true" />
          {f.envoi ? 'Enregistrement…' : 'Enregistrer le patient'}
        </button>
      </footer>
    </form>
  );
}

export default FormulairePatient;
