import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { LuCircleCheck, LuCircleX, LuTriangleAlert } from 'react-icons/lu';
import { LogoHopital, useEtablissement } from '@/modules/etablissement';
import { verifierDocument } from '../api/documentService';
import type { Verification } from '../types';
import './verification.css';

/** Page publique ouverte par le QR code d'un document : authenticité, sans aucune donnée du patient. */
function VerificationDocument() {
  const { numero = '' } = useParams();
  const [parametres] = useSearchParams();
  const { identite } = useEtablissement();
  const [resultat, setResultat] = useState<Verification | null>(null);
  const [erreur, setErreur] = useState(false);

  useEffect(() => {
    verifierDocument(numero, parametres.get('e'))
      .then(setResultat)
      .catch(() => setErreur(true));
  }, [numero, parametres]);

  const authentique = resultat?.authentique;
  const rectifie = resultat?.statut === 'RECTIFIE';

  return (
    <main className="verif-page">
      <section className="verif-carte">
        <header>
          <LogoHopital taille={48} />
          <strong>{identite.nom}</strong>
        </header>
        <h1>Vérification d'un document</h1>
        {erreur ? (
          <p className="verif-info">Vérification impossible pour le moment. Réessayez plus tard.</p>
        ) : !resultat ? (
          <p className="verif-info">Vérification en cours…</p>
        ) : (
          <>
            <div className={`verif-resultat ${authentique ? (rectifie ? 'alerte' : 'ok') : 'ko'}`}>
              {authentique ? rectifie ? <LuTriangleAlert aria-hidden="true" /> : <LuCircleCheck aria-hidden="true" /> : <LuCircleX aria-hidden="true" />}
              <span>
                {!authentique
                  ? 'Document inconnu ou modifié : il ne correspond à aucun document signé par l’hôpital.'
                  : rectifie
                    ? `Document authentique, mais remplacé par une version rectifiée${resultat.remplacePar ? ` (${resultat.remplacePar})` : ''}.`
                    : 'Document authentique, signé par l’hôpital et non modifié.'}
              </span>
            </div>
            {authentique && (
              <dl className="verif-details">
                <dt>Numéro</dt>
                <dd>{resultat.numero}</dd>
                <dt>Type</dt>
                <dd>{resultat.type}</dd>
                <dt>Service</dt>
                <dd>{resultat.service}</dd>
                <dt>Validé le</dt>
                <dd>{resultat.dateValidation}</dd>
              </dl>
            )}
            <p className="verif-info">Pour protéger le secret médical, aucune information sur le patient n'est affichée.</p>
          </>
        )}
      </section>
    </main>
  );
}

export default VerificationDocument;
