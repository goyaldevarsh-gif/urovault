import 'dart:io';

import 'package:file_picker/file_picker.dart';
import 'package:image_picker/image_picker.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:uuid/uuid.dart';

/// Private, app-sandboxed storage for clinical images and reports.
class FileStore {
  static String _docs = '';
  static const _uuid = Uuid();

  static String get docsPath => _docs;

  static Future<void> init() async {
    final d = await getApplicationDocumentsDirectory();
    _docs = d.path;
    final m = Directory(p.join(_docs, 'media'));
    if (!await m.exists()) await m.create(recursive: true);
  }

  /// Copies [srcPath] into private storage and returns the relative path.
  static Future<String> save(int patientId, String srcPath) async {
    final ext = p.extension(srcPath).toLowerCase();
    final rel = p.join('media', '$patientId', '${_uuid.v4()}$ext');
    final dest = File(p.join(_docs, rel));
    await dest.parent.create(recursive: true);
    await File(srcPath).copy(dest.path);
    return rel;
  }

  static File file(String rel) => File(p.join(_docs, rel));

  static Future<void> delete(String rel) async {
    try {
      final f = file(rel);
      if (await f.exists()) await f.delete();
    } catch (_) {}
  }

  static Future<void> deletePatientFolder(int patientId) async {
    try {
      final d = Directory(p.join(_docs, 'media', '$patientId'));
      if (await d.exists()) await d.delete(recursive: true);
    } catch (_) {}
  }
}

class Picker {
  static final ImagePicker _ip = ImagePicker();

  static Future<List<String>> camera() async {
    final x = await _ip.pickImage(source: ImageSource.camera, imageQuality: 90);
    return x == null ? <String>[] : <String>[x.path];
  }

  static Future<List<String>> gallery() async {
    final xs = await _ip.pickMultiImage(imageQuality: 90);
    return xs.map((e) => e.path).toList();
  }

  static Future<List<String>> files() async {
    final r = await FilePicker.platform.pickFiles(
      allowMultiple: true,
      type: FileType.custom,
      allowedExtensions: ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'heic', 'doc', 'docx'],
    );
    if (r == null) return <String>[];
    return r.paths.whereType<String>().toList();
  }
}
