import { useEffect, useMemo, useState } from 'react';
import {
  LuBuilding2,
  LuChevronRight,
  LuMicroscope,
  LuRotateCcw,
  LuScrollText,
  LuSearch,
  LuShieldCheck,
  LuStethoscope,
  LuUserPen,
  LuUserPlus,
  LuImage,
  LuUsers,
  LuUserX,
  LuX,
} from 'react-icons/lu';
import type { IconType } from 'react-icons';
import { Link } from 'react-router-dom';
import { getAllUsers, updateUserStatus } from '../api/adminService';
import FormulaireUtilisateur from '../formulaire/FormulaireUtilisateur';
import UserTable, { type Utilisateur } from '../components/UserTable';
import Modal from '@/shared/ui/Modal';
import ServicesPanel from '@/modules/service-hospitalier/components/ServicesPanel';
import JournalAuditPanel from '@/modules/audit/components/JournalAuditPanel';
import { listerServices, type ServiceHospitalier } from '@/modules/service-hospitalier/api/serviceHospitalierService';
import './admin.css';

type Filtre = 'TOUS' | 'ADMIN' | 'MEDECIN' | 'CHERCHEUR' | 'PATIENT' | 'BLOQUES';
type Section = 'utilisateurs' | 'services' | 'audit';

const SECTIONS: Record<Section, { titre: string; fil: string; description: string }> = {
  utilisateurs: {
    fil: 'Utilisateurs',
    titre: 'Gestion des utilisateurs',
    description: 'Gérez les accès, rôles et statuts du personnel hospitalier, des chercheurs et des patients.',
  },
  services: {
    fil: 'Services',
    titre: "Services de l'hôpital",
    description: 'Créez les services et affectez-y les médecins : chacun ne consulte que les dossiers de ses services.',
  },
  audit: {
    fil: "Journal d'audit",
    titre: "Journal d'audit",
    description: 'Toutes les actions sensibles, chaînées et signées : toute modification ou suppression est détectée.',
  },
};

const ONGLETS: { cle: Filtre; libelle: string }[] = [
  { cle: 'TOUS', libelle: 'Tous' },
  { cle: 'ADMIN', libelle: 'Administrateurs' },
  { cle: 'MEDECIN', libelle: 'Médecins' },
  { cle: 'CHERCHEUR', libelle: 'Chercheurs' },
  { cle: 'PATIENT', libelle: 'Patients' },
  { cle: 'BLOQUES', libelle: 'Bloqués' },
];

const correspond = (u: Utilisateur, filtre: Filtre) =>
  filtre === 'TOUS' ? true : filtre === 'BLOQUES' ? !u.actif : u.roles === filtre;

/** Indicateur chiffré en tête de page. */
function Indicateur({ libelle, valeur, icone: Icone, classe }: { libelle: string; valeur: number; icone: IconType; classe: string }) {
  return (
    <div className="admin-kpi">
      <div>
        <p className="admin-kpi-libelle">{libelle}</p>
        <p className={`admin-kpi-valeur ${classe}`}>{valeur}</p>
      </div>
      <span className={`admin-kpi-icone ${classe}`}>
        <Icone aria-hidden="true" />
      </span>
    </div>
  );
}

function AdminDashboard() {
  const [section, setSection] = useState<Section>('utilisateurs');
  const [users, setUsers] = useState<Utilisateur[]>([]);
  const [filtre, setFiltre] = useState<Filtre>('TOUS');
  const [recherche, setRecherche] = useState('');
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  /** null : fenêtre fermée ; 'nouveau' : création ; nombre : modification de cet utilisateur */
  const [edition, setEdition] = useState<'nouveau' | number | null>(null);
  const [services, setServices] = useState<ServiceHospitalier[]>([]);
  const [actionEnCours, setActionEnCours] = useState<number | null>(null);
  const [message, setMessage] = useState('');

  const charger = async () => {
    setChargement(true);
    setErreur('');
    try {
      const [data, listeServices] = await Promise.all([getAllUsers(), listerServices().catch(() => [])]);
      setUsers(Array.isArray(data) ? data : []);
      setServices(listeServices);
    } catch {
      setErreur('Impossible de récupérer les utilisateurs.');
      setUsers([]);
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    charger();
  }, []);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(''), 3200);
    return () => clearTimeout(t);
  }, [message]);

  const servicesParMedecin = useMemo(() => {
    const carte = new Map<number, string[]>();
    services.forEach((s) =>
      (s.medecinIds ?? []).forEach((id) => carte.set(id, [...(carte.get(id) ?? []), s.nom])),
    );
    return carte;
  }, [services]);

  const compte = (f: Filtre) => users.filter((u) => correspond(u, f)).length;

  const affiches = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return users.filter((u) => {
      if (!correspond(u, filtre)) return false;
      if (!q) return true;
      return [u.nom, u.prenom, `${u.prenom} ${u.nom}`, u.email, u.telephone, u.roles, String(u.id)]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [users, filtre, recherche]);

  const basculerStatut = async (userId: number) => {
    const cible = users.find((u) => u.id === userId);
    if (!cible || actionEnCours !== null) return;
    setActionEnCours(userId);
    try {
      await updateUserStatus(userId, !cible.actif);
      await charger();
      setMessage(cible.actif ? `Le compte de ${cible.prenom} ${cible.nom} est bloqué.` : `Le compte de ${cible.prenom} ${cible.nom} est de nouveau actif.`);
    } catch {
      setErreur("Le statut de l'utilisateur n'a pas pu être modifié.");
    } finally {
      setActionEnCours(null);
    }
  };

  const reinitialiser = () => {
    setRecherche('');
    setFiltre('TOUS');
  };

  return (
    <main className="admin-page">
      <div className="admin-entete">
        <div>
          <nav className="admin-fil" aria-label="Fil d'Ariane">
            <span>Administration</span>
            <LuChevronRight aria-hidden="true" />
            <strong>{SECTIONS[section].fil}</strong>
          </nav>
          <h1>{SECTIONS[section].titre}</h1>
          <p>{SECTIONS[section].description}</p>
        </div>
        <div className="admin-entete-actions">
          <Link to="/admin/identite" className="admin-bouton-secondaire">
            <LuImage aria-hidden="true" /> Identité de l'hôpital
          </Link>
          {section === 'utilisateurs' && (
            <button type="button" className="admin-bouton-principal" onClick={() => setEdition('nouveau')}>
              <LuUserPlus aria-hidden="true" /> Créer un utilisateur
            </button>
          )}
        </div>
      </div>

      <div className="admin-sections" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={section === 'utilisateurs'}
          className={section === 'utilisateurs' ? 'actif' : ''}
          onClick={() => setSection('utilisateurs')}
        >
          <LuUsers aria-hidden="true" /> Utilisateurs
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={section === 'services'}
          className={section === 'services' ? 'actif' : ''}
          onClick={() => setSection('services')}
        >
          <LuBuilding2 aria-hidden="true" /> Services
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={section === 'audit'}
          className={section === 'audit' ? 'actif' : ''}
          onClick={() => setSection('audit')}
        >
          <LuScrollText aria-hidden="true" /> Journal d'audit
        </button>
      </div>

      {section === 'audit' ? (
        <JournalAuditPanel />
      ) : section === 'services' ? (
        <ServicesPanel />
      ) : (
        <>
          <div className="admin-kpis">
            <Indicateur libelle="Total utilisateurs" valeur={users.length} icone={LuUsers} classe="kpi-neutre" />
            <Indicateur libelle="Administrateurs" valeur={compte('ADMIN')} icone={LuShieldCheck} classe="role-admin" />
            <Indicateur libelle="Médecins" valeur={compte('MEDECIN')} icone={LuStethoscope} classe="role-medecin" />
            <Indicateur libelle="Chercheurs" valeur={compte('CHERCHEUR')} icone={LuMicroscope} classe="role-chercheur" />
          </div>

          <section className="admin-carte">
            <div className="admin-outils">
              <div className="admin-onglets" role="tablist" aria-label="Filtrer par rôle">
                {ONGLETS.map(({ cle, libelle }) => (
                  <button
                    key={cle}
                    type="button"
                    role="tab"
                    aria-selected={filtre === cle}
                    className={filtre === cle ? 'actif' : ''}
                    onClick={() => setFiltre(cle)}
                  >
                    {libelle}
                    <span className="admin-compteur">{compte(cle)}</span>
                  </button>
                ))}
              </div>

              <div className="admin-recherche-zone">
                <div className="admin-recherche">
                  <LuSearch aria-hidden="true" className="admin-recherche-icone" />
                  <input
                    type="search"
                    value={recherche}
                    onChange={(e) => setRecherche(e.target.value)}
                    placeholder="Rechercher par nom, email, rôle…"
                    aria-label="Rechercher un utilisateur"
                  />
                  {recherche && (
                    <button type="button" className="admin-effacer" onClick={() => setRecherche('')} aria-label="Effacer la recherche">
                      <LuX />
                    </button>
                  )}
                </div>
                <button type="button" className="admin-bouton-secondaire" onClick={reinitialiser}>
                  <LuRotateCcw aria-hidden="true" /> <span>Réinitialiser</span>
                </button>
              </div>
            </div>

            {erreur && (
              <div className="admin-erreur" role="alert">
                {erreur}
              </div>
            )}

            {chargement ? (
              <div className="admin-etat">Chargement des utilisateurs…</div>
            ) : affiches.length === 0 ? (
              <div className="admin-etat">
                <span className="admin-etat-icone">
                  <LuUserX aria-hidden="true" />
                </span>
                <h3>Aucun utilisateur trouvé</h3>
                <p>Aucun compte ne correspond à vos critères. Modifiez les filtres ou la recherche.</p>
                <button type="button" className="admin-lien" onClick={reinitialiser}>
                  Afficher tous les utilisateurs
                </button>
              </div>
            ) : (
              <UserTable
                users={affiches}
                servicesParMedecin={servicesParMedecin}
                onAction={basculerStatut}
                onModifier={(id) => setEdition(id)}
                actionEnCours={actionEnCours}
              />
            )}

            <footer className="admin-pied">
              <span className="admin-point admin-point-primaire" />
              Affichage de <strong>{affiches.length}</strong> utilisateur(s) sur un total de <strong>{users.length}</strong>
            </footer>
          </section>
        </>
      )}

      <Modal
        isOpen={edition !== null}
        onClose={() => setEdition(null)}
        large
        icone={edition === 'nouveau' ? <LuUserPlus /> : <LuUserPen />}
        title={edition === 'nouveau' ? 'Créer un nouvel utilisateur' : "Modifier l'utilisateur"}
        sousTitre={
          edition === 'nouveau'
            ? "Attribuez un rôle, renseignez l'identité et configurez l'accès au portail."
            : 'Mettez à jour l\'identité, les coordonnées, le rattachement et, si besoin, le mot de passe.'
        }
      >
        {edition !== null && (
          <FormulaireUtilisateur
            key={String(edition)}
            userId={edition === 'nouveau' ? null : edition}
            onAnnuler={() => setEdition(null)}
            onSucces={(texte) => {
              setEdition(null);
              setMessage(texte);
              charger();
            }}
          />
        )}
      </Modal>

      {message && (
        <div className="admin-toast" role="status">
          {message}
        </div>
      )}
    </main>
  );
}

export default AdminDashboard;
