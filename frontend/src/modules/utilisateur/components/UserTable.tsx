import { memo } from 'react';
import {
  LuBan,
  LuLockOpen,
  LuMail,
  LuMicroscope,
  LuPencil,
  LuPhone,
  LuShieldCheck,
  LuStethoscope,
  LuUser,
} from 'react-icons/lu';
import type { IconType } from 'react-icons';

export type Utilisateur = {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  roles: 'ADMIN' | 'MEDECIN' | 'CHERCHEUR' | 'PATIENT';
  actif: boolean;
  departement?: string;
  specialite?: string;
  specialiteRecherche?: string;
};

export const ROLES: Record<Utilisateur['roles'], { libelle: string; icone: IconType; classe: string }> = {
  ADMIN: { libelle: 'Administrateur', icone: LuShieldCheck, classe: 'role-admin' },
  MEDECIN: { libelle: 'Médecin', icone: LuStethoscope, classe: 'role-medecin' },
  CHERCHEUR: { libelle: 'Chercheur', icone: LuMicroscope, classe: 'role-chercheur' },
  PATIENT: { libelle: 'Patient', icone: LuUser, classe: 'role-patient' },
};

type Props = {
  users: Utilisateur[];
  /** Services de chaque médecin (id du médecin → noms des services) */
  servicesParMedecin: Map<number, string[]>;
  onAction: (userId: number) => void;
  onModifier: (userId: number) => void;
  actionEnCours: number | null;
};

/** Affectation affichée sous le rôle : services d'un médecin, département, domaine de recherche. */
const affectation = (u: Utilisateur, servicesParMedecin: Map<number, string[]>) => {
  if (u.roles === 'MEDECIN') {
    const services = servicesParMedecin.get(u.id) ?? [];
    return services.length > 0 ? services.join(' · ') : 'Aucun service';
  }
  if (u.roles === 'ADMIN') return u.departement;
  if (u.roles === 'CHERCHEUR') return u.specialiteRecherche;
  return null;
};

const initiales = (u: Utilisateur) => `${u.prenom?.[0] ?? ''}${u.nom?.[0] ?? ''}`.toUpperCase() || '?';

/** Tableau des utilisateurs de la page d'administration. */
const UserTable = memo(({ users, servicesParMedecin, onAction, onModifier, actionEnCours }: Props) => (
  <div className="admin-tableau-defilement">
    <table className="admin-tableau">
      <thead>
        <tr>
          <th>Utilisateur</th>
          <th>Contact</th>
          <th>Rôle et affectation</th>
          <th>Statut</th>
          <th className="admin-col-actions">Actions</th>
        </tr>
      </thead>
      <tbody>
        {users.map((u) => {
          const role = ROLES[u.roles] ?? ROLES.PATIENT;
          const Icone = role.icone;
          const enCours = actionEnCours === u.id;
          const detail = affectation(u, servicesParMedecin);
          return (
            <tr key={u.id} className={u.actif ? '' : 'admin-ligne-bloquee'}>
              <td>
                <div className="admin-utilisateur">
                  <span className={`admin-avatar ${role.classe}`}>{initiales(u)}</span>
                  <div>
                    <div className="admin-nom">
                      {u.prenom} {u.nom}
                    </div>
                    <div className="admin-identifiant">#{String(u.id).padStart(4, '0')}</div>
                  </div>
                </div>
              </td>
              <td>
                <div className="admin-contact">
                  <span>
                    <LuMail aria-hidden="true" /> {u.email}
                  </span>
                  {u.telephone && (
                    <span className="admin-contact-secondaire">
                      <LuPhone aria-hidden="true" /> {u.telephone}
                    </span>
                  )}
                </div>
              </td>
              <td>
                <span className={`admin-badge-role ${role.classe}`}>
                  <Icone aria-hidden="true" /> {role.libelle}
                </span>
                {detail && (
                  <div className={`admin-affectation${u.roles === 'MEDECIN' && detail === 'Aucun service' ? ' vide' : ''}`}>
                    {detail}
                  </div>
                )}
              </td>
              <td>
                <span className={`admin-badge-statut ${u.actif ? 'actif' : 'bloque'}`}>
                  <span className="admin-point" />
                  {u.actif ? 'Actif' : 'Bloqué'}
                </span>
              </td>
              <td className="admin-col-actions">
                {u.roles !== 'PATIENT' && (
                  <button
                    type="button"
                    className="admin-bouton-icone"
                    onClick={() => onModifier(u.id)}
                    title={`Modifier ${u.prenom} ${u.nom}`}
                    aria-label={`Modifier ${u.prenom} ${u.nom}`}
                  >
                    <LuPencil aria-hidden="true" />
                  </button>
                )}
                <button
                  type="button"
                  className={`admin-bouton-statut ${u.actif ? 'bloquer' : 'debloquer'}`}
                  onClick={() => onAction(u.id)}
                  disabled={actionEnCours !== null}
                >
                  {u.actif ? <LuBan aria-hidden="true" /> : <LuLockOpen aria-hidden="true" />}
                  {enCours ? 'Traitement…' : u.actif ? 'Bloquer' : 'Débloquer'}
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
));

UserTable.displayName = 'UserTable';

export default UserTable;
