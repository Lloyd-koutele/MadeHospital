import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import type { IconType } from 'react-icons';
import {
  LuCalendarDays,
  LuFolderHeart,
  LuKeyRound,
  LuLayoutDashboard,
  LuLogOut,
  LuMicroscope,
  LuUsers,
} from 'react-icons/lu';
import {
  getCurrentUserInfo,
  getCurrentUserRole,
  isAuthenticated,
  logout,
  type Role,
  type UserInfo,
} from '@/modules/auth/api/authService';
import { ClocheNotifications } from '@/modules/notification';
import { LogoHopital, useEtablissement } from '@/modules/etablissement';
import { useServicesMedecin } from '@/modules/service-hospitalier';
import { SelecteurService } from '@/modules/service-hospitalier';
import './navbar.css';

type Lien = { to: string; label: string; icone: IconType; exact?: boolean };

const LIENS: Record<Role, Lien[]> = {
  ADMIN: [{ to: '/admin', label: 'Administration', icone: LuUsers }],
  MEDECIN: [
    { to: '/medecin', label: 'Tableau de bord', icone: LuLayoutDashboard, exact: true },
    { to: '/medecin/rendez-vous', label: 'Rendez-vous', icone: LuCalendarDays },
  ],
  PATIENT: [
    { to: '/patient', label: 'Tableau de bord', icone: LuLayoutDashboard, exact: true },
    { to: '/patient/dossier', label: 'Mon dossier', icone: LuFolderHeart },
    { to: '/patient/rendez-vous', label: 'Mes rendez-vous', icone: LuCalendarDays },
    { to: '/patient/acces', label: 'Gestion des accès', icone: LuKeyRound },
  ],
  CHERCHEUR: [{ to: '/chercheur', label: 'Espace recherche', icone: LuMicroscope }],
};

const LIBELLE_ROLE: Record<Role, string> = {
  ADMIN: 'Administrateur',
  MEDECIN: 'Médecin',
  PATIENT: 'Patient',
  CHERCHEUR: 'Chercheur',
};

const initiales = (email?: string) => {
  const local = (email ?? '').split('@')[0].replace(/[^a-zA-Z]/g, '');
  return (local.slice(0, 2) || '?').toUpperCase();
};

/** Pour un médecin chef : « Chef de service — Cardiologie » (plusieurs services séparés par une virgule). */
function TitreChef() {
  const { services } = useServicesMedecin();
  const diriges = services.filter((s) => s.chef).map((s) => s.nom);
  if (diriges.length === 0) return null;
  return (
    <>
      <span className="barre-nav-point">•</span>
      <span className="barre-nav-chef">Chef de service — {diriges.join(', ')}</span>
    </>
  );
}

function Navbar() {
  const { identite } = useEtablissement();
  const navigate = useNavigate();
  const [connecte, setConnecte] = useState(isAuthenticated());
  const [role, setRole] = useState<Role | null>(getCurrentUserRole());
  const [info, setInfo] = useState<UserInfo | null>(getCurrentUserInfo());

  useEffect(() => {
    const verifier = () => {
      const ok = isAuthenticated();
      setConnecte(ok);
      setRole(ok ? getCurrentUserRole() : null);
      setInfo(ok ? getCurrentUserInfo() : null);
    };
    verifier();
    const intervalle = setInterval(verifier, 300000);
    return () => clearInterval(intervalle);
  }, []);

  const seDeconnecter = async () => {
    await logout();
    setConnecte(false);
    navigate('/');
  };

  if (!connecte || !role) {
    return null;
  }

  const identifiant = info?.email?.split('@')[0] ?? 'utilisateur';

  return (
    <header className="barre-nav">
      <div className="barre-nav-contenu">
        <NavLink to="/" className="barre-nav-logo">
          <LogoHopital taille={38} surFondSombre />
          <span className="barre-nav-logo-texte">
            <strong>{identite.nom}</strong>
            <small>Portail santé</small>
          </span>
        </NavLink>

        <nav className="barre-nav-liens" aria-label="Navigation principale">
          {LIENS[role].map(({ to, label, icone: Icone, exact }) => (
            <NavLink key={to} to={to} end={exact} className={({ isActive }) => `barre-nav-lien${isActive ? ' actif' : ''}`}>
              <Icone aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="barre-nav-droite">
          {role === 'MEDECIN' && <SelecteurService />}
          <ClocheNotifications />
          <div className="barre-nav-profil" title={info?.email}>
            <span className="barre-nav-avatar">{initiales(info?.email)}</span>
            <span className="barre-nav-profil-texte">
              <span className="barre-nav-role">{LIBELLE_ROLE[role]}</span>
              {role === 'MEDECIN' && <TitreChef />}
              <span className="barre-nav-point">•</span>
              <span>{identifiant}</span>
            </span>
          </div>
          <button type="button" className="barre-nav-deconnexion" onClick={seDeconnecter}>
            <LuLogOut aria-hidden="true" />
            <span>Déconnexion</span>
          </button>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
