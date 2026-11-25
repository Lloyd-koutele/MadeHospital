import React from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import Navbar from './Navbar';
import Accueil from './accueil/Accueil';
import AdminDashboard from '@/modules/utilisateur/pages/AdminDashboard';
import EspaceMedecin from '@/modules/medecin/espace/EspaceMedecin';
import ChercheurDashboard from '@/modules/utilisateur/pages/ChercheurDashboard';
import PatientDashboard from '@/modules/patient/pages/PatientDashboard';
import GestionAcces from '@/modules/autorisation/pages/GestionAcces';
import MesRendezVous from '@/modules/rendez-vous/pages/MesRendezVous';
import Login from '@/modules/auth/pages/Login';
import { isAuthenticated, getUserRole } from '@/modules/auth/api/authService';
import MonDossier from '@/modules/dossier-medical/dossier/MonDossier';
import DossierPatient from '@/modules/dossier-medical/dossier/DossierPatient';
import PlanningRendezVous from '@/modules/rendez-vous/planning/PlanningRendezVous';
import { AssistantIdentite, GardeIdentite } from '@/modules/etablissement';
import {
  EditeurDocument,
  EditeurModele,
  GestionModeles,
  VerificationDocument,
} from '@/modules/document';


// Composant de protection des routes
function PrivateRoute({ children, requiredRole = null }) {
  console.log('PrivateRoute - Vérification de l\'authentification');
  console.log('isAuthenticated() =', isAuthenticated());
  console.log('Token actuel =', localStorage.getItem('token'));
  console.log('Rôle actuel =', localStorage.getItem('userRole'));
  
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  
  // Si un rôle spécifique est requis, vérifier que l'utilisateur a ce rôle
  if (requiredRole && getUserRole() !== requiredRole) {
    // Rediriger vers la page d'accueil du rôle actuel de l'utilisateur
    const currentRole = getUserRole().toLowerCase();
    return <Navigate to={`/${currentRole}`} replace />;
  }
  
  // L'utilisateur est authentifié et a le bon rôle
  return children;
}

// Définition du routeur
const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <Accueil />
    ),
  },
  {
    path: '/login',
    element: (
      <Login />
    ),
  },
  {
    path: '/chercheur',
    element: (
      <div className="App">
        <Navbar />
        <PrivateRoute requiredRole="CHERCHEUR">
          <ChercheurDashboard />
        </PrivateRoute>
      </div>
    ),
  },
  {
    path: '/admin',
    element: (
      <div className="App">
        <Navbar />
        <PrivateRoute requiredRole="ADMIN">
          <GardeIdentite>
            <AdminDashboard />
          </GardeIdentite>
        </PrivateRoute>
      </div>
    ),
  },
  {
    path: '/admin/identite',
    element: (
      <div className="App">
        <Navbar />
        <PrivateRoute requiredRole="ADMIN">
          <AssistantIdentite />
        </PrivateRoute>
      </div>
    ),
  },

  {
    path: '/medecin',
    element: (
      <div className="App">
        <Navbar />
        <PrivateRoute requiredRole="MEDECIN">
          <EspaceMedecin />
        </PrivateRoute>
      </div>
    ),
  },
  {
    path: '/patient',
    element: (
      <div className="App">
        <Navbar />
        <PrivateRoute requiredRole="PATIENT">
          <PatientDashboard />
        </PrivateRoute>
      </div>
    ),
  },
  {
    path: '/patient/dossier',
    element: (
      <div className="App">
        <Navbar />
        <PrivateRoute requiredRole="PATIENT">
          <MonDossier />
        </PrivateRoute>
      </div>
    ),
  },
  // les consultations et les documents du patient font désormais partie de son dossier médical
  {
    path: '/patient/consultations',
    element: <Navigate to="/patient/dossier?onglet=consultations" replace />,
  },
  {
    path: '/patient/acces',
    element: (
      <div className="App">
        <Navbar />
        <PrivateRoute requiredRole="PATIENT">
          <GestionAcces />
        </PrivateRoute>
      </div>
    ),
  },
  {
    path: '/patient/rendez-vous',
    element: (
      <div className="App">
        <Navbar />
        <PrivateRoute requiredRole="PATIENT">
          <MesRendezVous />
        </PrivateRoute>
      </div>
    ),
  },
  {
    path: '/medecin/rendez-vous',
    element: (
      <div className="App">
        <Navbar />
        <PrivateRoute requiredRole="MEDECIN">
          <PlanningRendezVous />
        </PrivateRoute>
      </div>
    ),
  },
  {
    path: '/medecin/documents/:id',
    element: (
      <div className="App">
        <Navbar />
        <PrivateRoute requiredRole="MEDECIN">
          <EditeurDocument />
        </PrivateRoute>
      </div>
    ),
  },
  {
    path: '/medecin/modeles',
    element: (
      <div className="App">
        <Navbar />
        <PrivateRoute requiredRole="MEDECIN">
          <GestionModeles />
        </PrivateRoute>
      </div>
    ),
  },
  {
    path: '/medecin/modeles/:id',
    element: (
      <div className="App">
        <Navbar />
        <PrivateRoute requiredRole="MEDECIN">
          <EditeurModele />
        </PrivateRoute>
      </div>
    ),
  },
  {
    path: '/patient/documents',
    element: <Navigate to="/patient/dossier?onglet=documents" replace />,
  },
  {
    path: '/verifier/:numero',
    element: <VerificationDocument />,
  },
  {
    path: '/dossier-medical/:patientId',
    element: (
      <div className="App">
        <Navbar />
        <PrivateRoute requiredRole="MEDECIN">
          <DossierPatient />
        </PrivateRoute>
      </div>
    ),
  },
]);

function App() {
  return (
    <RouterProvider router={router} />
  );
}

export default App;
