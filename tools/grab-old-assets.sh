#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────
# grab-old-assets.sh — pull every image off the old awan-group.com site
# into assets/img/_old/, so the new site can be pointed at the real files.
#
#   ./tools/grab-old-assets.sh                  # defaults to awan-group.com
#   ./tools/grab-old-assets.sh https://other.tld
#
# Needs only bash + curl. Crawls the start page and every same-host page it
# links to (one level deep), collects <img src>, data-src, srcset and CSS
# url(...) references, then downloads each one once.
# ─────────────────────────────────────────────────────────────────────────
set -uo pipefail

SITE="${1:-https://awan-group.com}"
SITE="${SITE%/}"
HOST="$(printf '%s' "$SITE" | sed -E 's#^https?://##; s#/.*##')"
ORIGIN="$(printf '%s' "$SITE" | sed -E 's#^(https?://[^/]+).*#\1#')"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$ROOT/assets/img/_old"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

mkdir -p "$OUT"
UA='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36'
get() { curl -fsSL --max-time 45 -A "$UA" "$1"; }

# collapse ./ and ../ so the same file is never fetched under two names
norm() {
  printf '%s\n' "$1" | awk '
    {
      url = $0
      i = index(url, "://"); if (i == 0) { print url; next }
      scheme = substr(url, 1, i + 2); rest = substr(url, i + 3)
      j = index(rest, "/"); if (j == 0) { print url; next }
      host = substr(rest, 1, j - 1); path = substr(rest, j)
      n = split(path, part, "/"); top = 0
      for (k = 1; k <= n; k++) {
        p = part[k]
        if (p == "." || p == "") continue
        if (p == "..") { if (top > 0) top--; continue }
        out[++top] = p
      }
      s = ""
      for (k = 1; k <= top; k++) s = s "/" out[k]
      if (s == "") s = "/"
      else if (path ~ /\/$/) s = s "/"
      print scheme host s
      delete out
    }'
}

# absolute-ise a URL found in markup, given the page it was found on
abs() {
  local u="${1%%#*}" base="$2"                          # drop any #fragment
  case "$u" in
    http://*|https://*) norm "$u" ;;
    //*)                norm "https:$u" ;;
    /*)                 norm "$ORIGIN$u" ;;             # root-relative → origin,
    data:*|'')          ;;                              #   not the start path
    *)                  norm "${base%/*}/$u" ;;
  esac
}

# every image reference in one HTML/CSS document
images_in() {
  local body="$1" page="$2"
  {
    grep -oiE '(src|data-src|data-lazy-src|href|content)="[^"]*\.(png|jpe?g|webp|avif|gif|svg)[^"]*"' <<<"$body" |
      sed -E 's/^[a-zA-Z-]+="//; s/"$//'
    grep -oiE 'srcset="[^"]*"' <<<"$body" | sed -E 's/^srcset="//; s/"$//' |
      tr ',' '\n' | awk '{print $1}'
    grep -oiE 'url\((&#039;|'"'"'|")?[^)'"'"'"]*\.(png|jpe?g|webp|avif|gif|svg)' <<<"$body" |
      sed -E 's/^url\((&#039;|'"'"'|")?//'
  } | while read -r u; do abs "$u" "$page"; done
}

echo "→ start page: $SITE"
home="$(get "$SITE/")" || { echo "✗ cannot reach $SITE — check the network, then rerun."; exit 1; }
printf '%s\n' "$home" > "$TMP/page0.html"
echo "$SITE/" > "$TMP/pages.txt"

# same-host links, one level deep (work / gallery / about pages)
grep -oiE 'href="[^"#?]*"' <<<"$home" | sed -E 's/^href="//; s/"$//' |
  while read -r u; do abs "$u" "$SITE/"; done |
  grep -E "^https?://(www\.)?$HOST" |
  grep -viE '\.(png|jpe?g|webp|avif|gif|svg|css|js|pdf|zip|mp4)$' |
  sort -u | head -25 >> "$TMP/pages.txt"

sort -u "$TMP/pages.txt" -o "$TMP/pages.txt"
echo "→ $(wc -l < "$TMP/pages.txt") page(s) to scan"

: > "$TMP/urls.txt"
while read -r page; do
  body="$(get "$page")" || { echo "  · skipped (unreachable): $page"; continue; }
  images_in "$body" "$page" >> "$TMP/urls.txt"
  # stylesheets can hold background images too
  grep -oiE 'href="[^"]*\.css[^"]*"' <<<"$body" | sed -E 's/^href="//; s/"$//' |
    while read -r c; do abs "$c" "$page"; done | sort -u |
    while read -r css; do
      cbody="$(get "$css")" || continue
      images_in "$cbody" "$css" >> "$TMP/urls.txt"
    done
done < "$TMP/pages.txt"

grep -E '^https?://' "$TMP/urls.txt" | sort -u > "$TMP/final.txt"
echo "→ $(wc -l < "$TMP/final.txt") image URL(s) found"

n=0
while read -r u; do
  name="$(printf '%s' "${u##*/}" | sed -E 's/\?.*$//' | tr -cd 'A-Za-z0-9._-')"
  [ -z "$name" ] && name="image-$n"
  dest="$OUT/$name"
  i=2; while [ -e "$dest" ]; do dest="$OUT/${name%.*}-$i.${name##*.}"; i=$((i+1)); done
  if curl -fsSL --max-time 60 -A "$UA" -e "$SITE/" "$u" -o "$dest"; then
    n=$((n+1)); printf '  ✓ %-46s %s\n' "$(basename "$dest")" "$(du -h "$dest" | cut -f1)"
  else
    echo "  ✗ $u"
  fi
done < "$TMP/final.txt"

echo
echo "✔ $n file(s) in assets/img/_old/"
echo "  Next: rename the ones you want into the names the site asks for —"
echo "  logo.png, logo-light.png, studio-01..05.jpg, work-01..06.jpg."
echo "  See assets/img/README.txt for which is which."
