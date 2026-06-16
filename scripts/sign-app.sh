#!/bin/bash
# scripts/sign-app.sh
# Signature ad-hoc correcte pour Electron sur Apple Silicon (ARM64).
# Sans Developer ID, electron-builder skip la signature → les entitlements
# ne sont jamais appliqués → crash EXC_BREAKPOINT (V8 JIT).
# Ce script signe correctement toutes les composantes avec --options runtime,
# ce qui active CS_RUNTIME et permet au kernel de respecter allow-jit.

set -e

ENTITLEMENTS="$(dirname "$0")/../electron/entitlements.mac.plist"
APP="${1:-dist/mac-arm64/Minerva OS Reach Lite.app}"

if [ ! -d "$APP" ]; then
  echo "❌ App not found: $APP"
  exit 1
fi

echo "🔏 Signing: $APP"
echo "   Entitlements: $ENTITLEMENTS"

# 1. Sign dylibs (inside Frameworks)
echo "  → dylibs..."
find "$APP" -name "*.dylib" | while read -r lib; do
  codesign --force --sign - --options runtime --entitlements "$ENTITLEMENTS" "$lib" 2>/dev/null || true
done

# 2. Sign Electron Framework
echo "  → Electron Framework..."
codesign --force --sign - --options runtime --entitlements "$ENTITLEMENTS" \
  "$APP/Contents/Frameworks/Electron Framework.framework"

# 3. Sign all helper apps
echo "  → Helper apps..."
for helper in "$APP/Contents/Frameworks/"*.app; do
  codesign --force --sign - --options runtime --entitlements "$ENTITLEMENTS" "$helper"
done

# 4. Sign main bundle
echo "  → Main bundle..."
codesign --force --sign - --options runtime --entitlements "$ENTITLEMENTS" "$APP"

# 5. Verify
FLAGS=$(codesign -dv "$APP" 2>&1 | grep "flags=")
echo "✅ Done. Signature: $FLAGS"
