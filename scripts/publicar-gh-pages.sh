#!/usr/bin/env bash
# Publica en la rama gh-pages sin pisar lo que otro flujo acaba de publicar.
#   app   <carpeta>: publica la app compilada (out/) y conserva datos/ de la rama.
#   datos <carpeta>: conserva la app publicada y reemplaza datos/ con <carpeta>.
# La rama se guarda siempre como un solo commit, para que el repositorio no crezca.
# Si otro flujo publicó en medio, vuelve a intentar con lo más nuevo.
set -euo pipefail

modo="$1"
fuente="$(realpath "$2")"
mensaje="$3"
repo="https://x-access-token:${TOKEN}@github.com/${GITHUB_REPOSITORY}.git"

for intento in 1 2 3 4 5; do
  trabajo="$(mktemp -d)"
  cd "$trabajo"
  git init -q -b gh-pages
  base=""
  if git fetch -q --depth=1 "$repo" gh-pages 2>/dev/null; then
    base="$(git rev-parse FETCH_HEAD)"
    git checkout -q -f FETCH_HEAD -- . 2>/dev/null || true
  fi

  if [ "$modo" = "app" ]; then
    find . -mindepth 1 -maxdepth 1 ! -name .git ! -name datos -exec rm -rf {} +
    cp -a "$fuente"/. .
  else
    rm -rf datos
    mkdir -p datos
    cp -a "$fuente"/. datos/
  fi
  touch .nojekyll

  git add -A
  git -c user.name="github-actions[bot]" -c user.email="41898282+github-actions[bot]@users.noreply.github.com" \
    commit -q -m "$mensaje"
  if [ -n "$base" ]; then
    if git push -q --force-with-lease="gh-pages:${base}" "$repo" gh-pages; then exit 0; fi
  else
    if git push -q -f "$repo" gh-pages; then exit 0; fi
  fi
  echo "Otro flujo publicó al mismo tiempo; intento ${intento} de 5 otra vez."
  cd /
  rm -rf "$trabajo"
  sleep $((intento * 5))
done
echo "::error::No se pudo publicar en gh-pages."
exit 1
