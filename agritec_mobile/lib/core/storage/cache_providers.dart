import 'package:agritec_mobile/core/services/local_cache_service.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

final sharedPreferencesProvider = FutureProvider<SharedPreferences>((
  ref,
) async {
  return SharedPreferences.getInstance();
});

final localCacheServiceProvider = FutureProvider<LocalCacheService>((
  ref,
) async {
  final prefs = await ref.watch(sharedPreferencesProvider.future);
  return LocalCacheService(prefs);
});
