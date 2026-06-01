import 'package:agritec_mobile/app/router.dart';
import 'package:agritec_mobile/core/localization/localization_controller.dart';
import 'package:agritec_mobile/core/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class AgritecBuyerApp extends ConsumerWidget {
  const AgritecBuyerApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(appRouterProvider);
    final locale = ref.watch(selectedLocaleProvider);
    return MaterialApp.router(
      debugShowCheckedModeBanner: false,
      title: 'Agritec',
      locale: Locale(locale.code),
      theme: AppTheme.lightTheme,
      routerConfig: router,
    );
  }
}
