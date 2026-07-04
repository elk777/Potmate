#!/usr/bin/env sh
set -eu

PRODUCT_NAME="$(node -p "require('./src-tauri/tauri.conf.json').productName")"
PACKAGE_VERSION="$(node -p "require('./package.json').version")"
TAURI_VERSION="$(node -p "require('./src-tauri/tauri.conf.json').version")"
CARGO_VERSION="$(sed -n 's/^version = "\(.*\)"/\1/p' src-tauri/Cargo.toml | head -n 1)"
RELEASE_BUNDLE_DIR="src-tauri/target/release/bundle"
MACOS_BUNDLE_DIR="$RELEASE_BUNDLE_DIR/macos"
APP_PATH="$MACOS_BUNDLE_DIR/$PRODUCT_NAME.app"

case "$(uname -m)" in
  arm64) TARGET_ARCH="aarch64" ;;
  x86_64) TARGET_ARCH="x64" ;;
  *) TARGET_ARCH="$(uname -m)" ;;
esac

DMG_PATH="$RELEASE_BUNDLE_DIR/dmg/${PRODUCT_NAME}_${TAURI_VERSION}_${TARGET_ARCH}.dmg"

echo "==> Version consistency"
if [ "$PACKAGE_VERSION" != "$TAURI_VERSION" ] || [ "$PACKAGE_VERSION" != "$CARGO_VERSION" ]; then
  echo "Version mismatch:"
  echo "  package.json: $PACKAGE_VERSION"
  echo "  tauri.conf.json: $TAURI_VERSION"
  echo "  Cargo.toml: $CARGO_VERSION"
  exit 1
fi

echo "==> Web build and type check"
pnpm build

echo "==> Desktop release bundle"
pnpm build:desktop

echo "==> Artifact check"
case "$(uname -s)" in
  Darwin)
    if [ ! -d "$APP_PATH" ]; then
      echo "Missing app bundle: $APP_PATH"
      exit 1
    fi
    if [ ! -f "$DMG_PATH" ]; then
      echo "Missing DMG: $DMG_PATH"
      exit 1
    fi
    ;;
  Linux)
    find "$RELEASE_BUNDLE_DIR" -type f \( -name "*.AppImage" -o -name "*.deb" -o -name "*.rpm" \) | grep . >/dev/null
    ;;
  MINGW*|MSYS*|CYGWIN*)
    find "$RELEASE_BUNDLE_DIR" -type f \( -name "*.msi" -o -name "*.exe" \) | grep . >/dev/null
    ;;
esac

echo "Release verification passed."
