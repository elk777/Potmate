#!/usr/bin/env sh
set -eu

PRODUCT_NAME="$(node -p "require('./src-tauri/tauri.conf.json').productName")"
APP_VERSION="$(node -p "require('./src-tauri/tauri.conf.json').version")"
RELEASE_BUNDLE_DIR="src-tauri/target/release/bundle"
MACOS_BUNDLE_DIR="$RELEASE_BUNDLE_DIR/macos"
APP_PATH="$MACOS_BUNDLE_DIR/$PRODUCT_NAME.app"
DMG_DIR="$RELEASE_BUNDLE_DIR/dmg"

case "$(uname -m)" in
  arm64) TARGET_ARCH="aarch64" ;;
  x86_64) TARGET_ARCH="x64" ;;
  *) TARGET_ARCH="$(uname -m)" ;;
esac

DMG_PATH="$DMG_DIR/${PRODUCT_NAME}_${APP_VERSION}_${TARGET_ARCH}.dmg"

echo "==> Building macOS DMG"
if ! pnpm tauri build --bundles dmg; then
  echo "Tauri DMG bundling failed. Falling back to a simple hdiutil DMG."
  if [ ! -d "$APP_PATH" ]; then
    echo "Missing app bundle: $APP_PATH"
    exit 1
  fi
  mkdir -p "$DMG_DIR"
  hdiutil create \
    -volname "$PRODUCT_NAME" \
    -srcfolder "$APP_PATH" \
    -ov \
    -format UDZO \
    "$DMG_PATH"
fi

if [ ! -f "$DMG_PATH" ]; then
  echo "Missing DMG: $DMG_PATH"
  exit 1
fi

echo "Created $DMG_PATH"
