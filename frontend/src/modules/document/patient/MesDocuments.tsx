import { useEffect, useState } from 'react';
import { LuFileDown, LuShieldCheck } from 'react-icons/lu';
import { mesDocuments, messageErreur, pdfPatient } from '../api/documentService';
import { dateCourte, iconeType, LIBELLES_STATUTS } from '../regles';
import type { DocumentResume } from '../types';
import '../saisie/saisie.css';
import '../galerie/galerie.css';

/**
 * Documents validés du patient (comptes rendus, ordonnances, résultats…), téléchargeables en PDF.
 * Affiché dans l'onglet « Documents » de son dossier médical, en lecture seule.
 */
function MesDocuments() {
  const [documents, setDocuments] = useState<DocumentResume[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');

  useEffect(() => {
    mesDocuments()
      .then(setDocuments)
      .catch((e) => setErreur(messageErreur(e, 'Documents indisponibles.')))
      .finally(() => setChargement(false));
  }, []);

  const pdf = async (id: string) => {
    try {
      await pdfPatient(id);
    } catch (e) {
      setErreur(messageErreur(e, 'PDF indisponible.'));
    }
  };

  return (
    <section className="dm-carte">
      <header className="dm-carte-entete">
        <div>
          <h2>Mes documents</h2>
          <p>
            <LuShieldCheck aria-hidden="true" /> Chaque document est signé par l'hôpital ; son QR code permet d'en vérifier
            l'authenticité.
          </p>
        </div>
      </header>
      {erreur && <div className="saisie-erreur" role="alert">{erreur}</div>}
      {chargement ? (
        <p className="dm-vide">Chargement…</p>
      ) : documents.length === 0 ? (
        <p className="dm-vide">Aucun document pour le moment.</p>
      ) : (
        <ul className="docs-liste">
          {documents.map((d) => {
            const Icone = iconeType(d.type);
            return (
              <li key={d.id} className={d.type === 'RESULTAT_EXAMEN' ? 'examen' : ''}>
                <button type="button" className="docs-ouvrir" onClick={() => pdf(d.id)}>
                  <span className="galerie-icone"><Icone aria-hidden="true" /></span>
                  <span className="docs-texte">
                    <strong>{d.titre}</strong>
                    <small>
                      {d.numero ?? ''} · {dateCourte(d.dateValidation ?? d.dateCreation)}
                      {d.auteurNom ? ` · ${d.auteurNom}` : ''}
                      {d.serviceNom ? ` · ${d.serviceNom}` : ''}
                    </small>
                  </span>
                  <span className={`saisie-statut statut-${d.statut.toLowerCase()}`}>{LIBELLES_STATUTS[d.statut]}</span>
                </button>
                <button type="button" className="saisie-icone" aria-label={`Télécharger ${d.titre}`} onClick={() => pdf(d.id)}>
                  <LuFileDown />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export default MesDocuments;
