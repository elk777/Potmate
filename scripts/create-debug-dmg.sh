#!/usr/bin/env sh
set -eu

PRODUCT_NAME="$(node -p "require('./src-tauri/tauri.conf.json').productName")"
APP_VERSION="$(node -p "require('./src-tauri/tauri.conf.json').version")"
MACOS_BUNDLE_DIR="src-tauri/target/debug/bundle/macos"
APP_PATH="$MACOS_BUNDLE_DIR/$PRODUCT_NAME.app"
DMG_DIR="src-tauri/target/debug/bundle/dmg"

case "$(uname -m)" in
  arm64) TARGET_ARCH="aarch64" ;;
  x86_64) TARGET_ARCH="x64" ;;
  *) TARGET_ARCH="$(uname -m)" ;;
esac

DMG_PATH="$DMG_DIR/${PRODUCT_NAME}_${APP_VERSION}_${TARGET_ARCH}.dmg"

if [ ! -d "$APP_PATH" ]; then
  echo "Missing app bundle: $APP_PATH"
  echo "Run: pnpm build:desktop"
  exit 1
fi

mkdir -p "$DMG_DIR"
find "$MACOS_BUNDLE_DIR" -maxdepth 1 -type f -name "rw.*.dmg" -exec rm -f {} +
hdiutil create \
  -volname "$PRODUCT_NAME" \
  -srcfolder "$APP_PATH" \
  -ov \
  -format UDZO \
  "$DMG_PATH"

echo "Created $DMG_PATH"
