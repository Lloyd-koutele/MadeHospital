import type { IconType } from 'react-icons';
import {
  LuBuilding2,
  LuCheck,
  LuCircleCheck,
  LuEye,
  LuEyeOff,
  LuIdCard,
  LuInfo,
  LuLock,
  LuMail,
  LuMicroscope,
  LuShieldCheck,
  LuStethoscope,
  LuUser,
} from 'react-icons/lu';
import { useFormulaireUtilisateur } from './useFormulaireUtilisateur';
import { ROLES_COMPTE, SUGGESTIONS, type RoleCompte } from './regles';
import ChampTelephone from '@/shared/ui/ChampTelephone';
import './formulaireUtilisateur.css';

const ICONES: Record<RoleCompte, IconType> = {
  ADMIN: LuShieldCheck,
  MEDECIN: LuStethoscope,
  CHERCHEUR: LuMicroscope,
};

type Props = {
  userId?: number | null;
  onAnnuler: () => void;
  onSucces: (message: string) => void;
};

/**
 * Formulaire de création / modification d'un utilisateur.
 * Affichage uniquement : la logique est dans useFormulaireUtilisateur, les règles dans regles.ts,
 * les styles dans formulaireUtilisateur.css (couleurs du thème).
 */
function FormulaireUtilisateur({ userId, onAnnuler, onSucces }: Props) {
  const f = useFormulaireUtilisateur({ userId, onSucces });
  const { valeurs: v, actions: a } = f;

  if (f.chargement) {
    return <p className="fu-chargement">Chargement de la fiche…</p>;
  }

  return (
    <form className="fu" onSubmit={f.soumettre} autoComplete="off" noValidate>
      <div className="fu-corps">
        {f.erreur && (
          <div className="fu-erreur" role="alert">
            {f.erreur}
          </div>
        )}

        {/* 1. Rôle */}
        <section className="fu-etape">
          <h3 className="fu-etape-titre">
            <span className="fu-numero">1</span> Rôle et niveau d'accès
            {f.modification && <span className="fu-note">Le rôle ne peut pas être modifié</span>}
          </h3>
          <div className="fu-roles" role="radiogroup" aria-label="Rôle">
            {ROLES_COMPTE.map(({ role, titre, description }) => {
              const Icone = ICONES[role];
              const choisi = v.role === role;
              return (
                <button
                  key={role}
                  type="button"
                  role="radio"
                  aria-checked={choisi}
                  disabled={f.modification && !choisi}
                  className={`fu-role fu-role-${role.toLowerCase()}${choisi ? ' choisi' : ''}`}
                  onClick={() => a.choisirRole(role)}
                >
                  <span className="fu-role-entete">
                    <span className="fu-role-icone">
                      <Icone aria-hidden="true" />
                    </span>
                    <span className="fu-coche">{choisi && <LuCheck aria-hidden="true" />}</span>
                  </span>
                  <span className="fu-role-titre">{titre}</span>
                  <span className="fu-role-description">{description}</span>
                </button>
              );
            })}
          </div>

          {/* Champs propres au rôle */}
          <div className="fu-contexte">
            {v.role === 'MEDECIN' && (
              <>
                <div className="fu-grille">
                  <Champ libelle="Spécialité" requis icone={LuStethoscope}>
                    <input
                      list="fu-suggestions"
                      value={v.specialite}
                      onChange={(e) => a.changer('specialite', e.target.value)}
                      placeholder="Ex. Cardiologie"
                    />
                  </Champ>
                  <Champ libelle="Numéro d'ordre" requis icone={LuIdCard}>
                    <input
                      value={v.numeroOrdre}
                      onChange={(e) => a.changer('numeroOrdre', e.target.value)}
                      placeholder="Ex. SN-12345"
                    />
                  </Champ>
                </div>
                <div className="fu-services">
                  <span className="fu-libelle">
                    <LuBuilding2 aria-hidden="true" /> Services de rattachement
                  </span>
                  {f.servicesActifs.length === 0 ? (
                    <p className="fu-aide">Aucun service créé. Créez-les dans l'onglet Services, puis rattachez-y ce médecin.</p>
                  ) : (
                    <div className="fu-puces">
                      {f.servicesActifs.map((s) => {
                        const choisi = v.serviceIds.includes(s.id);
                        return (
                          <button
                            key={s.id}
                            type="button"
                            aria-pressed={choisi}
                            className={`fu-puce${choisi ? ' choisie' : ''}`}
                            onClick={() => a.basculerService(s.id)}
                          >
                            {choisi && <LuCheck aria-hidden="true" />}
                            <strong>{s.code}</strong> {s.nom}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  <p className="fu-aide">Le médecin ne consultera que les dossiers des services sélectionnés.</p>
                </div>
              </>
            )}
            {v.role === 'CHERCHEUR' && (
              <Champ libelle="Unité de recherche / domaine" requis icone={LuMicroscope}>
                <input
                  list="fu-suggestions"
                  value={v.specialiteRecherche}
                  onChange={(e) => a.changer('specialiteRecherche', e.target.value)}
                  placeholder="Ex. Épidémiologie et santé publique"
                />
              </Champ>
            )}
            {v.role === 'ADMIN' && (
              <Champ libelle="Périmètre d'administration" requis icone={LuBuilding2}>
                <input
                  list="fu-suggestions"
                  value={v.departement}
                  onChange={(e) => a.changer('departement', e.target.value)}
                  placeholder="Ex. Administration centrale"
                />
              </Champ>
            )}
            <datalist id="fu-suggestions">
              {SUGGESTIONS[v.role].map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>
        </section>

        {/* 2. Identité */}
        <section className="fu-etape">
          <h3 className="fu-etape-titre">
            <span className="fu-numero">2</span> Identité et coordonnées
          </h3>
          <div className="fu-grille">
            <Champ libelle="Nom" requis icone={LuUser}>
              <input value={v.nom} onChange={(e) => a.changer('nom', e.target.value)} placeholder="Ex. Diop" />
            </Champ>
            <Champ libelle="Prénom" requis icone={LuUser}>
              <input value={v.prenom} onChange={(e) => a.changer('prenom', e.target.value)} placeholder="Ex. Aminata" />
            </Champ>
            <Champ
              libelle="Adresse email"
              requis
              icone={LuMail}
            >
              <input
                type="email"
                autoComplete="off"
                value={v.email}
                onChange={(e) => a.changer('email', e.target.value)}
                placeholder="aminata.diop@madehospital.sn"
              />
            </Champ>
            <div className="fu-champ">
              <label className="fu-libelle" htmlFor="fu-telephone">
                Téléphone mobile <span className="fu-requis">*</span>
              </label>
              <ChampTelephone
                id="fu-telephone"
                pays={v.paysTelephone}
                numero={v.telephone}
                onPays={a.changerPaysTelephone}
                onNumero={a.changerTelephone}
              />
            </div>
          </div>
        </section>

        {/* 3. Sécurité */}
        <section className="fu-etape">
          <h3 className="fu-etape-titre">
            <span className="fu-numero">3</span> {f.modification ? 'Réinitialiser le mot de passe' : 'Sécurité et accès initial'}
          </h3>
          <label className="fu-champ">
            <span className="fu-libelle">
              {f.modification ? 'Nouveau mot de passe (laisser vide pour le conserver)' : 'Mot de passe provisoire'}
              {!f.modification && <span className="fu-requis"> *</span>}
            </span>
            <span className="fu-saisie fu-saisie-mdp">
              <LuLock className="fu-saisie-icone" aria-hidden="true" />
              <input
                type={f.motDePasseVisible ? 'text' : 'password'}
                autoComplete="new-password"
                value={v.password}
                onChange={(e) => a.changer('password', e.target.value)}
                placeholder="6 caractères minimum"
              />
              <button type="button" className="fu-oeil" onClick={a.basculerVisibilite}>
                {f.motDePasseVisible ? <LuEyeOff aria-hidden="true" /> : <LuEye aria-hidden="true" />}
                {f.motDePasseVisible ? 'Masquer' : 'Afficher'}
              </button>
            </span>
          </label>
          <div className={`fu-jauge niveau-${f.robustesse.niveau}`}>
            <div className="fu-jauge-barres">
              {[1, 2, 3, 4].map((i) => (
                <span key={i} className={i <= f.robustesse.score ? 'pleine' : ''} />
              ))}
            </div>
            <div className="fu-jauge-legende">
              <span className="fu-jauge-libelle">{f.robustesse.libelle}</span>
              <span>Minimum : 6 caractères</span>
            </div>
          </div>
        </section>
      </div>

      <footer className="fu-pied">
        <span className="fu-pied-info">
          <LuInfo aria-hidden="true" /> Les champs marqués <span className="fu-requis">*</span> sont obligatoires.
        </span>
        <div className="fu-pied-actions">
          <button type="button" className="fu-bouton-secondaire" onClick={onAnnuler}>
            Annuler
          </button>
          <button type="submit" className="fu-bouton-principal" disabled={f.envoi}>
            <LuCircleCheck aria-hidden="true" />
            {f.envoi ? 'Enregistrement…' : f.modification ? 'Enregistrer les modifications' : "Créer l'utilisateur"}
          </button>
        </div>
      </footer>
    </form>
  );
}

/** Champ avec libellé et icône à gauche. */
function Champ({
  libelle,
  requis,
  icone: Icone,
  children,
}: {
  libelle: string;
  requis?: boolean;
  icone: IconType;
  children: React.ReactNode;
}) {
  return (
    <label className="fu-champ">
      <span className="fu-libelle">
        <span>
          {libelle} {requis && <span className="fu-requis">*</span>}
        </span>
      </span>
      <span className="fu-saisie">
        <Icone className="fu-saisie-icone" aria-hidden="true" />
        {children}
      </span>
    </label>
  );
}

export default FormulaireUtilisateur;
