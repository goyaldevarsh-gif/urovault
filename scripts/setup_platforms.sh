#!/usr/bin/env bash
# Generates the android/ios folders, applies UroVault's permission/config patches,
# fetches packages and creates the launcher icons. Safe to run more than once.
set -euo pipefail
cd "$(dirname "$0")/.."

cp lib/main.dart /tmp/urovault_main.dart.bak
if [ ! -d android ] || [ ! -d ios ]; then
  flutter create . --project-name urovault --org com.urovault --platforms=android,ios
fi
cp /tmp/urovault_main.dart.bak lib/main.dart      # never let flutter create replace our main
rm -f test/widget_test.dart                         # template test refers to a different app

python3 scripts/patch_platforms.py
flutter pub get
dart run flutter_launcher_icons
echo "Platform setup done."
