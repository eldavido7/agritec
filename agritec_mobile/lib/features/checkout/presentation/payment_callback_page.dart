import 'dart:async';

import 'package:agritec_mobile/core/localization/app_localizations.dart';
import 'package:agritec_mobile/features/checkout/application/checkout_providers.dart';
import 'package:agritec_mobile/features/home/presentation/main_shell_page.dart';
import 'package:agritec_mobile/features/orders/presentation/order_details_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

class PaymentCallbackPage extends ConsumerStatefulWidget {
  const PaymentCallbackPage({
    super.key,
    this.reference,
    this.orderId,
    this.status,
  });

  static const routeName = 'payment-callback';
  static const routePath = '/payment/callback';

  final String? reference;
  final String? orderId;
  final String? status;

  @override
  ConsumerState<PaymentCallbackPage> createState() => _PaymentCallbackPageState();
}

class _PaymentCallbackPageState extends ConsumerState<PaymentCallbackPage> {
  static const _pollInterval = Duration(seconds: 3);
  static const _maxPollAttempts = 10;

  CheckoutPaymentStatusResult? _result;
  String? _error;
  bool _isChecking = true;
  bool _didNavigateToOrder = false;
  int _pollAttempts = 0;
  Timer? _pollTimer;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _checkStatus();
    });
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    super.dispose();
  }

  Future<void> _checkStatus({bool resetPolling = false}) async {
    if (resetPolling) {
      _pollAttempts = 0;
      _pollTimer?.cancel();
    }

    setState(() {
      _isChecking = true;
      _error = null;
    });

    try {
      final session = await ref.read(checkoutProvider.notifier).getPendingPaymentSession();
      final reference = widget.reference ?? session?.reference;
      final orderId = widget.orderId ?? session?.orderId;
      if (reference == null || reference.trim().isEmpty) {
        setState(() {
          _isChecking = false;
          _error = ref.tr('paymentCallback.noPending');
        });
        return;
      }

      final result = await ref.read(checkoutProvider.notifier).checkPaymentStatus(
            reference: reference,
            orderId: orderId,
          );
      if (!mounted) return;

      setState(() {
        _result = result;
        _isChecking = false;
      });

      if (result.isPaid && result.order != null && !_didNavigateToOrder) {
        _didNavigateToOrder = true;
        await Future<void>.delayed(const Duration(milliseconds: 700));
        if (!mounted) return;
        context.goNamed(
          OrderDetailsPage.routeName,
          pathParameters: {'orderId': result.order!.id},
        );
        return;
      }

      if ((result.isPending || result.isPendingTimeout) && _pollAttempts < _maxPollAttempts && !result.isPendingTimeout) {
        _pollAttempts += 1;
        _pollTimer?.cancel();
        _pollTimer = Timer(_pollInterval, () {
          if (mounted) {
            _checkStatus();
          }
        });
      }
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _isChecking = false;
        _error = '$error';
      });
    }
  }

  Future<void> _retryPayment() async {
    final session = await ref.read(checkoutProvider.notifier).getPendingPaymentSession();
    if (session == null) {
      if (!mounted) return;
      setState(() {
        _error = ref.tr('paymentCallback.noPending');
      });
      return;
    }

    final launched = await launchUrl(
      Uri.parse(session.authorizationUrl),
      mode: LaunchMode.externalApplication,
    );
    if (!mounted) return;
    if (!launched) {
      setState(() {
        _error = ref.tr('paymentCallback.retryOpenFailed');
      });
      return;
    }

    setState(() {
      _error = null;
      _isChecking = true;
    });
  }

  void _goHome() {
    context.goNamed(MainShellPage.routeName);
  }

  @override
  Widget build(BuildContext context) {
    final status = _result?.status.toUpperCase() ?? widget.status?.toUpperCase();

    return Scaffold(
      appBar: AppBar(
        title: Text(ref.tr('paymentCallback.title')),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: _goHome,
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.home_rounded),
            onPressed: _goHome,
          ),
        ],
      ),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 420),
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Card(
              elevation: 0,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (_isChecking) ...[
                      const CircularProgressIndicator(),
                      const SizedBox(height: 16),
                      Text(
                        ref.tr('paymentCallback.checking'),
                        textAlign: TextAlign.center,
                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        ref.tr('paymentCallback.checkingHint'),
                        textAlign: TextAlign.center,
                        style: const TextStyle(color: Color(0xFF65706B)),
                      ),
                    ] else if (_error != null) ...[
                      const Icon(Icons.error_outline_rounded, size: 52, color: Colors.redAccent),
                      const SizedBox(height: 16),
                      Text(
                        ref.tr('paymentCallback.failed'),
                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        _error!,
                        textAlign: TextAlign.center,
                        style: const TextStyle(color: Color(0xFF65706B)),
                      ),
                    ] else if (status == 'PAID') ...[
                      const Icon(Icons.check_circle_rounded, size: 56, color: Color(0xFF136A43)),
                      const SizedBox(height: 16),
                      Text(
                        ref.tr('paymentCallback.success'),
                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        ref.tr('paymentCallback.successHint'),
                        textAlign: TextAlign.center,
                        style: const TextStyle(color: Color(0xFF65706B)),
                      ),
                    ] else if (status == 'FAILED' || status == 'CANCELLED') ...[
                      const Icon(Icons.cancel_rounded, size: 56, color: Color(0xFFD9534F)),
                      const SizedBox(height: 16),
                      Text(
                        ref.tr('paymentCallback.failed'),
                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        _result?.message ?? ref.tr('paymentCallback.failedHint'),
                        textAlign: TextAlign.center,
                        style: const TextStyle(color: Color(0xFF65706B)),
                      ),
                    ] else ...[
                      const Icon(Icons.hourglass_top_rounded, size: 56, color: Color(0xFFB15F00)),
                      const SizedBox(height: 16),
                      Text(
                        status == 'PENDING_TIMEOUT'
                            ? ref.tr('paymentCallback.pendingTimeout')
                            : ref.tr('paymentCallback.pending'),
                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        _result?.message ?? ref.tr('paymentCallback.pendingHint'),
                        textAlign: TextAlign.center,
                        style: const TextStyle(color: Color(0xFF65706B)),
                      ),
                    ],
                    const SizedBox(height: 18),
                    if (_result != null && _result!.reference.isNotEmpty)
                      Text(
                        'Ref: ${_result!.reference}',
                        textAlign: TextAlign.center,
                        style: const TextStyle(fontSize: 12, color: Color(0xFF65706B)),
                      ),
                    const SizedBox(height: 18),
                    if (!_isChecking) ...[
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          onPressed: _checkStatus,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF136A43),
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                          ),
                          child: Text(ref.tr('paymentCallback.checkAgain')),
                        ),
                      ),
                      if (status == 'FAILED' || status == 'CANCELLED' || status == 'PENDING_TIMEOUT') ...[
                        const SizedBox(height: 10),
                        SizedBox(
                          width: double.infinity,
                          child: OutlinedButton(
                            onPressed: _retryPayment,
                            child: Text(ref.tr('paymentCallback.retryPayment')),
                          ),
                        ),
                      ],
                    ],
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

