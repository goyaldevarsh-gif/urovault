import 'dart:convert';
import 'dart:math';

import 'package:crypto/crypto.dart';
import 'package:flutter/services.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:local_auth/local_auth.dart';

/// Local (offline) doctor account. The password is salted + hashed and kept in the
/// platform keystore (Keychain / Android Keystore); nothing leaves the device.
class AuthService {
  static const _s = FlutterSecureStorage();
  static final LocalAuthentication _la = LocalAuthentication();

  static const _kId = 'acct_id';
  static const _kName = 'acct_name';
  static const _kSalt = 'acct_salt';
  static const _kHash = 'acct_hash';
  static const _kBio = 'acct_bio';

  static String _newSalt() {
    final r = Random.secure();
    return base64Url.encode(List<int>.generate(16, (_) => r.nextInt(256)));
  }

  static String _hash(String pw, String salt) => sha256.convert(utf8.encode('$salt:$pw')).toString();

  static Future<bool> hasAccount() async => (await _s.read(key: _kHash)) != null;

  static Future<void> createAccount({required String name, required String id, required String password}) async {
    final salt = _newSalt();
    await _s.write(key: _kName, value: name.trim());
    await _s.write(key: _kId, value: id.trim().toLowerCase());
    await _s.write(key: _kSalt, value: salt);
    await _s.write(key: _kHash, value: _hash(password, salt));
  }

  static Future<bool> verify(String id, String password) async {
    final storedId = await _s.read(key: _kId);
    final salt = await _s.read(key: _kSalt);
    final hash = await _s.read(key: _kHash);
    if (storedId == null || salt == null || hash == null) return false;
    return storedId == id.trim().toLowerCase() && hash == _hash(password, salt);
  }

  static Future<void> setPassword(String password) async {
    final salt = _newSalt();
    await _s.write(key: _kSalt, value: salt);
    await _s.write(key: _kHash, value: _hash(password, salt));
  }

  static Future<String> doctorName() async => (await _s.read(key: _kName)) ?? 'Doctor';
  static Future<String> accountId() async => (await _s.read(key: _kId)) ?? '';

  static Future<void> updateProfile({required String name}) async {
    await _s.write(key: _kName, value: name.trim());
  }

  // ---- biometrics / device lock

  static Future<bool> deviceSupported() async {
    try {
      return await _la.isDeviceSupported();
    } on PlatformException {
      return false;
    }
  }

  static Future<bool> biometricEnabled() async => (await _s.read(key: _kBio)) == '1';

  static Future<void> setBiometricEnabled(bool v) async => _s.write(key: _kBio, value: v ? '1' : '0');

  /// Biometric or device PIN/pattern prompt.
  static Future<bool> authenticate(String reason) async {
    try {
      return await _la.authenticate(
        localizedReason: reason,
        options: const AuthenticationOptions(stickyAuth: true, biometricOnly: false),
      );
    } on PlatformException {
      return false;
    }
  }
}
