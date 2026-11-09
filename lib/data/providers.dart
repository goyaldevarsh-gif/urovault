import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'models.dart';
import 'repository.dart';

/// Bumped after every write so all data providers refresh.
final dbTickProvider = StateProvider<int>((ref) => 0);

final repoProvider = Provider<Repo>((ref) => Repo(() => ref.read(dbTickProvider.notifier).state++));

/// Selected tab of the home shell (0 Home, 1 Patients, 2 Follow-ups, 3 More).
final shellTabProvider = StateProvider<int>((ref) => 0);

final patientListProvider = FutureProvider.autoDispose.family<List<Patient>, ({String q, String filter})>((ref, a) async {
  ref.watch(dbTickProvider);
  return ref.read(repoProvider).listPatients(query: a.q, filter: a.filter);
});

final recentPatientsProvider = FutureProvider.autoDispose<List<Patient>>((ref) async {
  ref.watch(dbTickProvider);
  return ref.read(repoProvider).listPatients(limit: 4);
});

final patientProvider = FutureProvider.autoDispose.family<Patient?, int>((ref, id) async {
  ref.watch(dbTickProvider);
  return ref.read(repoProvider).getPatient(id);
});

final dxProvider = FutureProvider.autoDispose.family<List<PatientDx>, int>((ref, id) async {
  ref.watch(dbTickProvider);
  return ref.read(repoProvider).getDiagnoses(id);
});

final investigationsProvider = FutureProvider.autoDispose.family<List<Investigation>, int>((ref, id) async {
  ref.watch(dbTickProvider);
  return ref.read(repoProvider).investigations(id);
});

final mediaProvider = FutureProvider.autoDispose.family<List<MediaItem>, int>((ref, id) async {
  ref.watch(dbTickProvider);
  return ref.read(repoProvider).media(id);
});

final surgeriesProvider = FutureProvider.autoDispose.family<List<Surgery>, int>((ref, id) async {
  ref.watch(dbTickProvider);
  return ref.read(repoProvider).surgeries(id);
});

final allSurgeriesProvider = FutureProvider.autoDispose<List<Surgery>>((ref) async {
  ref.watch(dbTickProvider);
  return ref.read(repoProvider).allSurgeries();
});

final recentSurgeriesProvider = FutureProvider.autoDispose<List<Surgery>>((ref) async {
  ref.watch(dbTickProvider);
  return ref.read(repoProvider).allSurgeries(limit: 3);
});

final followUpsProvider = FutureProvider.autoDispose.family<List<FollowUp>, int>((ref, id) async {
  ref.watch(dbTickProvider);
  return ref.read(repoProvider).followUpsFor(id);
});

final followUpListProvider = FutureProvider.autoDispose.family<List<FollowUp>, String>((ref, filter) async {
  ref.watch(dbTickProvider);
  return ref.read(repoProvider).followUpsByFilter(filter);
});

final followUpCountsProvider = FutureProvider.autoDispose<Map<String, int>>((ref) async {
  ref.watch(dbTickProvider);
  return ref.read(repoProvider).followUpCounts();
});

final upcomingFollowUpsProvider = FutureProvider.autoDispose<List<FollowUp>>((ref) async {
  ref.watch(dbTickProvider);
  return ref.read(repoProvider).pendingFollowUps(limit: 3);
});

final notesProvider = FutureProvider.autoDispose.family<List<MgmtNote>, int>((ref, id) async {
  ref.watch(dbTickProvider);
  return ref.read(repoProvider).notes(id);
});

final timelineProvider = FutureProvider.autoDispose.family<List<TimelineEvent>, int>((ref, id) async {
  ref.watch(dbTickProvider);
  return ref.read(repoProvider).timeline(id);
});

final countsProvider = FutureProvider.autoDispose<Map<String, int>>((ref) async {
  ref.watch(dbTickProvider);
  return ref.read(repoProvider).counts();
});

final dxStatsProvider = FutureProvider.autoDispose<List<MapEntry<String, int>>>((ref) async {
  ref.watch(dbTickProvider);
  return ref.read(repoProvider).dxStats();
});

final auditProvider = FutureProvider.autoDispose<List<AuditEntry>>((ref) async {
  ref.watch(dbTickProvider);
  return ref.read(repoProvider).auditLog();
});
