import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  LuArrowLeft,
  LuBedDouble,
  LuFiles,
  LuCake,
  LuChevronRight,
  LuClipboardList,
  LuFileText,
  LuPhone,
  LuPill,
  LuPlus,
  LuTriangleAlert,
} from 'react-icons/lu';
import Modal from '@/shared/ui/Modal';
import BadgeService from '@/modules/service-hospitalier/components/BadgeService';
import ConsultationDetail from '../components/consultation/ConsultationDetail';
import { CarteBiometrie, CarteContexte } from './CartesInformations';
import { useDossierComplet, type NouvelleConsultation } from './useDossierComplet';
import type { ConsultationResume } from '@/modules/medecin/espace/useDossierPatient';
import { OngletDocuments, OngletHospitalisation } from '@/modules/document';
import './dossierPatient.css';

type Onglet = 'general' | 'consultations' | 'documents' | 'hospitalisation';
const ONGLETS: Onglet[] = ['general', 'consultations', 'documents', 'hospitalisation'];

const numero = (id: number) => `#${String(id).padStart(4, '0')}`;
const dateLongue = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : '';
const dateCourte = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('fr-FR') : '');

const TYPES_SUGGERES = ['Consultation de contrôle', 'Première consultation', 'Urgence', 'Suivi', 'Soins', 'Bilan'];

/**
 * Page du dossier médical d'un patient (médecin) : bandeau d'identité, informations générales éditables
 * et historique des consultations. Le détail d'une consultation (analyses, ordonnances, imagerie) s'ouvre
 * dans une fenêtre. Affichage uniquement : la logique est dans useDossierComplet.
 */
function DossierPatient() {
  const { patientId } = useParams();
  const id = Number(patientId);
  const navigate = useNavigate();
  const d = useDossierComplet(id);
  const [parametres, setParametres] = useSearchParams();
  const demande = parametres.get('onglet') as Onglet | null;
  const [onglet, setOngletBrut] = useState<Onglet>(demande && ONGLETS.includes(demande) ? demande : 'general');
  const setOnglet = (o: Onglet) => {
    setOngletBrut(o);
    setParametres(o === 'general' ? {} : { onglet: o }, { replace: true });
  };
  const [nouvelleOuverte, setNouvelleOuverte] = useState(false);
  const [detail, setDetail] = useState<ConsultationResume | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(''), 3000);
    return () => clearTimeout(t);
  }, [message]);

  const nom = d.identite ? `${d.identite.prenom} ${d.identite.nom}` : `Patient ${numero(id)}`;
  const initiales = d.identite ? `${d.identite.prenom[0] ?? ''}${d.identite.nom[0] ?? ''}`.toUpperCase() : '?';

  return (
    <main className="dm-page">
      <div className="dm-haut">
        <nav className="dm-fil" aria-label="Fil d'Ariane">
          <Link to="/medecin">Tableau de bord</Link>
          <LuChevronRight aria-hidden="true" />
          <Link to="/medecin">Patients</Link>
          <LuChevronRight aria-hidden="true" />
          <span>Dossier {numero(id)}</span>
        </nav>
        <button type="button" className="dm-retour" onClick={() => navigate('/medecin')}>
          <LuArrowLeft aria-hidden="true" /> Retour aux patients
        </button>
      </div>

      {d.erreur ? (
        <div className="dm-erreur dm-erreur-page" role="alert">
          {d.erreur}
        </div>
      ) : d.chargement && !d.dossier ? (
        <p className="dm-vide">Chargement du dossier…</p>
      ) : (
        d.dossier && (
          <>
            {/* Bandeau d'identité */}
            <section className="dm-bandeau">
              <div className="dm-identite">
                <span className="dm-avatar">{initiales}</span>
                <div>
                  <div className="dm-titre">
                    <h1>{nom}</h1>
                    <span className="dm-numero">{numero(id)}</span>
                    {d.dossier.groupeSanguin && <span className="dm-badge-sang">Groupe {d.dossier.groupeSanguin}</span>}
                    {d.dossier.allergies && (
                      <span className="dm-badge-allergie">
                        <LuTriangleAlert aria-hidden="true" /> Allergie : {d.dossier.allergies}
                      </span>
                    )}
                  </div>
                  <div className="dm-infos">
                    {d.identite?.dateNaissance && (
                      <span>
                        <LuCake aria-hidden="true" /> Né(e) le {dateCourte(d.identite.dateNaissance)}
                        {d.age !== null ? ` (${d.age} ans)` : ''}
                      </span>
                    )}
                    {d.identite?.telephone && (
                      <span>
                        <LuPhone aria-hidden="true" /> {d.identite.telephone}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button type="button" className="dm-bouton-principal" onClick={() => setNouvelleOuverte(true)}>
                <LuPlus aria-hidden="true" /> Nouvelle consultation
              </button>
            </section>

            {/* Onglets */}
            <div className="dm-onglets" role="tablist">
              <button type="button" role="tab" aria-selected={onglet === 'general'} className={onglet === 'general' ? 'actif' : ''} onClick={() => setOnglet('general')}>
                <LuFileText aria-hidden="true" /> Informations générales
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={onglet === 'consultations'}
                className={onglet === 'consultations' ? 'actif' : ''}
                onClick={() => setOnglet('consultations')}
              >
                <LuClipboardList aria-hidden="true" /> Consultations <span className="dm-compteur">{d.consultations.length}</span>
              </button>
              <button type="button" role="tab" aria-selected={onglet === 'documents'} className={onglet === 'documents' ? 'actif' : ''} onClick={() => setOnglet('documents')}>
                <LuFiles aria-hidden="true" /> Documents
              </button>
              <button type="button" role="tab" aria-selected={onglet === 'hospitalisation'} className={onglet === 'hospitalisation' ? 'actif' : ''} onClick={() => setOnglet('hospitalisation')}>
                <LuBedDouble aria-hidden="true" /> Hospitalisation
              </button>
            </div>

            {onglet === 'documents' ? (
              <OngletDocuments patientId={id} nomPatient={nom} />
            ) : onglet === 'hospitalisation' ? (
              <OngletHospitalisation patientId={id} />
            ) : onglet === 'general' ? (
              <div className="dm-colonnes">
                <CarteBiometrie dossier={d.dossier} imc={d.imc} enregistrer={d.enregistrer} onMessage={setMessage} />
                <CarteContexte dossier={d.dossier} enregistrer={d.enregistrer} onMessage={setMessage} />
              </div>
            ) : (
              <section className="dm-carte">
                <header className="dm-carte-entete">
                  <div>
                    <h2>Historique des consultations</h2>
                    <p>Consultations réalisées dans vos services</p>
                  </div>
                  <button type="button" className="dm-bouton-clair" onClick={() => setNouvelleOuverte(true)}>
                    <LuPlus aria-hidden="true" /> Ajouter un compte rendu
                  </button>
                </header>
                {d.consultations.length === 0 ? (
                  <p className="dm-vide">Aucune consultation dans vos services pour ce patient.</p>
                ) : (
                  <div className="dm-consultations">
                    {d.consultations.map((c) => (
                      <article key={c.id} onClick={() => setDetail(c)}>
                        <div className="dm-consultation-entete">
                          <div>
                            <span className="dm-type">{c.type}</span>
                            <span className="dm-date">{dateLongue(c.dateCreation)}</span>
                            <BadgeService service={c.service} />
                          </div>
                          {c.nomMedecin && (
                            <span className="dm-praticien">
                              Praticien : <strong>Dr {c.nomMedecin}</strong>
                            </span>
                          )}
                        </div>
                        <p>{c.description}</p>
                        <span className="dm-lien">
                          <LuPill aria-hidden="true" /> Analyses, ordonnances et imagerie
                        </span>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            )}
          </>
        )
      )}

      <Modal isOpen={nouvelleOuverte} onClose={() => setNouvelleOuverte(false)} title="Nouvelle consultation" sousTitre={`Patient : ${nom} (${numero(id)})`}>
        {nouvelleOuverte && (
          <FormulaireConsultation
            onAnnuler={() => setNouvelleOuverte(false)}
            onEnvoyer={async (c) => {
              await d.ajouter(c);
              setNouvelleOuverte(false);
              setOnglet('consultations');
              setMessage('Consultation ajoutée au dossier médical.');
            }}
            messageErreur={d.messageErreur}
          />
        )}
      </Modal>

      <Modal isOpen={detail !== null} onClose={() => setDetail(null)} title={detail ? `Consultation : ${detail.type}` : ''} sousTitre={detail ? dateLongue(detail.dateCreation) : undefined} large>
        {detail && (
          <ConsultationDetail consultation={detail} patientId={id} onClose={() => setDetail(null)} onUpdate={d.rechargerConsultations} />
        )}
      </Modal>

      {message && (
        <div className="dm-toast" role="status">
          {message}
        </div>
      )}
    </main>
  );
}

/** Saisie d'une nouvelle consultation (type, compte rendu, ordonnance facultative). */
function FormulaireConsultation({
  onAnnuler,
  onEnvoyer,
  messageErreur,
}: {
  onAnnuler: () => void;
  onEnvoyer: (c: NouvelleConsultation) => Promise<void>;
  messageErreur: (err: unknown, defaut: string) => string;
}) {
  const [valeurs, setValeurs] = useState<NouvelleConsultation>({ type: '', description: '', ordonnance: '' });
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);

  const soumettre = async (e: FormEvent) => {
    e.preventDefault();
    if (!valeurs.type.trim() || !valeurs.description.trim()) {
      setErreur("Le type d'acte et le compte rendu sont obligatoires.");
      return;
    }
    setEnvoi(true);
    setErreur('');
    try {
      await onEnvoyer(valeurs);
    } catch (err) {
      setErreur(messageErreur(err, "La consultation n'a pas pu être enregistrée."));
      setEnvoi(false);
    }
  };

  return (
    <form className="dm-formulaire dm-formulaire-fenetre" onSubmit={soumettre} noValidate>
      {erreur && <div className="dm-erreur">{erreur}</div>}
      <label>
        Type d'acte *
        <input list="dm-types" value={valeurs.type} onChange={(e) => setValeurs({ ...valeurs, type: e.target.value })} placeholder="Ex. Consultation de contrôle" />
        <datalist id="dm-types">
          {TYPES_SUGGERES.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
      </label>
      <label>
        Diagnostic et acte réalisé *
        <textarea
          rows={4}
          value={valeurs.description}
          onChange={(e) => setValeurs({ ...valeurs, description: e.target.value })}
          placeholder="Observation clinique, soins effectués…"
        />
      </label>
      <label>
        Ordonnance / recommandations
        <input
          value={valeurs.ordonnance}
          onChange={(e) => setValeurs({ ...valeurs, ordonnance: e.target.value })}
          placeholder="Ex. Paracétamol 1 g si douleur"
        />
      </label>
      <div className="dm-formulaire-pied">
        <button type="button" className="dm-bouton-secondaire" onClick={onAnnuler}>
          Annuler
        </button>
        <button type="submit" className="dm-bouton-principal" disabled={envoi}>
          {envoi ? 'Enregistrement…' : 'Enregistrer la consultation'}
        </button>
      </div>
    </form>
  );
}

export default DossierPatient;
