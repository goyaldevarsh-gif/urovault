import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/theme.dart';
import '../core/widgets.dart';
import '../data/models.dart';
import '../data/providers.dart';
import 'media_viewer.dart';

/// Thumbnails of files already saved for one record (investigation / surgery / follow-up).
/// Tap opens, the small x deletes (with confirmation).
class SavedAttachments extends ConsumerWidget {
  final int patientId;
  final String refType;
  final int refId;
  final bool allowDelete;
  const SavedAttachments({super.key, required this.patientId, required this.refType, required this.refId, this.allowDelete = false});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final all = ref.watch(mediaProvider(patientId));
    return all.when(
      loading: () => const SizedBox.shrink(),
      error: (_, __) => const SizedBox.shrink(),
      data: (items) {
        final mine = items.where((m) => m.refType == refType && m.refId == refId).toList();
        if (mine.isEmpty) return const SizedBox.shrink();
        return Padding(
          padding: const EdgeInsets.only(top: 10),
          child: Wrap(spacing: 8, runSpacing: 8, children: [
            for (final m in mine)
              Stack(clipBehavior: Clip.none, children: [
                MediaThumb(item: m, size: 64, onTap: () => openMedia(context, mine, m)),
                if (allowDelete)
                  Positioned(
                    right: -6,
                    top: -6,
                    child: GestureDetector(
                      onTap: () async {
                        final ok = await confirm(context, title: 'Delete attachment?', message: 'This file will be removed from the record.');
                        if (ok) await ref.read(repoProvider).deleteMedia(m);
                      },
                      child: Container(
                        width: 22,
                        height: 22,
                        decoration: const BoxDecoration(color: UvColors.red, shape: BoxShape.circle),
                        child: const Icon(Icons.close, size: 14, color: Colors.white),
                      ),
                    ),
                  ),
              ]),
          ]),
        );
      },
    );
  }
}
