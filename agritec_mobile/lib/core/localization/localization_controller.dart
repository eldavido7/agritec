import 'package:agritec_mobile/core/localization/app_locale.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

const _localePreferenceKey = 'app_locale';

class LocalizationController extends AsyncNotifier<AppLocale> {
  @override
  Future<AppLocale> build() async {
    final prefs = await SharedPreferences.getInstance();
    return AppLocale.fromCode(prefs.getString(_localePreferenceKey));
  }

  Future<void> setLocale(AppLocale locale) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_localePreferenceKey, locale.code);
    state = AsyncData(locale);
  }
}

final localizationControllerProvider =
    AsyncNotifierProvider<LocalizationController, AppLocale>(
      LocalizationController.new,
    );

final selectedLocaleProvider = Provider<AppLocale>((ref) {
  return ref.watch(localizationControllerProvider).value ?? AppLocale.en;
});
