import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/constants.dart';
import '../core/theme.dart';
import '../core/utils.dart';
import '../core/widgets.dart';
import '../data/file_store.dart';
import '../data/models.dart';
import '../data/providers.dart';
import 'media_viewer.dart';

class MediaTab extends ConsumerStatefulWidget {
  final int patientId;
  const MediaTab({super.key, required this.patientId});
  @override
  ConsumerState<MediaTab> createState() => _MediaTabState();
}

class _MediaTabState extends ConsumerState<MediaTab> {
  String _cat = 'All';

  Future<void> _add(Future<List<String>> Function() pick) async {
    final paths = await pick();
    if (paths.isEmpty || !mounted) return;
    final meta = await showMediaMetaSheet(
      context,
      initialCategory: _cat == 'All' ? 'Clinical' : _cat,
      title: 'Save to this patient',
      count: paths.length,
    );
    if (meta == null) return;
    final repo = ref.read(repoProvider);
    for (final p in paths) {
      await repo.addMedia(patientId: widget.patientId, srcPath: p, category: meta.$1, caption: meta.$2);
    }
    if (mounted) toast(context, '${paths.length} file${paths.length == 1 ? '' : 's'} saved');
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(mediaProvider(widget.patientId));
    return Column(children: [
      SizedBox(
        height: 54,
        child: ListView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.fromLTRB(16, 10, 16, 6),
          children: [
            for (final c in ['All', ...mediaCategories])
              Padding(padding: const EdgeInsets.only(right: 8), child: UvChip(label: c, selected: _cat == c, onTap: () => setState(() => _cat = c))),
          ],
        ),
      ),
      Expanded(
        child: async.when(
          loading: loadingView,
          error: (e, _) => errorView(e),
          data: (all) {
            final items = _cat == 'All' ? all : all.where((m) => m.category == _cat).toList();
            if (items.isEmpty) {
              return EmptyState(
                icon: const Icon(Icons.photo_library_outlined, color: UvColors.teal, size: 34),
                title: _cat == 'All' ? 'No images yet' : 'No $_cat images',
                subtitle: 'Add clinical photographs, CT / MRI images and reports.',
              );
            }
            return GridView.builder(
              padding: const EdgeInsets.fromLTRB(16, 6, 16, 16),
              gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(maxCrossAxisExtent: 160, mainAxisSpacing: 8, crossAxisSpacing: 8),
              itemCount: items.length,
              itemBuilder: (_, i) {
                final m = items[i];
                return GestureDetector(
                  onTap: () => openMedia(context, items, m),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: Stack(fit: StackFit.expand, children: [
                      m.isImage
                          ? Image.file(FileStore.file(m.path), fit: BoxFit.cover, cacheWidth: 400, errorBuilder: (_, __, ___) => const ColoredBox(color: UvColors.border))
                          : ColoredBox(
                              color: UvColors.lightTeal,
                              child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                                const Icon(Icons.description_outlined, color: UvColors.teal, size: 30),
                                const SizedBox(height: 4),
                                Text(m.caption ?? 'Report', maxLines: 2, overflow: TextOverflow.ellipsis, textAlign: TextAlign.center, style: UvText.small),
                              ]),
                            ),
                      Positioned(
                        left: 0,
                        right: 0,
                        bottom: 0,
                        child: Container(
                          padding: const EdgeInsets.fromLTRB(8, 14, 8, 6),
                          decoration: const BoxDecoration(gradient: LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: [Color(0x00000000), Color(0xAA000000)])),
                          child: Text('${m.category}  •  ${fmtDate(m.takenAt)}', maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Colors.white, fontSize: 10.5, fontWeight: FontWeight.w600)),
                        ),
                      ),
                    ]),
                  ),
                );
              },
            );
          },
        ),
      ),
      BottomAction(
        child: Row(children: [
          Expanded(flex: 5, child: PrimaryButton(label: 'Add Photos', icon: Icons.photo_camera_outlined, onPressed: () => _add(Picker.camera))),
          const SizedBox(width: 8),
          Expanded(flex: 2, child: _Square(icon: Icons.photo_library_outlined, onTap: () => _add(Picker.gallery))),
          const SizedBox(width: 8),
          Expanded(flex: 2, child: _Square(icon: Icons.attach_file, onTap: () => _add(Picker.files))),
        ]),
      ),
    ]);
  }
}

class _Square extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;
  const _Square({required this.icon, required this.onTap});
  @override
  Widget build(BuildContext context) => SizedBox(
        height: 52,
        child: OutlinedButton(
          onPressed: onTap,
          style: OutlinedButton.styleFrom(
            foregroundColor: UvColors.teal,
            side: const BorderSide(color: UvColors.teal, width: 1.2),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          ),
          child: Icon(icon),
        ),
      );
}
