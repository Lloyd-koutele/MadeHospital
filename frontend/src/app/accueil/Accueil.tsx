import { Link } from 'react-router-dom';
import { LogoHopital, useEtablissement } from '@/modules/etablissement';
import {
  FaCalendarCheck,
  FaFileMedical,
  FaFlask,
  FaLock,
  FaUserInjured,
  FaUserMd,
  FaUserShield,
  FaXRay,
  FaMicroscope,
} from 'react-icons/fa';
import type { IconType } from 'react-icons';
import { isAuthenticated, getUserRole, espaceDuRole } from '@/modules/auth/api/authService';
import './accueil.css';

type Fonctionnalite = { icone: IconType; titre: string; texte: string; examen?: boolean };

const FONCTIONNALITES: Fonctionnalite[] = [
  {
    icone: FaFileMedical,
    titre: 'Dossier médical',
    texte: 'Informations générales, consultations, ordonnances et historique du patient au même endroit.',
  },
  {
    icone: FaFlask,
    titre: "Résultats d'examens",
    texte: "Bulletins d'analyses rattachés à chaque consultation, consultables par le médecin et le patient.",
    examen: true,
  },
  {
    icone: FaXRay,
    titre: 'Imagerie médicale',
    texte: 'Images standard et DICOM, stockées sur le serveur Orthanc et visualisées dans le navigateur.',
  },
  {
    icone: FaCalendarCheck,
    titre: 'Rendez-vous',
    texte: 'Prise de rendez-vous avec vérification des disponibilités, report, confirmation et annulation.',
  },
  {
    icone: FaLock,
    titre: 'Accès contrôlés',
    texte: "Le patient et son médecin référent décident qui peut consulter le dossier, et pour combien de temps.",
  },
];

const PROFILS = [
  { icone: FaUserMd, titre: 'Médecin', texte: 'Suit ses patients, rédige consultations, ordonnances et analyses, gère son agenda.' },
  { icone: FaUserInjured, titre: 'Patient', texte: 'Consulte son dossier, ses résultats et ses rendez-vous, et gère les accès.' },
  { icone: FaUserShield, titre: 'Administrateur', texte: 'Crée et gère les comptes des médecins, chercheurs et administrateurs.' },
  { icone: FaMicroscope, titre: 'Chercheur', texte: 'Accède aux espaces dédiés à la recherche selon ses autorisations.' },
];

function Accueil() {
  const { identite } = useEtablissement();
  const connecte = isAuthenticated();
  const espace = connecte ? espaceDuRole(getUserRole()) : '/login';

  return (
    <div className="accueil">
      <header className="accueil-barre">
        <div className="accueil-conteneur accueil-barre-contenu">
          <span className="accueil-logo">
            <LogoHopital taille={34} surFondSombre /> {identite.nom}
          </span>
          <Link to={espace} className="accueil-bouton accueil-bouton-clair">
            {connecte ? 'Mon espace' : 'Se connecter'}
          </Link>
        </div>
      </header>

      <section className="accueil-hero">
        <div className="accueil-conteneur">
          <p className="accueil-surtitre">Système d'information hospitalier</p>
          <h1>Le dossier patient, les examens et les rendez-vous réunis en un seul outil</h1>
          <p className="accueil-intro">
            MadeHospital accompagne médecins, patients et équipes administratives au quotidien :
            un dossier médical partagé et sécurisé, des résultats accessibles au bon moment
            et une imagerie médicale consultable directement dans le navigateur.
          </p>
          <div className="accueil-actions">
            <Link to={espace} className="accueil-bouton accueil-bouton-principal">
              {connecte ? 'Accéder à mon espace' : 'Se connecter'}
            </Link>
            <a href="#fonctionnalites" className="accueil-bouton accueil-bouton-contour">
              Découvrir les fonctionnalités
            </a>
          </div>
        </div>
      </section>

      <section id="fonctionnalites" className="accueil-section">
        <div className="accueil-conteneur">
          <h2>Fonctionnalités</h2>
          <div className="accueil-grille">
            {FONCTIONNALITES.map(({ icone: Icone, titre, texte, examen }) => (
              <article key={titre} className={`accueil-carte${examen ? ' bulletin-examen' : ''}`}>
                <span className={`accueil-icone${examen ? ' accueil-icone-examen' : ''}`}>
                  <Icone aria-hidden="true" />
                </span>
                <h3>{titre}</h3>
                <p>{texte}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="accueil-section accueil-section-alt">
        <div className="accueil-conteneur">
          <h2>Un espace pour chaque profil</h2>
          <div className="accueil-grille accueil-grille-4">
            {PROFILS.map(({ icone: Icone, titre, texte }) => (
              <article key={titre} className="accueil-carte accueil-carte-profil">
                <span className="accueil-icone">
                  <Icone aria-hidden="true" />
                </span>
                <h3>{titre}</h3>
                <p>{texte}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer className="accueil-pied">
        <div className="accueil-conteneur">
          © {new Date().getFullYear()} MadeHospital — Système de gestion hospitalière
        </div>
      </footer>
    </div>
  );
}

export default Accueil;
