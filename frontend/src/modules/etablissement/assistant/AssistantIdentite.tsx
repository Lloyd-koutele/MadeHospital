import { useRef, type PointerEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { LuCheck, LuImagePlus, LuShieldCheck, LuZoomIn, LuZoomOut } from 'react-icons/lu';
import type { FormeLogo } from '../api/etablissementService';
import { urlLogo } from '../api/etablissementService';
import { cadre, LIBELLES_FORMES, ZOOM_MAX, ZOOM_MIN } from './recadrage';
import { useAssistantIdentite } from './useAssistantIdentite';
import './assistant.css';

const FORMES: FormeLogo[] = ['RONDE', 'CARREE', 'RECTANGLE'];
const LOGO_DEFAUT = '/LogoMadeHospital.png';

/**
 * Identité de l'hôpital : obligatoire au premier démarrage (avant toute création de compte),
 * modifiable ensuite par l'administrateur.
 */
function AssistantIdentite() {
  const navigate = useNavigate();
  const a = useAssistantIdentite();
  const glisse = useRef<{ x: number; y: number } | null>(null);
  const premierDemarrage = a.identite !== null && !a.identite.configure;
  const c = cadre(a.forme);

  const apercuLogo = a.apercu ?? (a.identite && a.identite.configure && !a.identite.logoParDefaut ? urlLogo(a.identite.version) : LOGO_DEFAUT);

  const debut = (e: PointerEvent<HTMLDivElement>) => {
    if (!a.image) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    glisse.current = { x: e.clientX, y: e.clientY };
  };
  const mouvement = (e: PointerEvent<HTMLDivElement>) => {
    if (!glisse.current) return;
    a.deplacer(e.clientX - glisse.current.x, e.clientY - glisse.current.y);
    glisse.current = { x: e.clientX, y: e.clientY };
  };
  const fin = () => {
    glisse.current = null;
  };

  const valider = async (parDefaut: boolean) => {
    if (await a.enregistrer(parDefaut)) navigate('/admin', { replace: true });
  };

  if (!a.identite) {
    return <main className="ident-page"><p className="ident-info">Chargement…</p></main>;
  }

  return (
    <main className="ident-page">
      <section className="ident-carte">
        <header className="ident-entete">
          <span className="ident-icone"><LuShieldCheck aria-hidden="true" /></span>
          <div>
            <h1>{premierDemarrage ? 'Bienvenue : identité de l\'hôpital' : 'Identité de l\'hôpital'}</h1>
            <p>
              {premierDemarrage
                ? 'Avant de créer les comptes, indiquez le nom de l\'hôpital et son symbole. Ils apparaîtront en haut de chaque page et sur tous les documents.'
                : 'Le nom et le symbole apparaissent en haut de chaque page et sur tous les documents.'}
            </p>
          </div>
        </header>

        {a.erreur && <div className="ident-erreur" role="alert">{a.erreur}</div>}

        <div className="ident-grille">
          <div className="ident-colonne">
            <label className="ident-champ">
              <span>Nom de l'hôpital</span>
              <input value={a.nom} onChange={(e) => a.setNom(e.target.value)} maxLength={150} placeholder="Centre hospitalier de Dakar" />
            </label>

            <div className="ident-champ">
              <span>Forme du symbole</span>
              <div className="ident-formes" role="radiogroup" aria-label="Forme du symbole">
                {FORMES.map((f) => (
                  <button
                    key={f}
                    type="button"
                    role="radio"
                    aria-checked={a.forme === f}
                    className={a.forme === f ? 'actif' : ''}
                    onClick={() => a.changerForme(f)}
                  >
                    <span className={`ident-forme-icone forme-${f.toLowerCase()}`} aria-hidden="true" />
                    {LIBELLES_FORMES[f]}
                  </button>
                ))}
              </div>
            </div>

            <div className="ident-champ">
              <span>Symbole</span>
              <label className="ident-fichier">
                <LuImagePlus aria-hidden="true" />
                {a.image ? 'Choisir une autre image' : 'Choisir une image (PNG, JPEG)'}
                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => a.choisirFichier(e.target.files?.[0])} />
              </label>
            </div>

            {a.image && a.source && (
              <div className="ident-recadrage">
                <div
                  className={`ident-cadre forme-${a.forme.toLowerCase()}`}
                  style={{ width: c.l, height: c.h }}
                  onPointerDown={debut}
                  onPointerMove={mouvement}
                  onPointerUp={fin}
                  onPointerCancel={fin}
                  onWheel={(e) => a.setZoom(a.zoom - e.deltaY * 0.001)}
                >
                  <img
                    src={a.source}
                    alt=""
                    draggable={false}
                    style={{
                      width: a.image.naturalWidth * a.echelle,
                      height: a.image.naturalHeight * a.echelle,
                      transform: `translate(calc(-50% + ${a.position.x}px), calc(-50% + ${a.position.y}px))`,
                    }}
                  />
                </div>
                <div className="ident-zoom">
                  <LuZoomOut aria-hidden="true" />
                  <input
                    type="range"
                    min={ZOOM_MIN}
                    max={ZOOM_MAX}
                    step={0.01}
                    value={a.zoom}
                    onChange={(e) => a.setZoom(Number(e.target.value))}
                    aria-label="Zoom"
                  />
                  <LuZoomIn aria-hidden="true" />
                </div>
                <p className="ident-info">Faites glisser l'image pour la placer ; la molette ou le curseur règle le zoom.</p>
              </div>
            )}
          </div>

          <aside className="ident-colonne">
            <span className="ident-sous-titre">Aperçu</span>
            <div className="ident-apercu-barre">
              <span className={`ident-apercu-logo forme-${a.forme.toLowerCase()}`}>
                <img src={apercuLogo} alt="" />
              </span>
              <strong>{a.nom.trim() || 'Nom de l\'hôpital'}</strong>
            </div>
            <div className="ident-apercu-document">
              <div className="ident-apercu-doc-entete">
                <span className={`ident-apercu-logo grand forme-${a.forme.toLowerCase()}`}>
                  <img src={apercuLogo} alt="" />
                </span>
                <div>
                  <strong>{a.nom.trim() || 'Nom de l\'hôpital'}</strong>
                  <small>Service de cardiologie</small>
                </div>
              </div>
              <div className="ident-apercu-doc-titre">Compte rendu de consultation</div>
              <div className="ident-apercu-ligne" />
              <div className="ident-apercu-ligne courte" />
              <div className="ident-apercu-ligne" />
            </div>
            {!a.image && (
              <p className="ident-info">
                Sans image, le symbole par défaut du logiciel est utilisé. Vous pourrez le changer plus tard.
              </p>
            )}
          </aside>
        </div>

        <footer className="ident-actions">
          {!premierDemarrage && (
            <button type="button" className="ident-bouton secondaire" onClick={() => navigate('/admin')}>
              Annuler
            </button>
          )}
          <button type="button" className="ident-bouton secondaire" disabled={a.enregistrement} onClick={() => valider(true)}>
            Utiliser le symbole par défaut
          </button>
          <button type="button" className="ident-bouton" disabled={a.enregistrement} onClick={() => valider(false)}>
            <LuCheck aria-hidden="true" /> {a.enregistrement ? 'Enregistrement…' : 'Valider'}
          </button>
        </footer>
      </section>
    </main>
  );
}

export default AssistantIdentite;
