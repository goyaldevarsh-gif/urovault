import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../data/file_store.dart';
import '../data/models.dart';
import 'constants.dart';
import 'theme.dart';
import 'utils.dart';

Future<T?> go<T>(BuildContext c, Widget w) => Navigator.of(c).push<T>(MaterialPageRoute<T>(builder: (_) => w));

void toast(BuildContext c, String msg) {
  ScaffoldMessenger.of(c)
    ..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(content: Text(msg)));
}

Future<bool> confirm(BuildContext c, {required String title, required String message, String action = 'Delete', bool danger = true}) async {
  final r = await showDialog<bool>(
    context: c,
    builder: (ctx) => AlertDialog(
      backgroundColor: Colors.white,
      surfaceTintColor: Colors.white,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      title: Text(title, style: UvText.h2),
      content: Text(message, style: UvText.body),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel', style: TextStyle(color: UvColors.textSecondary))),
        TextButton(
          onPressed: () => Navigator.pop(ctx, true),
          child: Text(action, style: TextStyle(color: danger ? UvColors.red : UvColors.teal, fontWeight: FontWeight.w600)),
        ),
      ],
    ),
  );
  return r ?? false;
}

/// Centers content with a max width so tablets look intentional.
class ContentWidth extends StatelessWidget {
  final Widget child;
  final double maxWidth;
  const ContentWidth({super.key, required this.child, this.maxWidth = 720});
  @override
  Widget build(BuildContext context) => Align(
        alignment: Alignment.topCenter,
        child: ConstrainedBox(constraints: BoxConstraints(maxWidth: maxWidth), child: child),
      );
}

class UvLogo extends StatelessWidget {
  final double size;
  final bool light;
  const UvLogo({super.key, this.size = 64, this.light = false});
  @override
  Widget build(BuildContext context) =>
      SvgPicture.asset(light ? 'assets/brand/logo_mark_light.svg' : 'assets/brand/logo_mark.svg', width: size, height: size);
}

class UvIcon extends StatelessWidget {
  final String name;
  final double size;
  final Color color;
  const UvIcon(this.name, {super.key, this.size = 24, this.color = UvColors.teal});
  @override
  Widget build(BuildContext context) => SvgPicture.asset(
        'assets/icons/$name.svg',
        width: size,
        height: size,
        colorFilter: ColorFilter.mode(color, BlendMode.srcIn),
      );
}

Widget dxIcon(String dxName, {double size = 24, Color color = UvColors.teal}) {
  final o = dxOptionFor(dxName);
  if (o == null || o.icon.isEmpty) return Icon(Icons.more_horiz, size: size, color: color);
  return UvIcon(o.icon, size: size, color: color);
}

class UvCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;
  final VoidCallback? onTap;
  final Color color;
  final EdgeInsetsGeometry? margin;
  const UvCard({super.key, required this.child, this.padding = const EdgeInsets.all(16), this.onTap, this.color = Colors.white, this.margin});

  @override
  Widget build(BuildContext context) {
    final radius = BorderRadius.circular(16);
    return Container(
      margin: margin,
      decoration: BoxDecoration(
        color: color,
        borderRadius: radius,
        border: Border.all(color: UvColors.border),
        boxShadow: const [BoxShadow(color: UvColors.shadow, blurRadius: 12, offset: Offset(0, 3))],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(borderRadius: radius, onTap: onTap, child: Padding(padding: padding, child: child)),
      ),
    );
  }
}

class PrimaryButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final bool loading;
  const PrimaryButton({super.key, required this.label, required this.onPressed, this.icon, this.loading = false});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      height: 52,
      child: ElevatedButton(
        onPressed: loading ? null : onPressed,
        style: ElevatedButton.styleFrom(
          backgroundColor: UvColors.teal,
          foregroundColor: Colors.white,
          disabledBackgroundColor: const Color(0x800D9488),
          disabledForegroundColor: Colors.white,
          elevation: 0,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          textStyle: const TextStyle(fontFamily: 'Inter', fontSize: 16, fontWeight: FontWeight.w600),
        ),
        child: loading
            ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2.4, color: Colors.white))
            : Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                if (icon != null) ...[Icon(icon, size: 20), const SizedBox(width: 8)],
                Text(label),
              ]),
      ),
    );
  }
}

class OutlineBtn extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  const OutlineBtn({super.key, required this.label, required this.onPressed, this.icon});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 46,
      child: OutlinedButton(
        onPressed: onPressed,
        style: OutlinedButton.styleFrom(
          foregroundColor: UvColors.teal,
          side: const BorderSide(color: UvColors.teal, width: 1.2),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          textStyle: const TextStyle(fontFamily: 'Inter', fontSize: 14, fontWeight: FontWeight.w600),
        ),
        child: Row(mainAxisAlignment: MainAxisAlignment.center, mainAxisSize: MainAxisSize.min, children: [
          if (icon != null) ...[Icon(icon, size: 18), const SizedBox(width: 6)],
          Flexible(child: Text(label, overflow: TextOverflow.ellipsis)),
        ]),
      ),
    );
  }
}

/// Persistent bottom bar that keeps the main action always reachable.
class BottomAction extends StatelessWidget {
  final Widget child;
  const BottomAction({super.key, required this.child});
  @override
  Widget build(BuildContext context) => Container(
        decoration: const BoxDecoration(color: Colors.white, border: Border(top: BorderSide(color: UvColors.border))),
        padding: const EdgeInsets.fromLTRB(16, 10, 16, 10),
        child: SafeArea(top: false, child: ContentWidth(maxWidth: 560, child: child)),
      );
}

InputDecoration uvInput({String? label, String? hint, Widget? prefix, Widget? suffix, String? error, bool filled = true}) {
  OutlineInputBorder b(Color c, [double w = 1]) => OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: c, width: w));
  return InputDecoration(
    labelText: label,
    hintText: hint,
    errorText: error,
    prefixIcon: prefix,
    suffixIcon: suffix,
    filled: filled,
    fillColor: Colors.white,
    labelStyle: const TextStyle(color: UvColors.textSecondary, fontFamily: 'Inter'),
    hintStyle: const TextStyle(color: Color(0xFF94A3B8), fontFamily: 'Inter'),
    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
    enabledBorder: b(UvColors.border),
    focusedBorder: b(UvColors.teal, 1.6),
    errorBorder: b(UvColors.red),
    focusedErrorBorder: b(UvColors.red, 1.6),
    border: b(UvColors.border),
  );
}

class FieldLabel extends StatelessWidget {
  final String text;
  final bool required;
  const FieldLabel(this.text, {super.key, this.required = false});
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 6, top: 14),
        child: Text.rich(TextSpan(children: [
          TextSpan(text: text.toUpperCase(), style: UvText.label),
          if (required) const TextSpan(text: ' *', style: TextStyle(color: UvColors.red, fontWeight: FontWeight.w700)),
        ])),
      );
}

class SectionTitle extends StatelessWidget {
  final String title;
  final String? action;
  final VoidCallback? onAction;
  const SectionTitle(this.title, {super.key, this.action, this.onAction});
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.fromLTRB(0, 20, 0, 10),
        child: Row(children: [
          Expanded(child: Text(title, style: UvText.h3)),
          if (action != null)
            GestureDetector(onTap: onAction, child: Text(action!, style: const TextStyle(color: UvColors.teal, fontWeight: FontWeight.w600, fontSize: 13))),
        ]),
      );
}

class UvChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback? onTap;
  final String? count;
  const UvChip({super.key, required this.label, this.selected = false, this.onTap, this.count});
  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: selected ? UvColors.teal : Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: selected ? UvColors.teal : UvColors.border),
        ),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          Text(label, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: selected ? Colors.white : UvColors.navy)),
          if (count != null) ...[
            const SizedBox(width: 6),
            Text(count!, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: selected ? const Color(0xCCFFFFFF) : UvColors.textSecondary)),
          ],
        ]),
      ),
    );
  }
}

class Pill extends StatelessWidget {
  final String text;
  final Color color;
  final Color bg;
  const Pill(this.text, {super.key, this.color = UvColors.teal, this.bg = UvColors.lightTeal});
  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(20)),
        child: Text(text, style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600, color: color)),
      );
}

class Avatar extends StatelessWidget {
  final String initials;
  final double size;
  const Avatar(this.initials, {super.key, this.size = 44});
  @override
  Widget build(BuildContext context) => Container(
        width: size,
        height: size,
        alignment: Alignment.center,
        decoration: const BoxDecoration(color: UvColors.lightTeal, shape: BoxShape.circle),
        child: Text(initials, style: TextStyle(color: UvColors.teal, fontWeight: FontWeight.w700, fontSize: size * 0.34)),
      );
}

class EmptyState extends StatelessWidget {
  final Widget? icon;
  final String title;
  final String? subtitle;
  final String? actionLabel;
  final VoidCallback? onAction;
  const EmptyState({super.key, this.icon, required this.title, this.subtitle, this.actionLabel, this.onAction});
  @override
  Widget build(BuildContext context) => Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Container(
              width: 76,
              height: 76,
              decoration: const BoxDecoration(color: UvColors.lightTeal, shape: BoxShape.circle),
              alignment: Alignment.center,
              child: icon ?? const UvIcon('renal', size: 36),
            ),
            const SizedBox(height: 16),
            Text(title, style: UvText.h3, textAlign: TextAlign.center),
            if (subtitle != null) ...[const SizedBox(height: 6), Text(subtitle!, style: UvText.small, textAlign: TextAlign.center)],
            if (actionLabel != null) ...[
              const SizedBox(height: 18),
              SizedBox(width: 220, child: PrimaryButton(label: actionLabel!, onPressed: onAction)),
            ],
          ]),
        ),
      );
}

class InfoRow extends StatelessWidget {
  final Widget leading;
  final String label;
  final String value;
  final Widget? trailing;
  final VoidCallback? onTap;
  const InfoRow({super.key, required this.leading, required this.label, required this.value, this.trailing, this.onTap});
  @override
  Widget build(BuildContext context) => InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 12),
          child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            SizedBox(width: 28, child: Center(child: leading)),
            const SizedBox(width: 12),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(label, style: UvText.small),
                const SizedBox(height: 2),
                Text(value, style: UvText.bodyBold),
              ]),
            ),
            if (trailing != null) trailing!,
          ]),
        ),
      );
}

class UvDateField extends StatelessWidget {
  final String label;
  final DateTime? value;
  final ValueChanged<DateTime> onChanged;
  final DateTime? first;
  final DateTime? last;
  final bool required;
  const UvDateField({super.key, required this.label, required this.value, required this.onChanged, this.first, this.last, this.required = false});

  @override
  Widget build(BuildContext context) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      FieldLabel(label, required: required),
      InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () async {
          final now = today();
          final d = await showDatePicker(
            context: context,
            initialDate: value ?? now,
            firstDate: first ?? DateTime(2000),
            lastDate: last ?? DateTime(now.year + 5, 12, 31),
          );
          if (d != null) onChanged(d);
        },
        child: InputDecorator(
          decoration: uvInput(suffix: const Icon(Icons.calendar_today_outlined, size: 20, color: UvColors.textSecondary)),
          child: Text(value == null ? 'Select date' : fmtDate(isoDate(value!)),
              style: TextStyle(fontSize: 15, color: value == null ? const Color(0xFF94A3B8) : UvColors.navy)),
        ),
      ),
    ]);
  }
}

/// Local files that are picked but not saved yet (camera / gallery / files) with thumbnails.
class PendingAttachments extends StatelessWidget {
  final List<String> paths;
  final ValueChanged<List<String>> onChanged;
  final bool allowFiles;
  const PendingAttachments({super.key, required this.paths, required this.onChanged, this.allowFiles = true});

  Future<void> _add(Future<List<String>> Function() pick) async {
    final got = await pick();
    if (got.isNotEmpty) onChanged([...paths, ...got]);
  }

  @override
  Widget build(BuildContext context) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      if (paths.isNotEmpty)
        Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: Wrap(spacing: 8, runSpacing: 8, children: [
            for (var i = 0; i < paths.length; i++)
              Stack(clipBehavior: Clip.none, children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(10),
                  child: SizedBox(
                    width: 64,
                    height: 64,
                    child: isImagePath(paths[i])
                        ? Image.file(File(paths[i]), fit: BoxFit.cover, cacheWidth: 200, errorBuilder: (_, __, ___) => const ColoredBox(color: UvColors.border))
                        : const ColoredBox(color: UvColors.lightTeal, child: Icon(Icons.description_outlined, color: UvColors.teal)),
                  ),
                ),
                Positioned(
                  right: -6,
                  top: -6,
                  child: GestureDetector(
                    onTap: () => onChanged([...paths]..removeAt(i)),
                    child: Container(
                      width: 22,
                      height: 22,
                      decoration: const BoxDecoration(color: UvColors.navy, shape: BoxShape.circle),
                      child: const Icon(Icons.close, size: 14, color: Colors.white),
                    ),
                  ),
                ),
              ]),
          ]),
        ),
      Row(children: [
        Expanded(child: OutlineBtn(label: 'Camera', icon: Icons.photo_camera_outlined, onPressed: () => _add(Picker.camera))),
        const SizedBox(width: 8),
        Expanded(child: OutlineBtn(label: 'Gallery', icon: Icons.photo_library_outlined, onPressed: () => _add(Picker.gallery))),
        if (allowFiles) ...[
          const SizedBox(width: 8),
          Expanded(child: OutlineBtn(label: 'File', icon: Icons.attach_file, onPressed: () => _add(Picker.files))),
        ],
      ]),
    ]);
  }
}

/// Thumbnail for a saved media item.
class MediaThumb extends StatelessWidget {
  final MediaItem item;
  final double size;
  final VoidCallback? onTap;
  const MediaThumb({super.key, required this.item, this.size = 64, this.onTap});
  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(10),
        child: SizedBox(
          width: size,
          height: size,
          child: item.isImage
              ? Image.file(FileStore.file(item.path), fit: BoxFit.cover, cacheWidth: 300, errorBuilder: (_, __, ___) => const ColoredBox(color: UvColors.border, child: Icon(Icons.broken_image_outlined, color: UvColors.textSecondary)))
              : const ColoredBox(color: UvColors.lightTeal, child: Icon(Icons.description_outlined, color: UvColors.teal)),
        ),
      ),
    );
  }
}

Widget loadingView() => const Center(child: CircularProgressIndicator(color: UvColors.teal));

Widget errorView(Object e) => Center(child: Padding(padding: const EdgeInsets.all(24), child: Text('Something went wrong.\n$e', textAlign: TextAlign.center, style: UvText.small)));
