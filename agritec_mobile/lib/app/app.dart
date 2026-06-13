import 'dart:async';

import 'package:agritec_mobile/app/router.dart';
import 'package:agritec_mobile/core/localization/localization_controller.dart';
import 'package:agritec_mobile/core/theme/app_theme.dart';
import 'package:agritec_mobile/features/checkout/application/checkout_providers.dart';
import 'package:agritec_mobile/features/checkout/presentation/payment_callback_page.dart';
import 'package:app_links/app_links.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class AgritecBuyerApp extends ConsumerStatefulWidget {
  const AgritecBuyerApp({super.key});

  @override
  ConsumerState<AgritecBuyerApp> createState() => _AgritecBuyerAppState();
}

class _AgritecBuyerAppState extends ConsumerState<AgritecBuyerApp>
    with WidgetsBindingObserver {
  final AppLinks _appLinks = AppLinks();
  StreamSubscription<Uri>? _linkSubscription;
  bool _handlingResume = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _linkSubscription = _appLinks.uriLinkStream.listen(
      _handleIncomingUri,
      onError: (_) {},
    );
  }

  @override
  void dispose() {
    _linkSubscription?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _maybeOpenPendingPayment();
    }
  }

  void _handleIncomingUri(Uri uri) {
    if (uri.scheme != 'agritec') return;
    if (uri.host != 'payment') return;
    if (uri.path != '/callback') return;

    final router = ref.read(appRouterProvider);
    router.goNamed(
      PaymentCallbackPage.routeName,
      queryParameters: {
        if ((uri.queryParameters['reference'] ?? '').trim().isNotEmpty)
          'reference': uri.queryParameters['reference']!,
        if ((uri.queryParameters['orderId'] ?? '').trim().isNotEmpty)
          'orderId': uri.queryParameters['orderId']!,
        if ((uri.queryParameters['status'] ?? '').trim().isNotEmpty)
          'status': uri.queryParameters['status']!,
      },
    );
  }

  Future<void> _maybeOpenPendingPayment() async {
    if (_handlingResume) return;
    _handlingResume = true;
    try {
      final session = await ref.read(checkoutProvider.notifier).getPendingPaymentSession();
      if (!mounted || session == null) return;

      final router = ref.read(appRouterProvider);
      final currentLocation = router.routeInformationProvider.value.uri.toString();
      if (currentLocation.startsWith(PaymentCallbackPage.routePath)) {
        return;
      }

      router.goNamed(
        PaymentCallbackPage.routeName,
        queryParameters: {
          'reference': session.reference,
          'orderId': session.orderId,
        },
      );
    } finally {
      _handlingResume = false;
    }
  }

  @override
  Widget build(BuildContext context) {
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
