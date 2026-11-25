import { useState, type FormEvent } from 'react';
import { LuPencil } from 'react-icons/lu';
import { GROUPES_SANGUINS, SEXES } from '@/modules/patient/creation/regles';
import type { Imc } from '@/modules/patient/creation/regles';
import type { Dossier } from './useDossierComplet';

type Enregistrer = (modifications: Partial<Dossier>) => Promise<void>;

/** Sans fonction d'enregistrement, la carte est en lecture seule (dossier vu par le patient). */

const libelleSexe = (s?: string | null) => SEXES.find((x) => x.valeur === s)?.libelle ?? 'Non renseigné';

/** Carte « Données biométriques et profil », lecture puis édition sur place. */
export function CarteBiometrie({
  dossier,
  imc,
  enregistrer,
  onMessage,
}: {
  dossier: Dossier;
  imc: Imc | null;
  enregistrer?: Enregistrer;
  onMessage?: (m: string) => void;
}) {
  const [edition, setEdition] = useState(false);
  const [valeurs, setValeurs] = useState({ sexe: '', groupeSanguin: '', poids: '', taille: '' });
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);

  const ouvrir = () => {
    setValeurs({
      sexe: dossier.sexe === 'M' ? 'M' : 'F',
      groupeSanguin: dossier.groupeSanguin ?? '',
      poids: dossier.poids ?? '',
      taille: dossier.taille ?? '',
    });
    setErreur('');
    setEdition(true);
  };

  const soumettre = async (e: FormEvent) => {
    e.preventDefault();
    const poids = parseFloat(valeurs.poids);
    const taille = parseFloat(valeurs.taille);
    if (valeurs.poids && (Number.isNaN(poids) || poids <= 0 || poids > 350)) return setErreur('Le poids doit être compris entre 0 et 350 kg.');
    if (valeurs.taille && (Number.isNaN(taille) || taille < 30 || taille > 250)) return setErreur('La taille doit être comprise entre 30 et 250 cm.');
    setEnvoi(true);
    try {
      await enregistrer?.(valeurs);
      setEdition(false);
      onMessage?.('Données biométriques mises à jour.');
    } catch {
      setErreur("Les données n'ont pas pu être enregistrées.");
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <section className="dm-carte">
      <header className="dm-carte-entete">
        <div>
          <h2>Données biométriques et profil</h2>
          <p>Paramètres physiologiques de référence</p>
        </div>
        {!edition && enregistrer && (
          <button type="button" className="dm-bouton-discret" onClick={ouvrir}>
            <LuPencil aria-hidden="true" /> Modifier
          </button>
        )}
      </header>

      {!edition ? (
        <dl className="dm-mesures">
          <div>
            <dt>Sexe</dt>
            <dd>{libelleSexe(dossier.sexe)}</dd>
          </div>
          <div>
            <dt>Groupe sanguin</dt>
            <dd>{dossier.groupeSanguin || 'Non renseigné'}</dd>
          </div>
          <div>
            <dt>Poids</dt>
            <dd>{dossier.poids ? `${dossier.poids} kg` : 'Non renseigné'}</dd>
          </div>
          <div>
            <dt>Taille</dt>
            <dd>{dossier.taille ? `${dossier.taille} cm` : 'Non renseignée'}</dd>
          </div>
          <div className="dm-imc">
            <div>
              <dt>Indice de masse corporelle (IMC)</dt>
              <dd>{imc ? `${imc.valeur.toFixed(1)} kg/m²` : 'Taille et poids nécessaires'}</dd>
            </div>
            {imc && <span className={`dm-etiquette dm-imc-${imc.categorie}`}>{imc.libelle}</span>}
          </div>
        </dl>
      ) : (
        <form className="dm-formulaire" onSubmit={soumettre} noValidate>
          {erreur && <div className="dm-erreur">{erreur}</div>}
          <div className="dm-grille">
            <label>
              Sexe
              <select value={valeurs.sexe} onChange={(e) => setValeurs({ ...valeurs, sexe: e.target.value })}>
                {SEXES.map((s) => (
                  <option key={s.valeur} value={s.valeur}>
                    {s.libelle}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Groupe sanguin
              <select value={valeurs.groupeSanguin} onChange={(e) => setValeurs({ ...valeurs, groupeSanguin: e.target.value })}>
                <option value="">Non renseigné</option>
                {GROUPES_SANGUINS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Poids (kg)
              <input type="number" min={1} max={350} step={0.1} value={valeurs.poids} onChange={(e) => setValeurs({ ...valeurs, poids: e.target.value })} />
            </label>
            <label>
              Taille (cm)
              <input type="number" min={30} max={250} value={valeurs.taille} onChange={(e) => setValeurs({ ...valeurs, taille: e.target.value })} />
            </label>
          </div>
          <div className="dm-formulaire-pied">
            <button type="button" className="dm-bouton-secondaire" onClick={() => setEdition(false)}>
              Annuler
            </button>
            <button type="submit" className="dm-bouton-principal" disabled={envoi}>
              {envoi ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

/** Carte « Contexte clinique et antécédents » (contexte, allergies, traitements), lecture puis édition sur place. */
export function CarteContexte({
  dossier,
  enregistrer,
  onMessage,
}: {
  dossier: Dossier;
  enregistrer?: Enregistrer;
  onMessage?: (m: string) => void;
}) {
  const [edition, setEdition] = useState(false);
  const [valeurs, setValeurs] = useState({ contexte: '', allergies: '', traitements: '' });
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);

  const ouvrir = () => {
    setValeurs({ contexte: dossier.contexte ?? '', allergies: dossier.allergies ?? '', traitements: dossier.traitements ?? '' });
    setErreur('');
    setEdition(true);
  };

  const soumettre = async (e: FormEvent) => {
    e.preventDefault();
    setEnvoi(true);
    try {
      await enregistrer?.(valeurs);
      setEdition(false);
      onMessage?.('Contexte clinique enregistré.');
    } catch {
      setErreur("Le contexte n'a pas pu être enregistré.");
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <section className="dm-carte">
      <header className="dm-carte-entete">
        <div>
          <h2>Contexte clinique et antécédents</h2>
          <p>Notes de suivi, allergies et traitements</p>
        </div>
        {!edition && enregistrer && (
          <button type="button" className="dm-bouton-discret" onClick={ouvrir}>
            <LuPencil aria-hidden="true" /> Éditer
          </button>
        )}
      </header>

      {!edition ? (
        <div className="dm-contexte">
          <div>
            <h3>Contexte et motif de suivi</h3>
            <p className="dm-boite">{dossier.contexte || 'Aucun contexte renseigné.'}</p>
          </div>
          <div>
            <h3>Allergies connues</h3>
            <p className={`dm-boite${dossier.allergies ? ' dm-boite-alerte' : ''}`}>
              {dossier.allergies || 'Aucune allergie connue signalée.'}
            </p>
          </div>
          <div>
            <h3>Traitements en cours</h3>
            <p className="dm-boite">{dossier.traitements || 'Aucun traitement régulier signalé.'}</p>
          </div>
        </div>
      ) : (
        <form className="dm-formulaire" onSubmit={soumettre}>
          {erreur && <div className="dm-erreur">{erreur}</div>}
          <label>
            Contexte et motif de suivi
            <textarea rows={3} value={valeurs.contexte} onChange={(e) => setValeurs({ ...valeurs, contexte: e.target.value })} />
          </label>
          <label>
            Allergies connues
            <input
              value={valeurs.allergies}
              onChange={(e) => setValeurs({ ...valeurs, allergies: e.target.value })}
              placeholder="Ex. Pénicilline, latex (laisser vide si aucune)"
            />
          </label>
          <label>
            Traitements en cours
            <input
              value={valeurs.traitements}
              onChange={(e) => setValeurs({ ...valeurs, traitements: e.target.value })}
              placeholder="Ex. Metformine 500 mg, 2 fois par jour"
            />
          </label>
          <div className="dm-formulaire-pied">
            <button type="button" className="dm-bouton-secondaire" onClick={() => setEdition(false)}>
              Annuler
            </button>
            <button type="submit" className="dm-bouton-principal" disabled={envoi}>
              {envoi ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
