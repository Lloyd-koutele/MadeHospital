import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { LuCalendarClock, LuCalendarPlus, LuCircleX, LuRefreshCw, LuSearch, LuUserX } from 'react-icons/lu';
import Modal from '@/shared/ui/Modal';
import { useServicesMedecin } from '@/modules/service-hospitalier/serviceActif';
import FormulairePlanification from './FormulairePlanification';
import { usePlanning } from './usePlanning';
import {
  actionsPossibles,
  dateLisible,
  heureDe,
  jourDe,
  libelleDuree,
  STATUTS,
  versDateHeure,
  type Onglet,
  type RendezVous,
} from './regles';
import './planning.css';

const ONGLETS: { cle: Onglet; libelle: string }[] = [
  { cle: 'jour', libelle: "Aujourd'hui" },
  { cle: 'avenir', libelle: 'À venir' },
  { cle: 'tous', libelle: 'Tous les rendez-vous' },
];

const SOUS_TITRES: Record<Onglet, string> = {
  jour: "Rendez-vous d'aujourd'hui",
  avenir: 'Rendez-vous à venir',
  tous: 'Ensemble des rendez-vous',
};

const initiales = (r: RendezVous) => `${r.patientPrenom?.[0] ?? ''}${r.patientNom?.[0] ?? ''}`.toUpperCase();

/**
 * Gestion des rendez-vous du médecin : liste par onglets avec actions, et formulaire de planification.
 * Affichage uniquement : la logique est dans usePlanning et useFormulairePlanification.
 */
function PlanningRendezVous() {
  const p = usePlanning();
  const { servicesActifs, serviceActifId } = useServicesMedecin();
  const serviceActif = servicesActifs.find((s) => s.id === serviceActifId);
  const [aReporter, setAReporter] = useState<RendezVous | null>(null);
  const dateDuJour = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <main className="rv-page">
      <div className="rv-entete">
        <div>
          <h1>Gestion des rendez-vous</h1>
          <p>
            <span className="rv-capitale">{dateDuJour}</span>
            {serviceActif ? ` — Service ${serviceActif.nom}` : ''}
          </p>
        </div>
        <button type="button" className="rv-bouton-secondaire" onClick={p.actualiser} disabled={p.chargement}>
          <LuRefreshCw aria-hidden="true" className={p.chargement ? 'rv-tourne' : ''} /> Actualiser
        </button>
      </div>

      {p.erreur && (
        <div className="rv-erreur rv-erreur-page" role="alert">
          {p.erreur}
        </div>
      )}

      <div className="rv-grille">
        {/* Liste */}
        <section className="rv-carte">
          <div className="rv-outils">
            <div className="rv-onglets" role="tablist">
              {ONGLETS.map(({ cle, libelle }) => (
                <button key={cle} type="button" role="tab" aria-selected={p.onglet === cle} className={p.onglet === cle ? 'actif' : ''} onClick={() => p.setOnglet(cle)}>
                  {libelle} <span className="rv-compteur">{p.compteurs[cle]}</span>
                </button>
              ))}
            </div>
            <div className="rv-recherche">
              <LuSearch aria-hidden="true" />
              <input
                type="search"
                value={p.recherche}
                onChange={(e) => p.setRecherche(e.target.value)}
                placeholder="Rechercher patient ou motif…"
                aria-label="Rechercher un rendez-vous"
              />
            </div>
          </div>

          <div className="rv-sous-titre">
            <strong>{SOUS_TITRES[p.onglet]}</strong>
            <span>
              {p.affiches.length} créneau{p.affiches.length > 1 ? 'x' : ''}
            </span>
          </div>

          {p.chargement && p.rendezVous.length === 0 ? (
            <p className="rv-vide-texte">Chargement du planning…</p>
          ) : p.affiches.length === 0 ? (
            <div className="rv-vide">
              <span className="rv-vide-icone">
                <LuCalendarPlus aria-hidden="true" />
              </span>
              <h3>Aucun rendez-vous trouvé</h3>
              <p>Aucun créneau ne correspond à cette vue ou à votre recherche.</p>
              <button type="button" className="rv-bouton-clair" onClick={() => document.getElementById('rv-patient')?.focus()}>
                Planifier un créneau
              </button>
            </div>
          ) : (
            <div className="rv-defilement">
              <table className="rv-tableau">
                <thead>
                  <tr>
                    <th>Horaire / date</th>
                    <th>Patient</th>
                    <th>Motif</th>
                    <th>Statut</th>
                    <th className="rv-droite">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {p.affiches.map((r) => {
                    const statut = STATUTS[r.statut] ?? STATUTS.PLANIFIE;
                    const actions = actionsPossibles(r.statut);
                    const occupe = p.actionEnCours === r.id;
                    return (
                      <tr key={r.id} className={r.statut === 'ANNULE' || r.statut === 'ABSENCE' ? 'rv-estompe' : ''}>
                        <td>
                          <div className="rv-horaire">
                            <span className="rv-heure">{heureDe(r.dateHeure)}</span>
                            <span className="rv-discret">{libelleDuree(r.duree)}</span>
                          </div>
                          {p.onglet !== 'jour' && <div className="rv-date">{dateLisible(jourDe(r.dateHeure))}</div>}
                        </td>
                        <td>
                          <div className="rv-patient">
                            <span className="rv-avatar">{initiales(r)}</span>
                            <div>
                              <Link to={`/dossier-medical/${r.patientId}`} className="rv-nom">
                                {r.patientPrenom} {r.patientNom}
                              </Link>
                              <span className="rv-discret">#{String(r.patientId).padStart(4, '0')}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="rv-motif">{r.motif}</span>
                          {r.notes && <p className="rv-note">{r.notes}</p>}
                        </td>
                        <td>
                          <span className={`rv-statut rv-ton-${statut.ton}`}>
                            <span className="rv-point" />
                            {statut.libelle}
                          </span>
                        </td>
                        <td className="rv-droite">
                          {actions.length === 0 ? (
                            <span className="rv-discret">—</span>
                          ) : (
                            <div className="rv-actions">
                              {actions.includes('confirmer') && (
                                <button type="button" className="rv-action-principale" disabled={occupe} onClick={() => p.agir(r, 'confirmer')}>
                                  Confirmer
                                </button>
                              )}
                              {actions.includes('terminer') && (
                                <button type="button" className="rv-action-terminer" disabled={occupe} onClick={() => p.agir(r, 'terminer')}>
                                  Terminer
                                </button>
                              )}
                              {actions.includes('absence') && (
                                <button type="button" className="rv-icone" title="Patient absent" aria-label="Patient absent" disabled={occupe} onClick={() => p.agir(r, 'absence')}>
                                  <LuUserX />
                                </button>
                              )}
                              {actions.includes('reporter') && (
                                <button type="button" className="rv-icone" title="Reporter" aria-label="Reporter" disabled={occupe} onClick={() => setAReporter(r)}>
                                  <LuCalendarClock />
                                </button>
                              )}
                              {actions.includes('annuler') && (
                                <button type="button" className="rv-icone rv-icone-danger" title="Annuler" aria-label="Annuler" disabled={occupe} onClick={() => p.agir(r, 'annuler')}>
                                  <LuCircleX />
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Planification */}
        <FormulairePlanification patients={p.patients} rendezVous={p.rendezVous} serviceNom={serviceActif?.nom} creer={p.creer} />
      </div>

      <Modal isOpen={aReporter !== null} onClose={() => setAReporter(null)} title="Reporter le rendez-vous">
        {aReporter && <FormulaireReport rdv={aReporter} reporter={p.reporter} onFermer={() => setAReporter(null)} />}
      </Modal>

      {p.message && (
        <div className="rv-toast" role="status">
          {p.message}
        </div>
      )}
    </main>
  );
}

/** Choix de la nouvelle date et heure d'un rendez-vous. */
function FormulaireReport({
  rdv,
  reporter,
  onFermer,
}: {
  rdv: RendezVous;
  reporter: (rdv: RendezVous, nouvelleDateHeure: string) => Promise<string | null>;
  onFermer: () => void;
}) {
  const [date, setDate] = useState(jourDe(rdv.dateHeure));
  const [heure, setHeure] = useState(heureDe(rdv.dateHeure));
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);

  const soumettre = async (e: FormEvent) => {
    e.preventDefault();
    if (new Date(versDateHeure(date, heure)).getTime() < Date.now()) return setErreur('La nouvelle date doit être dans le futur.');
    setEnvoi(true);
    const probleme = await reporter(rdv, versDateHeure(date, heure));
    setEnvoi(false);
    if (probleme) setErreur(probleme);
    else onFermer();
  };

  return (
    <form className="rv-formulaire rv-report" onSubmit={soumettre} noValidate>
      <p className="rv-discret">
        {rdv.patientPrenom} {rdv.patientNom} — actuellement prévu {dateLisible(jourDe(rdv.dateHeure)).toLowerCase()} à {heureDe(rdv.dateHeure)}
      </p>
      {erreur && <div className="rv-erreur">{erreur}</div>}
      <div className="rv-date-heure rv-date-heure-egal">
        <label>
          Nouvelle date
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label>
          Nouvelle heure
          <input type="time" value={heure} onChange={(e) => setHeure(e.target.value)} step={300} />
        </label>
      </div>
      <div className="rv-pied">
        <button type="button" className="rv-bouton-secondaire" onClick={onFermer}>
          Annuler
        </button>
        <button type="submit" className="rv-bouton-principal" disabled={envoi}>
          {envoi ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </form>
  );
}

export default PlanningRendezVous;
