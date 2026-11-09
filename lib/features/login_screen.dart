import 'package:flutter/material.dart';

import '../core/theme.dart';
import '../core/widgets.dart';
import '../services/auth_service.dart';
import 'home_shell.dart';

/// First launch: create the (local) doctor account. Afterwards: log in with password or biometrics.
class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _name = TextEditingController();
  final _id = TextEditingController();
  final _pw = TextEditingController();
  final _pw2 = TextEditingController();
  bool? _hasAccount;
  bool _hide = true;
  bool _busy = false;
  bool _bioReady = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _init();
  }

  Future<void> _init() async {
    final has = await AuthService.hasAccount();
    final bio = has && await AuthService.biometricEnabled() && await AuthService.deviceSupported();
    if (!mounted) return;
    setState(() {
      _hasAccount = has;
      _bioReady = bio;
    });
    if (bio) _biometric();
  }

  @override
  void dispose() {
    _name.dispose();
    _id.dispose();
    _pw.dispose();
    _pw2.dispose();
    super.dispose();
  }

  void _enter() {
    Navigator.of(context).pushReplacement(MaterialPageRoute<void>(builder: (_) => const HomeShell()));
  }

  Future<void> _biometric() async {
    final ok = await AuthService.authenticate('Unlock UroVault');
    if (ok && mounted) _enter();
  }

  Future<void> _submit() async {
    setState(() => _error = null);
    final id = _id.text.trim();
    final pw = _pw.text;
    if (id.isEmpty || pw.isEmpty) {
      setState(() => _error = 'Enter your email / mobile and password.');
      return;
    }
    setState(() => _busy = true);
    if (_hasAccount == false) {
      if (_name.text.trim().isEmpty) {
        setState(() {
          _busy = false;
          _error = 'Enter your name.';
        });
        return;
      }
      if (pw.length < 6) {
        setState(() {
          _busy = false;
          _error = 'Use at least 6 characters for the password.';
        });
        return;
      }
      if (pw != _pw2.text) {
        setState(() {
          _busy = false;
          _error = 'Passwords do not match.';
        });
        return;
      }
      await AuthService.createAccount(name: _name.text, id: id, password: pw);
      await _offerBiometric();
      if (mounted) _enter();
      return;
    }
    final ok = await AuthService.verify(id, pw);
    if (!mounted) return;
    if (!ok) {
      setState(() {
        _busy = false;
        _error = 'Incorrect email / mobile or password.';
      });
      return;
    }
    if (!await AuthService.biometricEnabled()) await _offerBiometric();
    if (mounted) _enter();
  }

  Future<void> _offerBiometric() async {
    if (!await AuthService.deviceSupported() || !mounted) return;
    final yes = await confirm(context,
        title: 'Enable biometric unlock?', message: 'Use fingerprint / face / device lock to open UroVault faster.', action: 'Enable', danger: false);
    if (yes) {
      final ok = await AuthService.authenticate('Confirm to enable biometric unlock');
      await AuthService.setBiometricEnabled(ok);
    }
  }

  Future<void> _forgot() async {
    if (!await AuthService.deviceSupported()) {
      if (mounted) toast(context, 'Set a screen lock on this device to reset the password.');
      return;
    }
    final ok = await AuthService.authenticate('Verify it is you to reset your password');
    if (!ok || !mounted) return;
    final c = TextEditingController();
    final newPw = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.white,
        title: const Text('New password', style: UvText.h2),
        content: TextField(controller: c, obscureText: true, decoration: uvInput(hint: 'At least 6 characters')),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, c.text.length >= 6 ? c.text : null),
            child: const Text('Save', style: TextStyle(color: UvColors.teal, fontWeight: FontWeight.w600)),
          ),
        ],
      ),
    );
    if (newPw != null) {
      await AuthService.setPassword(newPw);
      if (mounted) toast(context, 'Password updated.');
    }
  }

  @override
  Widget build(BuildContext context) {
    final creating = _hasAccount == false;
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: _hasAccount == null
            ? loadingView()
            : ContentWidth(
                maxWidth: 460,
                child: SingleChildScrollView(
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                    const SizedBox(height: 16),
                    const Center(child: UvLogo(size: 76)),
                    const Center(child: Text('UroVault', style: TextStyle(fontFamily: 'Inter', fontSize: 28, fontWeight: FontWeight.w700, color: UvColors.navy))),
                    const SizedBox(height: 6),
                    Center(child: Text(creating ? 'Create your account' : 'Login to your account', style: UvText.small)),
                    const SizedBox(height: 28),
                    if (creating) ...[
                      TextField(controller: _name, textCapitalization: TextCapitalization.words, decoration: uvInput(hint: 'Your name', prefix: const Icon(Icons.person_outline, size: 20))),
                      const SizedBox(height: 12),
                    ],
                    TextField(
                      controller: _id,
                      keyboardType: TextInputType.emailAddress,
                      autocorrect: false,
                      decoration: uvInput(hint: 'Email or Mobile Number', prefix: const Icon(Icons.mail_outline, size: 20)),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _pw,
                      obscureText: _hide,
                      onSubmitted: (_) => creating ? null : _submit(),
                      decoration: uvInput(
                        hint: 'Password',
                        prefix: const Icon(Icons.lock_outline, size: 20),
                        suffix: IconButton(
                          icon: Icon(_hide ? Icons.visibility_off_outlined : Icons.visibility_outlined, size: 20),
                          onPressed: () => setState(() => _hide = !_hide),
                        ),
                      ),
                    ),
                    if (creating) ...[
                      const SizedBox(height: 12),
                      TextField(controller: _pw2, obscureText: _hide, decoration: uvInput(hint: 'Confirm password', prefix: const Icon(Icons.lock_outline, size: 20))),
                    ],
                    if (_error != null) Padding(padding: const EdgeInsets.only(top: 10), child: Text(_error!, style: const TextStyle(color: UvColors.red, fontSize: 13))),
                    if (!creating)
                      Align(
                        alignment: Alignment.centerRight,
                        child: TextButton(onPressed: _forgot, child: const Text('Forgot Password?', style: TextStyle(color: UvColors.teal, fontWeight: FontWeight.w600))),
                      )
                    else
                      const SizedBox(height: 16),
                    PrimaryButton(label: creating ? 'Create account' : 'Login', onPressed: _submit, loading: _busy),
                    if (_bioReady) ...[
                      const SizedBox(height: 14),
                      OutlineBtn(label: 'Use biometrics', icon: Icons.fingerprint, onPressed: _biometric),
                    ],
                    const SizedBox(height: 28),
                    Row(children: const [
                      Icon(Icons.shield_outlined, size: 16, color: UvColors.textSecondary),
                      SizedBox(width: 8),
                      Expanded(child: Text('Your account and patient records stay on this device. Nothing is sent to any server.', style: UvText.small)),
                    ]),
                  ]),
                ),
              ),
      ),
    );
  }
}
