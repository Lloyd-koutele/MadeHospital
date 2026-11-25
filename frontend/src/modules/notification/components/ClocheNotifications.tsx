import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LuBell, LuCheckCheck } from 'react-icons/lu';
import { useNotifications } from '../hooks/useNotifications';
import { iconeDuType, libelleBadge, tempsRelatif } from '../regles';
import type { Notification } from '../api/notificationService';
import './cloche.css';

/** Cloche de la barre de navigation : badge des non lues et panneau déroulant. */
function ClocheNotifications() {
  const navigate = useNavigate();
  const { nonLues, notifications, suite, chargement, erreur, charger, chargerSuite, lire, toutLire } = useNotifications();
  const [ouvert, setOuvert] = useState(false);
  const conteneur = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ouvert) return undefined;
    charger(0);
    const clicExterieur = (e: MouseEvent) => {
      if (conteneur.current && !conteneur.current.contains(e.target as Node)) setOuvert(false);
    };
    const echap = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOuvert(false);
    };
    document.addEventListener('mousedown', clicExterieur);
    document.addEventListener('keydown', echap);
    return () => {
      document.removeEventListener('mousedown', clicExterieur);
      document.removeEventListener('keydown', echap);
    };
  }, [ouvert, charger]);

  const ouvrir = (notification: Notification) => {
    lire(notification);
    if (notification.lien) {
      setOuvert(false);
      navigate(notification.lien);
    }
  };

  return (
    <div className="cloche" ref={conteneur}>
      <button
        type="button"
        className="cloche-bouton"
        aria-label={nonLues > 0 ? `Notifications, ${nonLues} non lues` : 'Notifications'}
        aria-expanded={ouvert}
        onClick={() => setOuvert((o) => !o)}
      >
        <LuBell aria-hidden="true" />
        {nonLues > 0 && <span className="cloche-badge">{libelleBadge(nonLues)}</span>}
      </button>

      {ouvert && (
        <div className="cloche-panneau" role="dialog" aria-label="Notifications">
          <div className="cloche-entete">
            <strong>Notifications</strong>
            {nonLues > 0 && (
              <button type="button" className="cloche-tout-lire" onClick={toutLire}>
                <LuCheckCheck aria-hidden="true" />
                Tout marquer comme lu
              </button>
            )}
          </div>

          <ul className="cloche-liste">
            {notifications.map((n) => {
              const Icone = iconeDuType(n.type);
              return (
                <li key={n.id}>
                  <button
                    type="button"
                    className={`cloche-item priorite-${n.priorite.toLowerCase()}${n.lue ? '' : ' non-lue'}`}
                    onClick={() => ouvrir(n)}
                  >
                    <span className="cloche-item-icone"><Icone aria-hidden="true" /></span>
                    <span className="cloche-item-texte">
                      <span className="cloche-item-titre">{n.titre}</span>
                      <span className="cloche-item-message">{n.message}</span>
                      <span className="cloche-item-date">{tempsRelatif(n.dateCreation)}</span>
                    </span>
                    {!n.lue && <span className="cloche-item-point" aria-label="Non lue" />}
                  </button>
                </li>
              );
            })}
          </ul>

          {erreur && <p className="cloche-etat erreur">{erreur}</p>}
          {!erreur && !chargement && notifications.length === 0 && (
            <p className="cloche-etat">Aucune notification pour le moment.</p>
          )}
          {chargement && <p className="cloche-etat">Chargement…</p>}
          {suite && !chargement && (
            <button type="button" className="cloche-suite" onClick={chargerSuite}>
              Voir les plus anciennes
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default ClocheNotifications;
