const Duration _watOffset = Duration(hours: 1);

DateTime toWat(DateTime value) {
  final utcValue = value.isUtc ? value : value.toUtc();
  return utcValue.add(_watOffset);
}

DateTime parseWatDateTime(
  String? raw, {
  DateTime? fallback,
}) {
  final parsed = raw == null ? null : DateTime.tryParse(raw);
  if (parsed == null) {
    return fallback != null ? toWat(fallback) : toWat(DateTime.now());
  }
  return toWat(parsed);
}
