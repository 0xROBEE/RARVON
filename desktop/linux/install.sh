#!/bin/sh
# Adds Rarvon to your applications menu (for you only; no password needed).
# Run it from the unpacked folder: ./install.sh   Remove it again: ./install.sh --remove
set -e
here=$(cd "$(dirname "$0")" && pwd)
apps="${XDG_DATA_HOME:-$HOME/.local/share}/applications"
icons="${XDG_DATA_HOME:-$HOME/.local/share}/icons/hicolor/256x256/apps"
if [ "$1" = "--remove" ]; then
  rm -f "$apps/rarvon.desktop" "$icons/rarvon.png"
  echo "Rarvon was removed from the applications menu. You can now delete this folder."
  exit 0
fi
mkdir -p "$apps" "$icons"
cp "$here/rarvon.png" "$icons/rarvon.png"
sed -e "s|^Exec=.*|Exec=\"$here/rarvon\"|" "$here/rarvon.desktop" > "$apps/rarvon.desktop"
chmod +x "$here/rarvon" "$here/ffmpeg/ffmpeg"
command -v update-desktop-database >/dev/null 2>&1 && update-desktop-database "$apps" >/dev/null 2>&1 || true
echo "Rarvon is now in your applications menu. Keep this folder where it is (or run ./install.sh again after moving it)."
