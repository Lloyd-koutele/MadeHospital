# MadeHospital — Système de Gestion Hospitalière

Application de gestion hospitalière pour les administrateurs, les médecins (dont les chefs de service), les
patients et les chercheurs : dossiers médicaux, consultations, documents médicaux signés, hospitalisations,
imagerie, rendez-vous, notifications et journal d'audit.

## Table des matières
- [Architecture](#architecture)
- [Fonctionnalités](#fonctionnalités)
- [Technologies utilisées](#technologies-utilisées)
- [Lancement avec Docker](#lancement-avec-docker-recommandé)
- [Journal d'audit](#journal-daudit)
- [Développement sans Docker](#développement-sans-docker)
- [Guide d'utilisation](#guide-dutilisation)
- [Structure du projet](#structure-du-projet)
- [API REST](#api-rest)
- [Résolution de problèmes courants](#résolution-de-problèmes-courants)

## Architecture

Le dépôt contient deux applications indépendantes, chacune découpée en **modules par domaine métier**
(et non en couches techniques MVC), avec les mêmes noms de modules des deux côtés. Côté frontend, un module
s'importe uniquement par son `index.ts` (règle eslint `no-restricted-imports`).

| Module (backend / frontend) | Rôle |
|---|---|
| `commun` / `shared` | Réponses API, gestion des erreurs, configuration ; client HTTP, composants UI et utilitaires partagés |
| `securite` / `auth` | JWT, Spring Security, connexion |
| `utilisateur` | Comptes, rôles, administrateurs, chercheurs |
| `etablissement` | Identité de l'établissement (nom, coordonnées, logo) reprise sur les documents |
| `servicehospitalier` / `service-hospitalier` | Services de l'hôpital, médecins rattachés et chef de service |
| `medecin` | Médecins et leur tableau de bord |
| `patient` | Patients et leur espace personnel |
| `dossiermedical` / `dossier-medical` | Dossier médical, consultations, ordonnances, analyses |
| `document` | Modèles de documents, documents médicaux signés (PDF, QR code de vérification), séjours |
| `imagerie` | Images médicales (standard et DICOM via Orthanc) |
| `rendezvous` / `rendez-vous` | Rendez-vous |
| `autorisation` | Autorisations d'accès aux dossiers patients |
| `notification` | Notifications internes (sans aucune donnée médicale) |
| `audit` | Journal d'audit chaîné et signé |

En production, tout passe par **Traefik** (image maison, HTTPS) sur un seul domaine :
`/api` va au backend, le reste au frontend, et `orthanc.<domaine>` à l'interface d'Orthanc.

## Fonctionnalités

### Administration
- Création des comptes médecins, chercheurs et administrateurs ; activation et désactivation
- Services hospitaliers : création, rattachement des médecins, désignation du chef de service
- Identité de l'établissement et logo, repris dans l'en-tête des documents
- Consultation et vérification du journal d'audit

### Dossier médical (médecin)
- Création des patients et de leur dossier ; accès limité aux médecins autorisés
- Informations générales (biométrie, IMC, groupe sanguin, allergies, contexte médical)
- Consultations avec ordonnances, analyses et imagerie (DICOM et images standard)
- Hospitalisations : admission dans un service et sortie

### Documents médicaux
- **Modèles par service** : le chef de service crée et modifie les modèles de son service. Un enregistrement
  les rend immédiatement disponibles aux médecins du service, en créant une nouvelle version utilisée par les
  documents suivants. Il peut archiver ou supprimer un modèle (suppression seulement s'il n'a servi à aucun document).
- Un modèle est composé de sections contenant du texte fixe, des données remplies automatiquement
  (identité du patient, médecin, service…), des champs à saisir et des **zones de texte libre** sans titre
  (utiles pour une ordonnance, par exemple).
- Les médecins peuvent demander un nouveau modèle à leur chef de service ; le modèle intégré
  « Document libre » permet de rédiger sans modèle.
- **Rédaction** : le médecin remplit le document, l'enregistre (validation et signature en une étape) ou
  le rectifie ensuite. Le PDF porte un numéro unique et un QR code vérifiable publiquement.

### Espace patient (lecture seule)
- Tableau de bord : constantes, IMC, prochains rendez-vous, consultations récentes, accès accordés
- **Mon dossier** : même présentation que chez le médecin, sans modification possible, avec les onglets
  Informations générales, Consultations (compte rendu, ordonnances, analyses, imagerie), Documents (PDF)
  et Hospitalisation
- **Mes rendez-vous** : prochain rendez-vous, rendez-vous à venir (annulables) et historique
- **Gestion des accès** : liste des médecins autorisés et retrait d'un accès

### Rendez-vous
- Planification par le médecin ; confirmation, report, annulation, fin de consultation, absence
- Le patient consulte ses rendez-vous et peut annuler un rendez-vous à venir ; l'autre partie est notifiée

### Notifications
- Cloche de notifications pour chaque utilisateur (rendez-vous, documents disponibles, modèles publiés…)
- Les notifications ne contiennent jamais de donnée médicale : elles renvoient vers la page concernée

## Technologies utilisées

- **Backend** : Java 17, Spring Boot 3, Spring Security (JWT), Spring Data JPA, Gradle,
  OpenHTMLtoPDF (documents PDF), ZXing (QR codes)
- **Frontend** : React 18, TypeScript, Vite, React Router, React Bootstrap, React Icons, Axios, Cornerstone (DICOM)
- **Données** : PostgreSQL 16, Orthanc (serveur DICOM)
- **Infrastructure** : Docker Compose, Traefik v3 (HTTPS), Nginx

## Lancement avec Docker (recommandé)

Prérequis : Docker, et [mkcert](https://github.com/FiloSottile/mkcert) pour un HTTPS de confiance en local.

1. Créer le fichier `.env` à partir du modèle et remplacer les valeurs
   (dont `INITIAL_ADMIN_*`, le premier administrateur créé au démarrage, et `APP_URL_PUBLIQUE`,
   l'adresse imprimée dans le QR code des documents) :
   ```bash
   cp .env.example .env
   ```
2. Déclarer le domaine dans le fichier hosts de la machine (une seule fois) :
   ```bash
   echo "127.0.0.1       madehospital.sn orthanc.madehospital.sn" | sudo tee -a /etc/hosts
   ```
3. Générer le certificat local (une seule fois `mkcert -install` sur la machine) :
   ```bash
   ./scripts/generer-certificats.sh
   ```
4. Construire et lancer la pile (Traefik écoute sur les ports 80 et 443, qui doivent être libres) :
   ```bash
   docker compose up -d --build
   ```

Après une modification du code, reconstruire seulement ce qui a changé :
```bash
docker compose up -d --build backend frontend
```

| Adresse | Service |
|---|---|
| https://madehospital.sn | Application |
| https://madehospital.sn/swagger-ui.html | Documentation de l'API |
| https://orthanc.madehospital.sn | Interface Orthanc (identifiants `ORTHANC_*` du `.env`) |
| port 4242 (machine locale uniquement) | Réception DICOM d'Orthanc |

Volumes Docker : `postgres_data` (base), `orthanc_data` (DICOM), `images_medicales` (images standard)
et `audit_cles` (clé de signature du journal d'audit).

## Journal d'audit

Les actions sensibles sont inscrites automatiquement dans un journal **chaîné et signé**, visible uniquement
par les administrateurs (onglet « Journal d'audit ») : connexions, comptes, services, accès aux dossiers
(lectures comprises), consultations, ordonnances, analyses, imagerie, documents, autorisations, rendez-vous
et refus d'accès.

- Chaque entrée contient l'empreinte SHA-256 de la précédente et sa propre empreinte signée en Ed25519 :
  une modification, une suppression ou une insertion est détectée par la vérification
  (`GET /api/admin/audit/verification`, également exécutée chaque nuit).
- La table `journal_audit` est en ajout seul : PostgreSQL refuse tout `UPDATE` et `DELETE`.
- La clé de signature est générée au premier démarrage dans le volume Docker `audit_cles`.
  **Sauvegardez ce volume** ; la clé publique est disponible sur `GET /api/admin/audit/cle-publique`.

## Développement sans Docker

```bash
cd backend && ./gradlew bootRun        # API sur http://localhost:8080
cd frontend && npm install && npm run dev   # client sur http://localhost:5173
```

Le backend lit ses paramètres dans les variables d'environnement, ou dans un fichier `.env` placé dans
`backend/` ou à la racine (même format que `.env.example`, avec en plus `DB_URL`, `DB_USERNAME`,
`DB_PASSWORD` si la base n'est pas celle par défaut). Vite relaie `/api` vers `BACKEND_URL`
(`http://localhost:8080` par défaut).

Vérifications :
```bash
cd backend && ./gradlew test
cd frontend && npm run typecheck && npm run lint && npm run build
```

Les tests backend utilisent une base H2 en mémoire (profil de test).

## Guide d'utilisation

Accédez à https://madehospital.sn (ou http://localhost:5173 en développement) et connectez-vous.
Le premier administrateur est celui défini par `INITIAL_ADMIN_*` ; il crée ensuite les autres comptes et
les services.

#### Administrateur
- Créer les comptes médecins, chercheurs et administrateurs
- Créer les services, y rattacher les médecins et désigner les chefs de service
- Renseigner l'identité et le logo de l'établissement
- Consulter et vérifier le journal d'audit

#### Médecin
- Créer des patients et consulter les dossiers auxquels il a accès
- Saisir consultations, ordonnances, analyses et images médicales
- Rédiger et signer des documents à partir des modèles de son service
- Admettre un patient en hospitalisation et enregistrer sa sortie
- Planifier et suivre les rendez-vous

#### Chef de service
- Tout ce que fait un médecin
- Créer, modifier, archiver et supprimer les modèles de documents du service
- Traiter les demandes de modèles des médecins du service

#### Patient
- Consulter son dossier médical en lecture seule (consultations, documents PDF, hospitalisations)
- Voir ses rendez-vous et annuler un rendez-vous à venir
- Gérer les médecins autorisés à accéder à son dossier

## Structure du projet

```
MadeHospital/
├── backend/                       Spring Boot — package made.hospital
│   └── src/main/java/made/hospital/
│       ├── MadeHospitalApplication.java
│       └── <module>/              audit, autorisation, commun, document, dossiermedical,
│           ├── api/                 etablissement, imagerie, medecin, notification, patient,
│           │   └── dto/             rendezvous, securite, servicehospitalier, utilisateur
│           ├── application/       services (cas d'usage)
│           ├── domaine/           entités JPA
│           └── infra/             repositories, stockage, tâches planifiées
├── frontend/                      React + TypeScript
│   └── src/
│       ├── app/                   point d'entrée, routeur, barre de navigation
│       ├── shared/                client HTTP, composants UI, utilitaires
│       ├── types/                 déclarations globales
│       └── modules/<module>/      audit, auth, autorisation, document, dossier-medical,
│           └── index.ts             etablissement, imagerie, medecin, notification, patient,
│                                    rendez-vous, service-hospitalier, utilisateur
├── traefik/                       image Traefik maison (routage + HTTPS)
├── scripts/                       génération des certificats locaux
├── docker-compose.yml
└── .env.example
```

## API REST

La documentation complète et à jour est disponible sur `/swagger-ui.html`. Principales ressources :

### Authentification
- `POST /api/login` — connexion (renvoie le jeton JWT)
- `GET /api/moi` — utilisateur connecté
- `POST /api/logout` — déconnexion

### Administration
- `GET|POST /api/admin/medecins`, `/api/admin/chercheurs`, `/api/admin/admins` — comptes
- `GET /api/admin/users`, `PUT /api/admin/users/status` — utilisateurs et activation
- `GET|POST /api/admin/services`, `PUT /api/admin/services/{id}/medecins`, `PUT /api/admin/services/{id}/chef` — services
- `PUT /api/admin/etablissement` — identité de l'établissement (`GET /api/etablissement` en lecture)
- `GET /api/admin/audit`, `/api/admin/audit/verification`, `/api/admin/audit/export` — journal d'audit

### Médecin : patients et dossier médical
- `GET /api/medecin/patients`, `POST /api/medecin/create-patient`
- `GET|PUT /api/medecin/patients/{patientId}/dossier-medical`
- `GET|POST /api/medecin/patients/{patientId}/dossier-medical/consultations`
- `.../consultations/{consultationId}/ordonnances`, `/analyses`, `/images` — lecture et ajout

### Documents et hospitalisations
- `GET /api/medecin/modeles` — modèles disponibles pour le médecin
- `GET|POST /api/medecin/chef/modeles`, `PUT|DELETE /api/medecin/chef/modeles/{id}` — modèles du service (chef)
- `GET|POST /api/medecin/patients/{patientId}/documents` — documents d'un patient
- `POST /api/medecin/documents/{id}/valider`, `/rectifier` ; `GET /api/medecin/documents/{id}/pdf`
- `GET|POST /api/medecin/patients/{patientId}/sejours`, `POST /api/medecin/sejours/{id}/sortie`
- `GET /api/documents/verifier/{numero}` — vérification publique d'un document (QR code)

### Patient
- `GET /api/patient` — identité du patient connecté
- `GET /api/patient/mon-dossier-medical`, `/api/patient/mes-consultations`
- `GET /api/patient/mes-documents`, `/api/patient/mes-documents/{id}/pdf`, `/api/patient/mes-sejours`
- `GET /api/patient/mes-acces`

### Rendez-vous
- `GET|POST /api/rendez-vous` — rendez-vous du médecin (`/a-venir`, `/aujourd-hui`)
- `GET /api/rendez-vous/mes-rendez-vous` — rendez-vous du patient connecté
- `POST /api/rendez-vous/{id}/confirmer`, `/reporter`, `/annuler`, `/terminer`, `/absence`

### Autorisations et notifications
- `POST /api/autorisations/patients/{patientId}/accorder`, `DELETE /api/autorisations/acces/{autorisationId}`
- `GET /api/notifications`, `GET /api/notifications/compteur`, `PATCH /api/notifications/{id}/lue`, `POST /api/notifications/tout-lire`

## Résolution de problèmes courants

### Le site ne s'ouvre pas sur https://madehospital.sn
- Vérifiez la ligne du fichier `/etc/hosts` et que les ports 80 et 443 ne sont pas pris par un autre
  conteneur ou service (`docker ps`).
- Si le navigateur signale un certificat non fiable, relancez `mkcert -install` puis `./scripts/generer-certificats.sh`.

### La page affiche une ancienne version après un redéploiement
- Rechargez sans cache (Cmd + Maj + R / Ctrl + Maj + R).

### Un chef de service ne peut pas gérer les modèles
- Vérifiez dans l'administration qu'il est bien désigné chef du service concerné.

### Erreur lors du chargement des images DICOM
- Vérifiez que le conteneur `madehospital-orthanc` fonctionne et que les identifiants `ORTHANC_*` du `.env`
  sont ceux utilisés par le backend.

### Échec d'authentification
- Le jeton JWT a pu expirer : reconnectez-vous. Après un changement de `JWT_SECRET`, tous les jetons existants
  sont invalides.

---

© 2025 MadeHospital. Tous droits réservés.
