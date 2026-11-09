import 'package:flutter/material.dart';

import '../core/theme.dart';
import '../core/widgets.dart';
import '../services/auth_service.dart';

class DoctorProfileScreen extends StatefulWidget {
  const DoctorProfileScreen({super.key});
  @override
  State<DoctorProfileScreen> createState() => _DoctorProfileScreenState();
}

class _DoctorProfileScreenState extends State<DoctorProfileScreen> {
  final _name = TextEditingController();
  String _id = '';
  bool _loaded = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    _name.text = await AuthService.doctorName();
    _id = await AuthService.accountId();
    if (mounted) setState(() => _loaded = true);
  }

  @override
  void dispose() {
    _name.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_name.text.trim().isEmpty) return;
    await AuthService.updateProfile(name: _name.text);
    if (mounted) {
      toast(context, 'Profile saved');
      Navigator.pop(context);
    }
  }

  @override
  Widget build(BuildContext context) {
    final initials = _name.text.trim().isEmpty ? 'Dr' : _name.text.trim().substring(0, 1).toUpperCase();
    return Scaffold(
      appBar: AppBar(title: const Text('Doctor Profile')),
      bottomNavigationBar: BottomAction(child: PrimaryButton(label: 'Save', onPressed: _loaded ? _save : null)),
      body: !_loaded
          ? loadingView()
          : ContentWidth(
              maxWidth: 520,
              child: ListView(padding: const EdgeInsets.all(20), children: [
                Center(child: Avatar(initials, size: 84)),
                const FieldLabel('Name'),
                TextField(controller: _name, onChanged: (_) => setState(() {}), textCapitalization: TextCapitalization.words, decoration: uvInput(hint: 'Your name')),
                const FieldLabel('Login (email / mobile)'),
                InputDecorator(decoration: uvInput(), child: Text(_id, style: UvText.body)),
              ]),
            ),
    );
  }
}
