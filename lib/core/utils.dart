import 'package:intl/intl.dart';

String isoDate(DateTime d) => DateFormat('yyyy-MM-dd').format(d);

DateTime parseIso(String s) {
  final p = DateTime.parse(s.length > 10 ? s.substring(0, 10) : s);
  return DateTime(p.year, p.month, p.day);
}

String fmtDate(String? iso) {
  if (iso == null || iso.isEmpty) return '-';
  return DateFormat('d MMM yyyy').format(parseIso(iso));
}

String fmtDateTime(String? iso) {
  if (iso == null || iso.isEmpty) return '-';
  return DateFormat('d MMM yyyy, h:mm a').format(DateTime.parse(iso).toLocal());
}

DateTime today() {
  final n = DateTime.now();
  return DateTime(n.year, n.month, n.day);
}

String greeting() {
  final h = DateTime.now().hour;
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

DateTime? nextDateFor(String label, DateTime from) {
  switch (label) {
    case '1 week':
      return from.add(const Duration(days: 7));
    case '2 weeks':
      return from.add(const Duration(days: 14));
    case '1 month':
      return DateTime(from.year, from.month + 1, from.day);
    case '3 months':
      return DateTime(from.year, from.month + 3, from.day);
    case '6 months':
      return DateTime(from.year, from.month + 6, from.day);
    case '1 year':
      return DateTime(from.year + 1, from.month, from.day);
  }
  return null;
}

String relativeDays(String iso) {
  final diff = parseIso(iso).difference(today()).inDays;
  if (diff == 0) return 'Today';
  if (diff == 1) return 'Tomorrow';
  if (diff == -1) return '1 day overdue';
  if (diff < 0) return '${-diff} days overdue';
  return 'In $diff days';
}

bool isImagePath(String path) {
  final l = path.toLowerCase();
  return l.endsWith('.jpg') || l.endsWith('.jpeg') || l.endsWith('.png') || l.endsWith('.webp') || l.endsWith('.heic') || l.endsWith('.gif');
}
