import { useEffect, useState } from 'react';
import { LuBedDouble } from 'react-icons/lu';
import { mesSejours, messageErreur } from '../api/documentService';
import { dateHeure } from '../regles';
import type { Sejour } from '../types';
import '../saisie/saisie.css';
import '../sejours/sejours.css';

/** Séjours hospitaliers du patient connecté, en lecture seule (onglet « Hospitalisation » de son dossier). */
function MesSejours() {
  const [sejours, setSejours] = useState<Sejour[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');

  useEffect(() => {
    mesSejours()
      .then(setSejours)
      .catch((e) => setErreur(messageErreur(e, 'Séjours indisponibles.')))
      .finally(() => setChargement(false));
  }, []);

  return (
    <section className="dm-carte">
      <header className="dm-carte-entete">
        <div>
          <h2>Hospitalisations</h2>
          <p>Vos admissions et sorties</p>
        </div>
      </header>
      {erreur && <div className="saisie-erreur" role="alert">{erreur}</div>}
      {chargement ? (
        <p className="dm-vide">Chargement…</p>
      ) : sejours.length === 0 ? (
        <p className="dm-vide">Aucun séjour hospitalier.</p>
      ) : (
        <ul className="sejours-liste">
          {sejours.map((s) => (
            <li key={s.id} className={s.enCours ? 'en-cours' : ''}>
              <span className="sejour-icone"><LuBedDouble aria-hidden="true" /></span>
              <div className="sejour-texte">
                <strong>
                  {s.numero} · {s.serviceNom}
                  {s.lit ? ` · lit ${s.lit}` : ''}
                </strong>
                <small>
                  Entrée le {dateHeure(s.dateEntree)}
                  {s.dateSortie ? ` · sortie le ${dateHeure(s.dateSortie)}` : ' · en cours'}
                  {s.medecinNom ? ` · ${s.medecinNom}` : ''}
                </small>
                {s.motif && <small>Motif : {s.motif}</small>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default MesSejours;
