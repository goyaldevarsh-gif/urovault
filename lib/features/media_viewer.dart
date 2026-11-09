import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:open_filex/open_filex.dart';
import 'package:photo_view/photo_view.dart';
import 'package:photo_view/photo_view_gallery.dart';

import '../core/constants.dart';
import '../core/theme.dart';
import '../core/utils.dart';
import '../core/widgets.dart';
import '../data/file_store.dart';
import '../data/models.dart';
import '../data/providers.dart';

/// Opens an item: images in the full-screen viewer, other files with the system viewer.
Future<void> openMedia(BuildContext context, List<MediaItem> all, MediaItem tapped) async {
  if (!tapped.isImage) {
    final r = await OpenFilex.open(FileStore.file(tapped.path).path);
    if (r.type != ResultType.done && context.mounted) toast(context, 'No app available to open this file.');
    return;
  }
  final images = all.where((m) => m.isImage).toList();
  final idx = images.indexWhere((m) => m.id == tapped.id);
  await go(context, MediaViewer(items: images, initialIndex: idx < 0 ? 0 : idx));
}

/// Full-screen, pinch-to-zoom viewer with date, category, description, edit and delete.
class MediaViewer extends ConsumerStatefulWidget {
  final List<MediaItem> items;
  final int initialIndex;
  const MediaViewer({super.key, required this.items, this.initialIndex = 0});
  @override
  ConsumerState<MediaViewer> createState() => _MediaViewerState();
}

class _MediaViewerState extends ConsumerState<MediaViewer> {
  late List<MediaItem> _items = [...widget.items];
  late int _i = widget.initialIndex;
  late PageController _pc = PageController(initialPage: widget.initialIndex);

  @override
  void dispose() {
    _pc.dispose();
    super.dispose();
  }

  Future<void> _delete() async {
    final item = _items[_i];
    final ok = await confirm(context, title: 'Delete this image?', message: 'It will be permanently removed from this patient\'s record.');
    if (!ok) return;
    await ref.read(repoProvider).deleteMedia(item);
    if (!mounted) return;
    if (_items.length == 1) {
      Navigator.pop(context);
      return;
    }
    setState(() {
      _items.removeAt(_i);
      if (_i >= _items.length) _i = _items.length - 1;
      _pc.dispose();
      _pc = PageController(initialPage: _i);
    });
  }

  Future<void> _edit() async {
    final item = _items[_i];
    final r = await showMediaMetaSheet(context, initialCategory: item.category, initialCaption: item.caption, title: 'Edit image details');
    if (r == null) return;
    await ref.read(repoProvider).updateMedia(item.id!, r.$1, r.$2);
    if (!mounted) return;
    setState(() {
      _items[_i] = MediaItem(
        id: item.id,
        patientId: item.patientId,
        path: item.path,
        kind: item.kind,
        category: r.$1,
        caption: r.$2,
        takenAt: item.takenAt,
        refType: item.refType,
        refId: item.refId,
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    final cur = _items[_i];
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        title: Text('${_i + 1} / ${_items.length}', style: const TextStyle(color: Colors.white, fontSize: 15)),
        actions: [
          IconButton(icon: const Icon(Icons.edit_outlined), onPressed: _edit),
          IconButton(icon: const Icon(Icons.delete_outline), onPressed: _delete),
        ],
      ),
      body: Column(children: [
        Expanded(
          child: PhotoViewGallery.builder(
            itemCount: _items.length,
            pageController: _pc,
            onPageChanged: (i) => setState(() => _i = i),
            backgroundDecoration: const BoxDecoration(color: Colors.black),
            builder: (ctx, i) => PhotoViewGalleryPageOptions(
              imageProvider: FileImage(FileStore.file(_items[i].path)),
              minScale: PhotoViewComputedScale.contained,
              maxScale: PhotoViewComputedScale.covered * 4,
              errorBuilder: (_, __, ___) => const Center(child: Icon(Icons.broken_image_outlined, color: Colors.white54, size: 48)),
            ),
          ),
        ),
        Container(
          width: double.infinity,
          color: const Color(0xFF0B1B2D),
          padding: const EdgeInsets.fromLTRB(18, 12, 18, 12),
          child: SafeArea(
            top: false,
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Pill(cur.category),
                const SizedBox(width: 10),
                Text(fmtDate(cur.takenAt), style: const TextStyle(color: Color(0xCCFFFFFF), fontSize: 13)),
              ]),
              if (cur.caption != null && cur.caption!.isNotEmpty) ...[
                const SizedBox(height: 8),
                Text(cur.caption!, style: const TextStyle(color: Colors.white, fontSize: 14)),
              ],
            ]),
          ),
        ),
      ]),
    );
  }
}

/// Bottom sheet that asks for category + optional description. Returns (category, caption).
Future<(String, String?)?> showMediaMetaSheet(BuildContext context, {String initialCategory = 'Clinical', String? initialCaption, String title = 'Image details', int? count}) {
  var category = initialCategory;
  final caption = TextEditingController(text: initialCaption ?? '');
  return showModalBottomSheet<(String, String?)>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.white,
    shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
    builder: (ctx) => StatefulBuilder(
      builder: (ctx, setS) => Padding(
        padding: EdgeInsets.fromLTRB(20, 18, 20, 16 + MediaQuery.of(ctx).viewInsets.bottom),
        child: SafeArea(
          child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(count == null ? title : '$title ($count)', style: UvText.h2),
            const FieldLabel('Category'),
            Wrap(spacing: 8, runSpacing: 8, children: [
              for (final c in mediaCategories) UvChip(label: c, selected: category == c, onTap: () => setS(() => category = c)),
            ]),
            const FieldLabel('Description (optional)'),
            TextField(controller: caption, textCapitalization: TextCapitalization.sentences, decoration: uvInput(hint: 'e.g. Cystoscopy - bladder tumour')),
            const SizedBox(height: 18),
            PrimaryButton(label: 'Save', onPressed: () => Navigator.pop(ctx, (category, caption.text.trim().isEmpty ? null : caption.text.trim()))),
          ]),
        ),
      ),
    ),
  );
}
