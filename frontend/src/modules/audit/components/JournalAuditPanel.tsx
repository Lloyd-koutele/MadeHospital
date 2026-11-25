import { useState } from 'react';
import {
  LuChevronLeft,
  LuChevronRight,
  LuDownload,
  LuRefreshCw,
  LuRotateCcw,
  LuShieldAlert,
  LuShieldCheck,
} from 'react-icons/lu';
import { useJournalAudit } from '../useJournalAudit';
import type { EntreeAudit } from '../api/auditService';
import './journalAudit.css';

const LIBELLES_RESULTAT: Record<EntreeAudit['resultat'], string> = {
  SUCCES: 'Succès',
  REFUS: 'Refusé',
  ECHEC: 'Échec',
};

const dateHeure = (iso: string) =>
  new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

const court = (empreinte: string) => `${empreinte.slice(0, 10)}…`;

/**
 * Journal d'audit (administrateurs) : état de la chaîne, filtres, liste paginée, détail d'une entrée, export CSV.
 * Affichage uniquement : la logique est dans useJournalAudit.
 */
function JournalAuditPanel() {
  const j = useJournalAudit();
  const [ouverte, setOuverte] = useState<number | null>(null);
  const f = j.filtres;

  return (
    <section className="ja">
      {/* État de la chaîne */}
      <div className={`ja-etat ${j.verification ? (j.verification.integre ? 'integre' : 'rompue') : ''}`}>
        <span className="ja-etat-icone">
          {j.verification && !j.verification.integre ? <LuShieldAlert aria-hidden="true" /> : <LuShieldCheck aria-hidden="true" />}
        </span>
        <div className="ja-etat-texte">
          {j.verificationEnCours || !j.verification ? (
            <strong>Vérification de la chaîne en cours…</strong>
          ) : j.verification.integre ? (
            <>
              <strong>Chaîne intègre</strong>
              <span>
                {j.verification.entreesVerifiees} entrée(s) vérifiée(s) : empreintes, chaînage et signatures Ed25519 valides.
              </span>
            </>
          ) : (
            <>
              <strong>Rupture détectée à l'entrée n° {j.verification.sequenceRupture}</strong>
              <span>{j.verification.raison}</span>
            </>
          )}
        </div>
        <button type="button" className="ja-bouton" onClick={j.verifier} disabled={j.verificationEnCours}>
          <LuRefreshCw aria-hidden="true" /> Revérifier
        </button>
      </div>

      <div className="ja-carte">
        {/* Filtres */}
        <div className="ja-filtres">
          <label>
            Auteur
            <input
              value={f.acteur ?? ''}
              onChange={(e) => j.changerFiltre('acteur', e.target.value)}
              placeholder="Email"
            />
          </label>
          <label>
            Action
            <select value={f.action ?? ''} onChange={(e) => j.changerFiltre('action', e.target.value)}>
              <option value="">Toutes</option>
              {j.actions.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </label>
          <label>
            Patient n°
            <input
              inputMode="numeric"
              value={f.patientId ?? ''}
              onChange={(e) => j.changerFiltre('patientId', e.target.value.replace(/\D/g, ''))}
              placeholder="Ex. 12"
            />
          </label>
          <label>
            Résultat
            <select value={f.resultat ?? ''} onChange={(e) => j.changerFiltre('resultat', e.target.value as typeof f.resultat)}>
              <option value="">Tous</option>
              <option value="SUCCES">Succès</option>
              <option value="REFUS">Refusé</option>
              <option value="ECHEC">Échec</option>
            </select>
          </label>
          <label>
            Du
            <input type="date" value={f.du ?? ''} onChange={(e) => j.changerFiltre('du', e.target.value)} />
          </label>
          <label>
            Au
            <input type="date" value={f.au ?? ''} onChange={(e) => j.changerFiltre('au', e.target.value)} />
          </label>
          <div className="ja-filtres-actions">
            <button type="button" className="ja-bouton" onClick={j.reinitialiser}>
              <LuRotateCcw aria-hidden="true" /> Réinitialiser
            </button>
            <button type="button" className="ja-bouton ja-bouton-principal" onClick={j.exporter}>
              <LuDownload aria-hidden="true" /> Exporter CSV
            </button>
          </div>
        </div>

        {j.erreur && (
          <div className="ja-erreur" role="alert">
            {j.erreur}
          </div>
        )}

        {/* Liste */}
        {j.chargement && !j.resultat ? (
          <p className="ja-vide">Chargement du journal…</p>
        ) : !j.resultat || j.resultat.entrees.length === 0 ? (
          <p className="ja-vide">Aucune entrée ne correspond à ces critères.</p>
        ) : (
          <div className="ja-defilement">
            <table className="ja-tableau">
              <thead>
                <tr>
                  <th>N°</th>
                  <th>Date et heure</th>
                  <th>Auteur</th>
                  <th>Action</th>
                  <th>Patient</th>
                  <th>Résultat</th>
                  <th>Empreinte</th>
                </tr>
              </thead>
              <tbody>
                {j.resultat.entrees.map((e) => (
                  <FragmentEntree
                    key={e.sequence}
                    entree={e}
                    ouverte={ouverte === e.sequence}
                    onBasculer={() => setOuverte(ouverte === e.sequence ? null : e.sequence)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {j.resultat && j.resultat.total > 0 && (
          <footer className="ja-pied">
            <span>
              {j.resultat.total} entrée(s) · page {j.resultat.page + 1} sur {Math.max(1, j.resultat.pages)}
            </span>
            <div className="ja-pagination">
              <button type="button" className="ja-bouton" disabled={j.page === 0} onClick={() => j.setPage(j.page - 1)} aria-label="Page précédente">
                <LuChevronLeft />
              </button>
              <button
                type="button"
                className="ja-bouton"
                disabled={j.page + 1 >= j.resultat.pages}
                onClick={() => j.setPage(j.page + 1)}
                aria-label="Page suivante"
              >
                <LuChevronRight />
              </button>
            </div>
          </footer>
        )}
      </div>
    </section>
  );
}

/** Ligne d'une entrée, et son détail technique dépliable (empreintes, signature, requête). */
function FragmentEntree({ entree: e, ouverte, onBasculer }: { entree: EntreeAudit; ouverte: boolean; onBasculer: () => void }) {
  return (
    <>
      <tr className={`ja-ligne${ouverte ? ' ouverte' : ''}`} onClick={onBasculer}>
        <td className="ja-mono">{e.sequence}</td>
        <td className="ja-nowrap">{dateHeure(e.horodatage)}</td>
        <td>
          <div>{e.acteurEmail}</div>
          {e.acteurRole && <div className="ja-discret">{e.acteurRole}</div>}
        </td>
        <td>
          <div>{e.libelle}</div>
          <div className="ja-discret ja-mono">{e.action}</div>
        </td>
        <td>{e.patientId != null ? `#${String(e.patientId).padStart(4, '0')}` : '—'}</td>
        <td>
          <span className={`ja-resultat ja-resultat-${e.resultat.toLowerCase()}`}>{LIBELLES_RESULTAT[e.resultat]}</span>
        </td>
        <td className="ja-mono ja-discret">{court(e.empreinte)}</td>
      </tr>
      {ouverte && (
        <tr className="ja-detail">
          <td colSpan={7}>
            <dl>
              <dt>Requête</dt>
              <dd className="ja-mono">
                {e.methodeHttp} {e.chemin} {e.codeHttp ? `→ ${e.codeHttp}` : ''}
              </dd>
              {e.ressourceId && (
                <>
                  <dt>Ressource</dt>
                  <dd className="ja-mono">{e.ressourceId}</dd>
                </>
              )}
              <dt>Adresse IP</dt>
              <dd className="ja-mono">{e.adresseIp || '—'}</dd>
              {e.details && (
                <>
                  <dt>Détails</dt>
                  <dd>{e.details}</dd>
                </>
              )}
              <dt>Empreinte précédente</dt>
              <dd className="ja-mono ja-cassure">{e.empreintePrecedente}</dd>
              <dt>Empreinte</dt>
              <dd className="ja-mono ja-cassure">{e.empreinte}</dd>
              <dt>Signature Ed25519</dt>
              <dd className="ja-mono ja-cassure">{e.signature}</dd>
            </dl>
          </td>
        </tr>
      )}
    </>
  );
}

export default JournalAuditPanel;
