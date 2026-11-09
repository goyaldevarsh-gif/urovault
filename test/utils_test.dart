import 'package:flutter_test/flutter_test.dart';
import 'package:urovault/core/constants.dart';
import 'package:urovault/core/utils.dart';

void main() {
  test('follow-up intervals', () {
    final from = DateTime(2026, 1, 15);
    expect(isoDate(nextDateFor('1 week', from)!), '2026-01-22');
    expect(isoDate(nextDateFor('3 months', from)!), '2026-04-15');
    expect(nextDateFor('Custom', from), isNull);
  });

  test('diagnosis groups for patient filters', () {
    expect(matchesGroup(['Ca Bladder'], 'Bladder'), isTrue);
    expect(matchesGroup(['Renal Stone', 'PUJO'], 'Renal'), isTrue);
    expect(matchesGroup(['Prostate CA'], 'Renal'), isFalse);
    expect(matchesGroup([], 'Other'), isTrue);
    expect(matchesGroup(['Adrenal Mass'], 'Other'), isTrue);
  });

  test('image path detection', () {
    expect(isImagePath('a/b/CT_1.JPG'), isTrue);
    expect(isImagePath('report.pdf'), isFalse);
  });
}
