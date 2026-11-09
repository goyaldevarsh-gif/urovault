import 'package:flutter/material.dart';

class DxOption {
  final String name;
  final String icon; // asset name in assets/icons, or '' for generic
  final bool paired; // laterality (Right / Left / Bilateral) is clinically relevant
  final String group; // Renal | Bladder | Prostate | Other
  const DxOption(this.name, this.icon, this.paired, this.group);
}

const diagnosisOptions = <DxOption>[
  DxOption('Ureterocele', 'ureterocele', true, 'Renal'),
  DxOption('Renal Mass', 'renal', true, 'Renal'),
  DxOption('Prostate CA', 'prostate', false, 'Prostate'),
  DxOption('Ca Bladder', 'bladder', false, 'Bladder'),
  DxOption('Ureteric Stone', 'stone', true, 'Renal'),
  DxOption('Renal Stone', 'renal', true, 'Renal'),
  DxOption('Adrenal Mass', 'adrenal', true, 'Other'),
  DxOption('PUJO', 'pujo', true, 'Renal'),
  DxOption('Other', '', false, 'Other'),
];

const lateralities = ['Right', 'Left', 'Bilateral'];

const patientFilters = ['All', 'Renal', 'Bladder', 'Prostate', 'Other'];

DxOption? dxOptionFor(String name) {
  for (final d in diagnosisOptions) {
    if (d.name == name) return d;
  }
  return null;
}

bool matchesGroup(List<String> dxNames, String group) {
  if (group == 'All') return true;
  if (dxNames.isEmpty) return group == 'Other';
  for (final n in dxNames) {
    final g = dxOptionFor(n)?.group ?? 'Other';
    if (g == group) return true;
  }
  return false;
}

class InvestigationOption {
  final String name;
  final IconData icon;
  final String mediaCategory; // category used when photos are attached
  const InvestigationOption(this.name, this.icon, this.mediaCategory);
}

const investigationOptions = <InvestigationOption>[
  InvestigationOption('RFT', Icons.science_outlined, 'Other'),
  InvestigationOption('CBC', Icons.water_drop_outlined, 'Other'),
  InvestigationOption('Urine Analysis', Icons.opacity_outlined, 'Other'),
  InvestigationOption('Urine Culture', Icons.biotech_outlined, 'Other'),
  InvestigationOption('PSA', Icons.bloodtype_outlined, 'Other'),
  InvestigationOption('CT', Icons.donut_large_outlined, 'CT'),
  InvestigationOption('MRI', Icons.blur_circular_outlined, 'MRI'),
  InvestigationOption('DTPA', Icons.bubble_chart_outlined, 'Other'),
  InvestigationOption('PET CT', Icons.center_focus_strong_outlined, 'Other'),
  InvestigationOption('Other', Icons.description_outlined, 'Other'),
];

IconData investigationIcon(String name) {
  for (final i in investigationOptions) {
    if (i.name == name) return i.icon;
  }
  return Icons.description_outlined;
}

String investigationCategory(String name) {
  for (final i in investigationOptions) {
    if (i.name == name) return i.mediaCategory;
  }
  return 'Other';
}

const mediaCategories = ['Clinical', 'Pre-op', 'Post-op', 'Follow-up', 'CT', 'MRI', 'Other'];

const commonProcedures = [
  'TURBT',
  'TURP',
  'PCNL',
  'URS + DJ stenting',
  'RIRS',
  'Radical nephrectomy',
  'Pyeloplasty',
  'Radical prostatectomy',
  'Cystoscopy',
];

const followUpIntervals = ['1 week', '2 weeks', '1 month', '3 months', '6 months', '1 year'];

const followUpStatuses = ['Improving', 'Stable', 'Worsening'];

const sexOptions = ['Male', 'Female', 'Other'];
