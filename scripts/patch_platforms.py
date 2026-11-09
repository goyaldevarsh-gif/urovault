#!/usr/bin/env python3
"""Idempotent patches for the generated android/ and ios/ projects."""
import glob, os, re

def read(p):
    with open(p, encoding='utf-8') as f:
        return f.read()

def write(p, s):
    with open(p, 'w', encoding='utf-8') as f:
        f.write(s)

# ---------------------------------------------------------------- Android manifest
m = 'android/app/src/main/AndroidManifest.xml'
if os.path.exists(m):
    s = read(m)
    if 'USE_BIOMETRIC' not in s:
        s = s.replace('<manifest xmlns:android="http://schemas.android.com/apk/res/android">',
                      '<manifest xmlns:android="http://schemas.android.com/apk/res/android">\n'
                      '    <uses-permission android:name="android.permission.USE_BIOMETRIC"/>\n'
                      '    <uses-permission android:name="android.permission.CAMERA"/>', 1)
    if '<queries>' in s and 'android.intent.action.DIAL' not in s:
        s = s.replace('<queries>', '<queries>\n        <intent><action android:name="android.intent.action.DIAL"/><data android:scheme="tel"/></intent>\n'
                      '        <intent><action android:name="android.intent.action.VIEW"/><data android:mimeType="*/*"/></intent>', 1)
    elif '<queries>' not in s:
        s = s.replace('<application', '<queries>\n        <intent><action android:name="android.intent.action.DIAL"/><data android:scheme="tel"/></intent>\n'
                      '        <intent><action android:name="android.intent.action.VIEW"/><data android:mimeType="*/*"/></intent>\n    </queries>\n    <application', 1)
    s = re.sub(r'android:label="[^"]*"', 'android:label="UroVault"', s, count=1)
    if 'android:allowBackup' not in s:
        s = s.replace('<application', '<application android:allowBackup="false"', 1)
    write(m, s)

# ---------------------------------------------------------------- MainActivity (local_auth needs FragmentActivity)
for f in glob.glob('android/app/src/main/kotlin/**/MainActivity.kt', recursive=True):
    s = read(f)
    if 'FlutterFragmentActivity' not in s:
        s = s.replace('import io.flutter.embedding.android.FlutterActivity', 'import io.flutter.embedding.android.FlutterFragmentActivity')
        s = s.replace('FlutterActivity()', 'FlutterFragmentActivity()')
        write(f, s)

# ---------------------------------------------------------------- AppCompat launch theme (biometric prompt)
for f in glob.glob('android/app/src/main/res/values*/styles.xml'):
    s = read(f)
    s = s.replace('parent="@android:style/Theme.Light.NoTitleBar"', 'parent="Theme.AppCompat.Light.NoTitleBar"')
    s = s.replace('parent="@android:style/Theme.Black.NoTitleBar"', 'parent="Theme.AppCompat.NoTitleBar"')
    write(f, s)

# ---------------------------------------------------------------- minSdk 23 (secure storage)
for f in ['android/app/build.gradle.kts', 'android/app/build.gradle']:
    if os.path.exists(f):
        s = read(f)
        s = s.replace('minSdk = flutter.minSdkVersion', 'minSdk = 23')
        s = s.replace('minSdkVersion flutter.minSdkVersion', 'minSdkVersion 23')
        write(f, s)

# ---------------------------------------------------------------- iOS Info.plist
pl = 'ios/Runner/Info.plist'
if os.path.exists(pl):
    s = read(pl)
    add = {
        'NSCameraUsageDescription': 'UroVault uses the camera to capture clinical photographs for your patient records.',
        'NSPhotoLibraryUsageDescription': 'UroVault lets you attach existing images and reports to patient records.',
        'NSFaceIDUsageDescription': 'UroVault uses Face ID to unlock the app.',
    }
    block = ''
    for k, v in add.items():
        if k not in s:
            block += f'\t<key>{k}</key>\n\t<string>{v}</string>\n'
    if 'LSApplicationQueriesSchemes' not in s:
        block += '\t<key>LSApplicationQueriesSchemes</key>\n\t<array>\n\t\t<string>tel</string>\n\t</array>\n'
    if block:
        idx = s.rfind('</dict>')
        s = s[:idx] + block + s[idx:]
    s = re.sub(r'(<key>CFBundleDisplayName</key>\s*<string>)[^<]*(</string>)', r'\1UroVault\2', s)
    write(pl, s)

print('patch_platforms: ok')
