import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  LuArrowLeft,
  LuBedDouble,
  LuCake,
  LuClipboardList,
  LuEye,
  LuFiles,
  LuFileText,
  LuFlaskConical,
  LuImage,
  LuPhone,
  LuPill,
  LuTriangleAlert,
} from 'react-icons/lu';
import Modal from '@/shared/ui/Modal';
import { BadgeService } from '@/modules/service-hospitalier';
import { MesDocuments, MesSejours } from '@/modules/document';
import { CarteBiometrie, CarteContexte } from './CartesInformations';
import { useMonDossier, type ConsultationPatient } from './useMonDossier';
import './dossierPatient.css';
import './monDossier.css';

type Onglet = 'general' | 'consultations' | 'documents' | 'hospitalisation';
const ONGLETS: Onglet[] = ['general', 'consultations', 'documents', 'hospitalisation'];

const numero = (id: number) => `P-${String(id).padStart(6, '0')}`;
const dateLongue = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : '';
const dateCourte = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('fr-FR') : '');

/**
 * Dossier médical vu par le patient : même présentation que chez le médecin (identité, informations,
 * consultations, documents, hospitalisations), en lecture seule.
 */
function MonDossier() {
  const d = useMonDossier();
  const [parametres, setParametres] = useSearchParams();
  const demande = parametres.get('onglet') as Onglet | null;
  const [onglet, setOngletBrut] = useState<Onglet>(demande && ONGLETS.includes(demande) ? demande : 'general');
  const setOnglet = (o: Onglet) => {
    setOngletBrut(o);
    setParametres(o === 'general' ? {} : { onglet: o }, { replace: true });
  };
  const [detail, setDetail] = useState<ConsultationPatient | null>(null);

  const nom = d.identite ? `${d.identite.prenom} ${d.identite.nom}` : 'Mon dossier';
  const initiales = d.identite ? `${d.identite.prenom[0] ?? ''}${d.identite.nom[0] ?? ''}`.toUpperCase() : '?';

  return (
    <main className="dm-page">
      <div className="dm-haut">
        <Link to="/patient" className="dm-retour">
          <LuArrowLeft aria-hidden="true" /> Tableau de bord
        </Link>
        <span className="md-lecture">
          <LuEye aria-hidden="true" /> Lecture seule
        </span>
      </div>

      {d.erreur ? (
        <div className="dm-erreur dm-erreur-page" role="alert">{d.erreur}</div>
      ) : d.chargement && !d.dossier ? (
        <p className="dm-vide">Chargement du dossier…</p>
      ) : (
        d.dossier && (
          <>
            <section className="dm-bandeau">
              <div className="dm-identite">
                <span className="dm-avatar">{initiales}</span>
                <div>
                  <div className="dm-titre">
                    <h1>{nom}</h1>
                    {d.identite && <span className="dm-numero">{numero(d.identite.patientId)}</span>}
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
            </section>

            <div className="dm-onglets" role="tablist">
              <button type="button" role="tab" aria-selected={onglet === 'general'} className={onglet === 'general' ? 'actif' : ''} onClick={() => setOnglet('general')}>
                <LuFileText aria-hidden="true" /> Informations générales
              </button>
              <button type="button" role="tab" aria-selected={onglet === 'consultations'} className={onglet === 'consultations' ? 'actif' : ''} onClick={() => setOnglet('consultations')}>
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
              <MesDocuments />
            ) : onglet === 'hospitalisation' ? (
              <MesSejours />
            ) : onglet === 'general' ? (
              <div className="dm-colonnes">
                <CarteBiometrie dossier={d.dossier} imc={d.imc} />
                <CarteContexte dossier={d.dossier} />
              </div>
            ) : (
              <section className="dm-carte">
                <header className="dm-carte-entete">
                  <div>
                    <h2>Historique des consultations</h2>
                    <p>Consultations enregistrées dans votre dossier</p>
                  </div>
                </header>
                {d.consultations.length === 0 ? (
                  <p className="dm-vide">Aucune consultation dans votre dossier.</p>
                ) : (
                  <div className="dm-consultations">
                    {d.consultations.map((c) => (
                      <article key={c.id} onClick={() => setDetail(c)}>
                        <div className="dm-consultation-entete">
                          <div>
                            <span className="dm-type">{c.type}</span>
                            <span className="dm-date">{dateLongue(c.dateCreation)}</span>
                            {c.service && <BadgeService service={c.service} />}
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

      <Modal
        isOpen={detail !== null}
        onClose={() => setDetail(null)}
        title={detail ? `Consultation : ${detail.type}` : ''}
        sousTitre={detail ? dateLongue(detail.dateCreation) : undefined}
        large
      >
        {detail && <DetailConsultation consultation={detail} />}
      </Modal>
    </main>
  );
}

/** Détail d'une consultation en lecture seule : compte rendu, ordonnances, analyses et imagerie. */
function DetailConsultation({ consultation: c }: { consultation: ConsultationPatient }) {
  const ordonnances = c.ordonnances ?? [];
  const analyses = c.analyses ?? [];
  const images = c.images ?? [];
  return (
    <div className="md-detail">
      {c.description && (
        <section>
          <h3><LuFileText aria-hidden="true" /> Compte rendu</h3>
          <p className="dm-boite">{c.description}</p>
        </section>
      )}
      <section>
        <h3><LuPill aria-hidden="true" /> Ordonnances</h3>
        {ordonnances.length === 0 ? (
          <p className="md-aucun">Aucune ordonnance.</p>
        ) : (
          <ul className="md-liste">
            {ordonnances.map((o) => (
              <li key={o.id}>
                <strong>{o.medicaments}</strong>
                {o.posologie && o.posologie !== 'Aucune' && <span>Posologie : {o.posologie}</span>}
                {o.instructions && o.instructions !== 'Aucune' && <span>Instructions : {o.instructions}</span>}
                <small>{dateCourte(o.date)}{o.nomMedecin ? ` · Dr ${o.nomMedecin}` : ''}</small>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <h3><LuFlaskConical aria-hidden="true" /> Analyses</h3>
        {analyses.length === 0 ? (
          <p className="md-aucun">Aucune analyse.</p>
        ) : (
          <ul className="md-liste">
            {analyses.map((a) => (
              <li key={a.id}>
                <strong>{a.typeAnalyse}</strong>
                {a.resultat && <span>Résultat : {a.resultat}</span>}
                <small>{dateCourte(a.dateAnalyse)}{a.laboratoire ? ` · ${a.laboratoire}` : ''}</small>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <h3><LuImage aria-hidden="true" /> Imagerie</h3>
        {images.length === 0 ? (
          <p className="md-aucun">Aucune image.</p>
        ) : (
          <ul className="md-liste">
            {images.map((i) => (
              <li key={i.id}>
                <strong>{i.typeImage}</strong>
                {i.description && <span>{i.description}</span>}
                <small>{dateCourte(i.date)}</small>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default MonDossier;
