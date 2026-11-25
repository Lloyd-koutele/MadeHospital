import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LuArrowLeft, LuCalendarClock, LuCalendarDays, LuClock, LuHistory, LuStethoscope, LuX } from 'react-icons/lu';
import Modal from '@/shared/ui/Modal';
import { useMesRendezVous, type RendezVousPatient } from './useMesRendezVous';
import './mesRendezVous.css';

const LIBELLES: Record<string, string> = {
  PLANIFIE: 'Planifié',
  CONFIRME: 'Confirmé',
  REPORTE: 'Reporté',
  ANNULE: 'Annulé',
  TERMINE: 'Terminé',
  ABSENCE: 'Absence',
};

const TONS: Record<string, string> = {
  PLANIFIE: 'info',
  CONFIRME: 'succes',
  REPORTE: 'attention',
  ANNULE: 'danger',
  TERMINE: 'neutre',
  ABSENCE: 'neutre',
};

const jour = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const heure = (iso: string) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
const medecin = (r: RendezVousPatient) => `Dr ${r.medecinPrenom ?? ''} ${r.medecinNom ?? ''}`.trim();

/** Rendez-vous du patient : le prochain mis en avant, ceux à venir (annulables), puis l'historique. */
function MesRendezVous() {
  const r = useMesRendezVous();
  const [aAnnuler, setAAnnuler] = useState<RendezVousPatient | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const { message, setMessage } = r;

  useEffect(() => {
    if (!message) return undefined;
    const t = setTimeout(() => setMessage(''), 4000);
    return () => clearTimeout(t);
  }, [message, setMessage]);

  const confirmerAnnulation = async () => {
    if (!aAnnuler) return;
    setEnvoi(true);
    if (await r.annuler(aAnnuler)) setAAnnuler(null);
    setEnvoi(false);
  };

  const prochain = r.aVenir[0];

  return (
    <main className="mr-page">
      <Link to="/patient" className="mr-retour">
        <LuArrowLeft aria-hidden="true" /> Tableau de bord
      </Link>
      <header className="mr-entete">
        <h1>Mes Rendez-vous</h1>
        <p>Vos rendez-vous sont planifiés par votre médecin ; vous pouvez annuler un rendez-vous à venir.</p>
      </header>

      {r.message && <div className="mr-succes" role="status">{r.message}</div>}
      {r.erreur && <div className="mr-erreur" role="alert">{r.erreur}</div>}

      {r.chargement ? (
        <p className="mr-info">Chargement de vos rendez-vous…</p>
      ) : (
        <>
          {prochain && (
            <section className="mr-prochain">
              <span className="mr-prochain-icone"><LuCalendarClock aria-hidden="true" /></span>
              <div className="mr-prochain-texte">
                <span className="mr-surtitre">Prochain rendez-vous</span>
                <strong>{jour(prochain.dateHeure)} à {heure(prochain.dateHeure)}</strong>
                <span>
                  {medecin(prochain)}
                  {prochain.serviceNom ? ` — ${prochain.serviceNom}` : ''}
                </span>
              </div>
              <span className={`mr-statut ${TONS[prochain.statut] ?? 'neutre'}`}>{LIBELLES[prochain.statut] ?? prochain.statut}</span>
            </section>
          )}

          <div className="mr-grille">
            <section className="mr-carte">
              <header className="mr-carte-entete">
                <h2><LuCalendarDays aria-hidden="true" /> À venir</h2>
                <span className="mr-compteur">{r.aVenir.length}</span>
              </header>
              {r.aVenir.length === 0 ? (
                <div className="mr-vide">
                  <p className="mr-vide-titre">Aucun rendez-vous à venir.</p>
                  <p>Lorsque votre médecin planifie un rendez-vous, il apparaît ici et vous recevez une notification.</p>
                </div>
              ) : (
                <ul className="mr-liste">
                  {r.aVenir.map((rdv) => (
                    <LigneRendezVous key={rdv.id} rdv={rdv} onAnnuler={() => setAAnnuler(rdv)} />
                  ))}
                </ul>
              )}
            </section>

            <section className="mr-carte">
              <header className="mr-carte-entete">
                <h2><LuHistory aria-hidden="true" /> Historique</h2>
                <span className="mr-compteur">{r.historique.length}</span>
              </header>
              {r.historique.length === 0 ? (
                <div className="mr-vide">
                  <p>Aucun rendez-vous passé.</p>
                </div>
              ) : (
                <ul className="mr-liste">
                  {r.historique.map((rdv) => (
                    <LigneRendezVous key={rdv.id} rdv={rdv} passe />
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}

      <Modal isOpen={aAnnuler !== null} onClose={() => setAAnnuler(null)} title="Annuler le rendez-vous">
        {aAnnuler && (
          <div className="mr-modale">
            <p>
              Annuler le rendez-vous du <strong>{jour(aAnnuler.dateHeure)} à {heure(aAnnuler.dateHeure)}</strong> avec{' '}
              {medecin(aAnnuler)} ? Le médecin sera prévenu et le créneau libéré.
            </p>
            <div className="mr-modale-actions">
              <button type="button" className="mr-bouton secondaire" onClick={() => setAAnnuler(null)}>Garder</button>
              <button type="button" className="mr-bouton danger" onClick={confirmerAnnulation} disabled={envoi}>
                {envoi ? 'Annulation…' : 'Annuler le rendez-vous'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </main>
  );
}

function LigneRendezVous({ rdv, passe = false, onAnnuler }: { rdv: RendezVousPatient; passe?: boolean; onAnnuler?: () => void }) {
  return (
    <li className={passe ? 'passe' : ''}>
      <div className="mr-date">
        <span>{new Date(rdv.dateHeure).toLocaleDateString('fr-FR', { day: '2-digit' })}</span>
        <small>{new Date(rdv.dateHeure).toLocaleDateString('fr-FR', { month: 'short' })}</small>
      </div>
      <div className="mr-texte">
        <strong>{medecin(rdv)}</strong>
        <small>
          <LuClock aria-hidden="true" /> {heure(rdv.dateHeure)}
          {rdv.duree ? ` · ${rdv.duree} min` : ''}
          {rdv.serviceNom ? (
            <>
              {' · '}
              <LuStethoscope aria-hidden="true" /> {rdv.serviceNom}
            </>
          ) : null}
        </small>
        {rdv.motif && <small>Motif : {rdv.motif}</small>}
      </div>
      <div className="mr-actions">
        <span className={`mr-statut ${TONS[rdv.statut] ?? 'neutre'}`}>{LIBELLES[rdv.statut] ?? rdv.statut}</span>
        {onAnnuler && (
          <button type="button" className="mr-annuler" onClick={onAnnuler} aria-label="Annuler ce rendez-vous">
            <LuX aria-hidden="true" /> Annuler
          </button>
        )}
      </div>
    </li>
  );
}

export default MesRendezVous;
