import 'package:agritec_mobile/core/localization/app_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

String trFormat(WidgetRef ref, String key, Map<String, String> values) {
  var text = ref.tr(key);
  for (final entry in values.entries) {
    text = text.replaceAll('{${entry.key}}', entry.value);
  }
  return text;
}

String trCategory(WidgetRef ref, String slug, String fallback) {
  final key = 'category.$slug';
  final translated = ref.tr(key);
  return translated == key ? fallback : translated;
}
