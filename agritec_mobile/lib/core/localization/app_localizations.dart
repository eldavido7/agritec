import 'package:agritec_mobile/core/localization/app_locale.dart';
import 'package:agritec_mobile/core/localization/localization_controller.dart';
import 'package:agritec_mobile/core/localization/translations.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class AppLocalizations {
  const AppLocalizations(this.locale);

  final AppLocale locale;

  String translate(String key) {
    return appTranslations[locale.code]?[key] ??
        appTranslations[AppLocale.en.code]?[key] ??
        key;
  }
}

final appLocalizationsProvider = Provider<AppLocalizations>((ref) {
  return AppLocalizations(ref.watch(selectedLocaleProvider));
});

extension AppLocalizationRef on WidgetRef {
  String tr(String key) => watch(appLocalizationsProvider).translate(key);
}

extension AppLocalizationContext on BuildContext {
  String tr(WidgetRef ref, String key) => ref.tr(key);
}
