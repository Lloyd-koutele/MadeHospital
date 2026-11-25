import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LuCalendarDays, LuLayoutTemplate, LuPlus, LuSearch, LuUsers } from 'react-icons/lu';
import { useFonctionChef } from '@/modules/document';
import Modal from '@/shared/ui/Modal';
import FormulairePatient from '@/modules/patient/creation/FormulairePatient';
import FormulaireDossier from '@/modules/dossier-medical/modification/FormulaireDossier';
import PatientAccess from '@/modules/autorisation/components/PatientAccess';
import PanneauDossier from './PanneauDossier';
import { ageDe, heureDe, useEspaceMedecin, type Filtre, type StatutJour } from './useEspaceMedecin';
import './espaceMedecin.css';

type Vue = 'patients' | 'rendezvous';

const FILTRES: { cle: Filtre; libelle: string }[] = [
  { cle: 'tous', libelle: 'Tous' },
  { cle: 'attente', libelle: 'En attente' },
  { cle: 'consulte', libelle: 'Consultés' },
];

const LIBELLES_RDV: Record<string, string> = {
  PLANIFIE: 'Planifié',
  CONFIRME: 'Confirmé',
  REPORTE: 'Reporté',
  TERMINE: 'Terminé',
  ANNULE: 'Annulé',
  ABSENT: 'Absent',
};

const initiales = (prenom: string, nom: string) => `${prenom?.[0] ?? ''}${nom?.[0] ?? ''}`.toUpperCase();

function Statut({ statut }: { statut: StatutJour }) {
  if (!statut) return null;
  return (
    <span className={`em-statut em-statut-${statut}`}>
      <span className="em-point" />
      {statut === 'attente' ? 'En attente' : 'Consulté'}
    </span>
  );
}

/**
 * Espace du médecin : ses patients (recherche, filtre du jour), ses rendez-vous du jour
 * et un panneau latéral pour consulter et compléter le dossier sans quitter la liste.
 */
function EspaceMedecin() {
  const e = useEspaceMedecin();
  const { servicesDiriges, demandesOuvertes } = useFonctionChef();
  const [vue, setVue] = useState<Vue>('patients');
  const [patientOuvertId, setPatientOuvertId] = useState<number | null>(null);
  const [creationOuverte, setCreationOuverte] = useState(false);
  const [accesPatientId, setAccesPatientId] = useState<number | null>(null);
  const [dossierEditionId, setDossierEditionId] = useState<number | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(''), 2800);
    return () => clearTimeout(t);
  }, [message]);

  const patientOuvert = e.patients.find((p) => p.id === patientOuvertId) ?? null;
  const dateDuJour = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <main className="em-page">
      <div className="em-entete">
        <div>
          <h1>{vue === 'patients' ? 'Patients et consultations' : 'Rendez-vous du jour'}</h1>
          <p>
            {e.serviceActif ? `Service ${e.serviceActif.nom} — ` : ''}
            <span className="em-capitale">{dateDuJour}</span>
          </p>
        </div>
        <div className="em-entete-actions">
          {servicesDiriges.length > 0 && (
            <Link to="/medecin/modeles" className="em-bouton em-bouton-chef" title={`Chef de service — ${servicesDiriges.join(', ')}`}>
              <LuLayoutTemplate aria-hidden="true" /> Modèles du service
              {demandesOuvertes > 0 && <span className="em-pastille">{demandesOuvertes}</span>}
            </Link>
          )}
          <button type="button" className="em-bouton em-bouton-principal" onClick={() => setCreationOuverte(true)}>
            <LuPlus aria-hidden="true" /> Nouveau patient
          </button>
        </div>
      </div>

      <div className="em-vues" role="tablist">
        <button type="button" role="tab" aria-selected={vue === 'patients'} className={vue === 'patients' ? 'actif' : ''} onClick={() => setVue('patients')}>
          <LuUsers aria-hidden="true" /> Patients <span className="em-compteur">{e.patients.length}</span>
        </button>
        <button type="button" role="tab" aria-selected={vue === 'rendezvous'} className={vue === 'rendezvous' ? 'actif' : ''} onClick={() => setVue('rendezvous')}>
          <LuCalendarDays aria-hidden="true" /> Rendez-vous du jour <span className="em-compteur">{e.rendezVous.length}</span>
        </button>
      </div>

      {e.erreur && (
        <div className="em-erreur" role="alert">
          {e.erreur}
        </div>
      )}

      {vue === 'patients' ? (
        <section className="em-carte">
          <div className="em-outils">
            <div className="em-recherche">
              <LuSearch aria-hidden="true" />
              <input
                type="search"
                value={e.recherche}
                onChange={(ev) => e.setRecherche(ev.target.value)}
                placeholder="Rechercher un patient par nom, téléphone ou dossier…"
                aria-label="Rechercher un patient"
              />
            </div>
            <div className="em-filtres" role="tablist" aria-label="Filtrer par situation du jour">
              {FILTRES.map(({ cle, libelle }) => (
                <button key={cle} type="button" className={e.filtre === cle ? 'actif' : ''} onClick={() => e.setFiltre(cle)}>
                  {libelle}
                </button>
              ))}
            </div>
          </div>

          {e.chargement ? (
            <p className="em-vide">Chargement de vos patients…</p>
          ) : e.patientsAffiches.length === 0 ? (
            <div className="em-vide">
              <p>Aucun patient trouvé</p>
              <span>Modifiez la recherche ou le filtre.</span>
            </div>
          ) : (
            <div className="em-defilement">
              <table className="em-tableau">
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Contact et âge</th>
                    <th>Dossier</th>
                    <th className="em-droite">Statut et action</th>
                  </tr>
                </thead>
                <tbody>
                  {e.patientsAffiches.map((p) => {
                    const age = ageDe(p.dateNaissance);
                    const statut = e.statutParPatient.get(p.id) ?? null;
                    return (
                      <tr key={p.id} onClick={() => setPatientOuvertId(p.id)}>
                        <td>
                          <div className="em-patient">
                            <span className="em-avatar">{initiales(p.prenom, p.nom)}</span>
                            <div>
                              <div className="em-nom">
                                {p.prenom} {p.nom}
                              </div>
                              <div className="em-identifiant">#{String(p.id).padStart(4, '0')}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div>{p.telephone || p.email}</div>
                          <div className="em-discret">
                            {[age != null ? `${age} ans` : null, p.dossierMedical?.sexe].filter(Boolean).join(' · ')}
                          </div>
                        </td>
                        <td>
                          <div>{p.dossierMedical?.groupeSanguin ? `Groupe ${p.dossierMedical.groupeSanguin}` : '—'}</div>
                          {p.dossierMedical?.contexte && <div className="em-alerte em-tronque">{p.dossierMedical.contexte}</div>}
                        </td>
                        <td className="em-droite" onClick={(ev) => ev.stopPropagation()}>
                          <div className="em-actions">
                            <Statut statut={statut} />
                            <button type="button" className="em-bouton em-bouton-petit" onClick={() => setPatientOuvertId(p.id)}>
                              {statut === 'attente' ? 'Consulter' : 'Voir dossier'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : (
        <section className="em-carte">
          <div className="em-outils">
            <span className="em-titre-carte">Créneaux du jour</span>
            <Link to="/medecin/rendez-vous" className="em-lien">
              Gérer tous les rendez-vous
            </Link>
          </div>
          {e.rendezVous.length === 0 ? (
            <p className="em-vide">Aucun rendez-vous aujourd'hui.</p>
          ) : (
            <ul className="em-agenda">
              {e.rendezVous.map((r) => (
                <li key={r.id}>
                  <span className="em-heure">{heureDe(r.dateHeure)}</span>
                  <div className="em-agenda-texte">
                    <div className="em-nom">
                      {r.patientPrenom} {r.patientNom} <span className="em-identifiant">#{String(r.patientId).padStart(4, '0')}</span>
                    </div>
                    <div className="em-discret">
                      {r.motif} · {r.duree} min{r.serviceNom ? ` · ${r.serviceNom}` : ''}
                    </div>
                  </div>
                  <span className={`em-statut-rdv statut-${r.statut.toLowerCase()}`}>{LIBELLES_RDV[r.statut] ?? r.statut}</span>
                  <button type="button" className="em-bouton em-bouton-petit" onClick={() => setPatientOuvertId(r.patientId)}>
                    Ouvrir
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <PanneauDossier
        patient={patientOuvert}
        onFermer={() => setPatientOuvertId(null)}
        onGererAcces={(id) => {
          setPatientOuvertId(null);
          setAccesPatientId(id);
        }}
        onModifierDossier={setDossierEditionId}
        onMessage={setMessage}
      />

      <Modal
        isOpen={creationOuverte}
        onClose={() => setCreationOuverte(false)}
        title="Nouveau dossier patient"
        sousTitre="Création de la fiche clinique et de l'accès au portail"
        large
      >
        {creationOuverte && (
          <FormulairePatient
            onAnnuler={() => setCreationOuverte(false)}
            onSucces={(texte) => {
              setCreationOuverte(false);
              setMessage(texte);
              e.recharger();
            }}
          />
        )}
      </Modal>

      <Modal
        isOpen={dossierEditionId !== null}
        onClose={() => setDossierEditionId(null)}
        title="Modifier le dossier médical"
        sousTitre={(() => {
          const p = e.patients.find((x) => x.id === dossierEditionId);
          return p ? `${p.prenom} ${p.nom} — #${String(p.id).padStart(4, '0')}` : undefined;
        })()}
        large
      >
        {dossierEditionId !== null && (
          <FormulaireDossier
            key={dossierEditionId}
            patientId={dossierEditionId}
            dossier={e.patients.find((x) => x.id === dossierEditionId)?.dossierMedical}
            onAnnuler={() => setDossierEditionId(null)}
            onSucces={(texte) => {
              setDossierEditionId(null);
              setMessage(texte);
              e.recharger();
            }}
          />
        )}
      </Modal>

      <Modal isOpen={accesPatientId !== null} onClose={() => setAccesPatientId(null)} title="Gestion des accès au dossier" large>
        {accesPatientId !== null && <PatientAccess patientId={accesPatientId} onClose={() => setAccesPatientId(null)} />}
      </Modal>

      {message && (
        <div className="em-toast" role="status">
          {message}
        </div>
      )}
    </main>
  );
}

export default EspaceMedecin;
