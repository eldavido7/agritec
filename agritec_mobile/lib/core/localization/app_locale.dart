enum AppLocale {
  en('en', 'English'),
  yo('yo', 'Yoruba'),
  ha('ha', 'Hausa'),
  ig('ig', 'Igbo');

  const AppLocale(this.code, this.label);

  final String code;
  final String label;

  static AppLocale fromCode(String? code) {
    return AppLocale.values.firstWhere(
      (locale) => locale.code == code,
      orElse: () => AppLocale.en,
    );
  }
}
