#!/bin/sh
# Génère le certificat HTTPS local (mkcert) attendu par Traefik pour APP_DOMAIN et orthanc.APP_DOMAIN.
# Prérequis : mkcert installé, et "mkcert -install" exécuté une fois sur la machine.
set -eu
cd "$(dirname "$0")/.."
DOMAINE=$(grep '^APP_DOMAIN=' .env | cut -d= -f2)
mkdir -p traefik/certs
mkcert -cert-file "traefik/certs/${DOMAINE}.pem" -key-file "traefik/certs/${DOMAINE}-key.pem" \
    "${DOMAINE}" "orthanc.${DOMAINE}"
echo "Certificat créé dans traefik/certs/ pour ${DOMAINE} et orthanc.${DOMAINE}"
