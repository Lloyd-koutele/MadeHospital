import { useState, type FormEvent } from 'react';
import { LogoHopital, useEtablissement } from '@/modules/etablissement';
import { Link, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaEnvelope, FaEye, FaEyeSlash, FaLock } from 'react-icons/fa';
import { espaceDuRole, loginUser } from '../api/authService';
import './login.css';

/**
 * Page de connexion : email et mot de passe uniquement.
 * Le rôle est déterminé par le serveur à partir du compte.
 */
function Login() {
  const { identite } = useEtablissement();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [enCours, setEnCours] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Veuillez saisir votre email et votre mot de passe.');
      return;
    }
    setError('');
    setEnCours(true);
    try {
      const role = await loginUser(email.trim(), password);
      navigate(espaceDuRole(role), { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connexion impossible.');
      setEnCours(false);
    }
  };

  return (
    <div className="connexion">
      <div className="connexion-decor" aria-hidden="true">
        <span className="connexion-halo connexion-halo-1" />
        <span className="connexion-halo connexion-halo-2" />
        <svg className="connexion-ecg" viewBox="0 0 1200 120" preserveAspectRatio="none">
          <path d="M0 60 H380 L410 60 L430 20 L455 105 L480 40 L500 60 H700 L725 60 L745 30 L765 90 L785 60 H1200" />
        </svg>
      </div>

      <Link to="/" className="connexion-retour">
        <FaArrowLeft aria-hidden="true" /> Retour à l'accueil
      </Link>

      <main className="connexion-carte">
        <div className="connexion-marque">
          <LogoHopital taille={40} /> {identite.nom}
        </div>
        <h1 className="connexion-titre">Connexion</h1>
        <p className="connexion-sous-titre">Accédez à votre espace sécurisé</p>

        {error && (
          <div className="connexion-erreur" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <label className="connexion-champ">
            <span className="visually-hidden">Email</span>
            <input
              type="email"
              autoComplete="username"
              placeholder="Adresse email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <FaEnvelope className="connexion-icone" aria-hidden="true" />
          </label>

          <label className="connexion-champ">
            <span className="visually-hidden">Mot de passe</span>
            <input
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="connexion-icone connexion-oeil"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            >
              {password ? (showPassword ? <FaEyeSlash /> : <FaEye />) : <FaLock />}
            </button>
          </label>

          <button type="submit" className="connexion-bouton" disabled={enCours}>
            {enCours ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>

        <p className="connexion-pied">
          Pas encore de compte ? Il est créé par l'administration de votre établissement.
        </p>
      </main>
    </div>
  );
}

export default Login;
