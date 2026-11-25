#!/bin/sh
# Génère /etc/traefik/dynamic/dynamic.yml depuis le gabarit à chaque démarrage, en remplaçant
# ${APP_DOMAIN} par la valeur de la variable d'environnement (définie dans .env).
set -eu

if [ -z "${APP_DOMAIN:-}" ]; then
    echo "ERREUR : la variable d'environnement APP_DOMAIN n'est pas définie (voir .env)." >&2
    exit 1
fi

TEMPLATE=/etc/traefik/dynamic-template/dynamic.yml.template
DEST=/etc/traefik/dynamic/dynamic.yml

mkdir -p "$(dirname "$DEST")"
sed "s|\${APP_DOMAIN}|${APP_DOMAIN}|g" "$TEMPLATE" > "$DEST"
echo "dynamic.yml généré pour APP_DOMAIN=${APP_DOMAIN}"

# Relais vers le point d'entrée d'origine de l'image Traefik
exec /entrypoint.sh "$@"
