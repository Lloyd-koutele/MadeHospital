import React, { useEffect } from 'react';
import './modal.css';

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  /** Texte d'accompagnement sous le titre */
  sousTitre?: string;
  /** Icône affichée à gauche du titre */
  icone?: React.ReactNode;
  /** Fenêtre large (formulaires en plusieurs colonnes) */
  large?: boolean;
  children?: React.ReactNode;
};

const Modal = ({ isOpen, onClose, title, sousTitre, icone, large, children }: ModalProps) => {
  // Empêcher le défilement du corps lorsque la modale est ouverte
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    
    // Nettoyage au démontage
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  // Gérer la touche Escape pour fermer la modale
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
    }

    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Arrêter la propagation des clics sur le contenu de la modale
  const handleContentClick = (e) => {
    e.stopPropagation();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal-container${large ? ' modal-large' : ''}`} onClick={handleContentClick} role="dialog" aria-modal="true">
        <div className="modal-header-nav">
          {icone && <span className="modal-icone">{icone}</span>}
          <div className="modal-titres">
            <h2 className="modal-title">{title}</h2>
            {sousTitre && <p className="modal-sous-titre">{sousTitre}</p>}
          </div>
          <button type="button" className="modal-close-button" onClick={onClose} aria-label="Fermer la fenêtre">
            &times;
          </button>
        </div>
        <div className="modal-content">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
