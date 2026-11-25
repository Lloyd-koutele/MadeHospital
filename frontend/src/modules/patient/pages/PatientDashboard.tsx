import { Link } from 'react-router-dom';
import {
  LuArrowRight,
  LuCalendarDays,
  LuCalendarHeart,
  LuHeartPulse,
  LuKeyRound,
  LuLock,
  LuShieldCheck,
  LuStethoscope,
} from 'react-icons/lu';
import { usePatientDashboard } from '../tableau-de-bord/usePatientDashboard';
import {
  accesActif,
  calculerImc,
  dateCourte,
  heure,
  initiales,
  LIBELLES_RDV,
  libelleSexe,
  numeroDossier,
} from '../tableau-de-bord/regles';
import './patientDashboard.css';

/** Tableau de bord du patient : dossier, rendez-vous et consultations, accès à son dossier. */
function PatientDashboard() {
  const t = usePatientDashboard();

  if (t.chargement) {
    return (
      <main className="pt-page">
        <p className="pt-info">Chargement de votre espace…</p>
      </main>
    );
  }

  const d = t.dossier;
  const imc = d ? calculerImc(d.poids, d.taille) : null;
  const numero = numeroDossier(t.identite?.patientId);
  const vide = t.prochainsRendezVous.length === 0 && t.consultationsRecentes.length === 0;

  return (
    <main className="pt-page">
      <header className="pt-entete">
        <div>
          <h1>Mon Espace Patient</h1>
          <p>
            {t.identite && (
              <>
                Bienvenue, <strong>{t.identite.prenom} {t.identite.nom}</strong> —{' '}
              </>
            )}
            Vue d'ensemble de votre suivi médical
          </p>
        </div>
        <Link to="/patient/rendez-vous" className="pt-bouton">
          <LuCalendarDays aria-hidden="true" /> Mes rendez-vous
        </Link>
      </header>

      {t.erreur && (
        <div className="pt-erreur" role="alert">
          {t.erreur}
          <button type="button" onClick={t.recharger}>Réessayer</button>
        </div>
      )}

      <div className="pt-grille">
        <div className="pt-colonne">
          {/* Dossier médical */}
          <section className="pt-carte">
            <div className="pt-carte-entete">
              <div className="pt-titre">
                <span className="pt-icone bleu"><LuHeartPulse aria-hidden="true" /></span>
                <div>
                  <h2>Mon Dossier Médical</h2>
                  <p>Constantes et profil clinique</p>
                </div>
              </div>
              {numero && <span className="pt-etiquette">{numero}</span>}
            </div>

            <div className="pt-carte-corps">
              {d ? (
                <>
                  <div className="pt-tuiles">
                    <Tuile libelle="Groupe sanguin" valeur={d.groupeSanguin || 'Non renseigné'} fort />
                    <Tuile libelle="Sexe" valeur={libelleSexe(d.sexe)} />
                    <Tuile libelle="Poids" valeur={d.poids ? `${d.poids} kg` : 'Non renseigné'} />
                    <Tuile libelle="Taille" valeur={d.taille ? `${d.taille} cm` : 'Non renseignée'} />
                  </div>
                  <div className="pt-tuiles deux">
                    <div className="pt-tuile imc">
                      <div>
                        <span>IMC calculé</span>
                        <strong>{imc ? imc.valeur : 'Poids et taille requis'}</strong>
                      </div>
                      {imc && <span className={`pt-pastille ${imc.niveau}`}>{imc.libelle}</span>}
                    </div>
                    <Tuile libelle="Contexte médical" valeur={d.contexte || 'Aucun'} />
                  </div>
                </>
              ) : (
                <p className="pt-info">Aucune information disponible dans votre dossier médical.</p>
              )}
              <div className="pt-carte-pied">
                <span>{d?.dateCreation ? `Dossier ouvert le ${dateCourte(d.dateCreation)}` : ''}</span>
                <Link to="/patient/dossier" className="pt-bouton petit">
                  Voir mon dossier complet <LuArrowRight aria-hidden="true" />
                </Link>
              </div>
            </div>
          </section>

          {/* Rendez-vous et consultations */}
          <section className="pt-carte">
            <div className="pt-carte-entete">
              <div className="pt-titre">
                <span className="pt-icone gris"><LuStethoscope aria-hidden="true" /></span>
                <div>
                  <h2>Mes Consultations Récentes</h2>
                  <p>Prochains rendez-vous et dernières visites</p>
                </div>
              </div>
              <Link to="/patient/rendez-vous" className="pt-lien">Voir l'agenda</Link>
            </div>

            <div className="pt-carte-corps">
              {vide ? (
                <div className="pt-vide">
                  <span className="pt-vide-icone"><LuCalendarHeart aria-hidden="true" /></span>
                  <p className="pt-vide-titre">Aucune consultation récente enregistrée sur votre dossier.</p>
                  <p>Vos prochains rendez-vous et vos consultations apparaîtront ici.</p>
                  <Link to="/patient/rendez-vous" className="pt-bouton contour">
                    <LuCalendarDays aria-hidden="true" /> Mes rendez-vous
                  </Link>
                </div>
              ) : (
                <ul className="pt-liste">
                  {t.prochainsRendezVous.map((r) => (
                    <li key={r.id}>
                      <div className="pt-liste-tete">
                        <span className="pt-date">{dateCourte(r.dateHeure)} · {heure(r.dateHeure)}</span>
                        <span className="pt-pastille normal">{LIBELLES_RDV[r.statut] ?? r.statut}</span>
                      </div>
                      <strong>
                        Dr {r.medecinPrenom} {r.medecinNom}
                        {r.serviceNom ? ` — ${r.serviceNom}` : ''}
                      </strong>
                      {r.motif && <small>Motif : {r.motif}</small>}
                    </li>
                  ))}
                  {t.consultationsRecentes.map((c) => (
                    <li key={c.id}>
                      <div className="pt-liste-tete">
                        <span className="pt-date passe">{dateCourte(c.dateCreation)}</span>
                        <span className="pt-pastille neutre">{c.type || 'Consultation'}</span>
                      </div>
                      <strong>{c.nomMedecin ? `Dr ${c.nomMedecin}` : 'Médecin'}</strong>
                      <Link to="/patient/dossier?onglet=consultations" className="pt-lien">Voir dans mon dossier</Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>

        <aside className="pt-colonne">
          {/* Accès au dossier */}
          <section className="pt-carte">
            <div className="pt-carte-entete">
              <div className="pt-titre">
                <span className="pt-icone vert"><LuShieldCheck aria-hidden="true" /></span>
                <h2>Gestion des Accès</h2>
              </div>
              <span className="pt-pastille normal">
                {t.accesActifs} actif{t.accesActifs > 1 ? 's' : ''}
              </span>
            </div>
            <div className="pt-carte-corps">
              <p className="pt-texte">
                Contrôlez les médecins autorisés à consulter votre dossier médical. Vous pouvez retirer un accès à tout moment.
              </p>
              {t.acces.length === 0 ? (
                <p className="pt-info">Aucun médecin n'a accès à votre dossier.</p>
              ) : (
                <ul className="pt-medecins">
                  {t.acces.map((a) => {
                    const actif = accesActif(a);
                    return (
                      <li key={a.id}>
                        <span className="pt-avatar">{initiales(a.medecinAutoriseNom)}</span>
                        <div>
                          <strong>{a.medecinAutoriseNom}</strong>
                          <small>
                            {a.dateExpiration ? `Jusqu'au ${dateCourte(a.dateExpiration)}` : 'Sans date de fin'}
                          </small>
                        </div>
                        <span className={`pt-pastille ${actif ? 'normal' : 'neutre'}`}>{actif ? 'Autorisé' : 'Expiré'}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
              <Link to="/patient/acces" className="pt-bouton large">
                <LuKeyRound aria-hidden="true" /> Gérer les accès
              </Link>
            </div>
          </section>

          <div className="pt-note">
            <LuLock aria-hidden="true" />
            <p>
              <strong>Données de santé protégées</strong>
              Chaque consultation de votre dossier par un professionnel est tracée dans le journal d'accès.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}

function Tuile({ libelle, valeur, fort = false }: { libelle: string; valeur: string; fort?: boolean }) {
  return (
    <div className="pt-tuile">
      <span>{libelle}</span>
      <strong className={fort ? 'fort' : ''}>{valeur}</strong>
    </div>
  );
}

export default PatientDashboard;
