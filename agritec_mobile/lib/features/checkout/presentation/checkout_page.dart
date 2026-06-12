import 'dart:async';

import 'package:agritec_mobile/core/localization/app_localizations.dart';
import 'package:agritec_mobile/features/account/application/address_providers.dart';
import 'package:agritec_mobile/features/auth/application/auth_prompt.dart';
import 'package:agritec_mobile/features/cart/application/cart_providers.dart';
import 'package:agritec_mobile/features/checkout/application/checkout_providers.dart';
import 'package:agritec_mobile/features/home/application/shell_navigation_provider.dart';
import 'package:agritec_mobile/features/orders/presentation/order_details_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';

class CheckoutPage extends ConsumerStatefulWidget {
  const CheckoutPage({super.key});

  static const routeName = 'checkout';
  static const routePath = '/checkout';

  @override
  ConsumerState<CheckoutPage> createState() => _CheckoutPageState();
}

class _CheckoutPageState extends ConsumerState<CheckoutPage> {
  String _discountCodeInput = '';
  String? _appliedDiscountCode;
  String? _discountMessage;
  String? _selectedAddressId;
  String? _lastQuoteKey;

  void _handleBack() {
    final nav = Navigator.of(context);
    if (nav.canPop()) {
      nav.pop();
      return;
    }
    ref.read(shellTabProvider.notifier).setTab(3);
    context.goNamed('home-shell');
  }

  @override
  Widget build(BuildContext context) {
    if (!isBuyerAuthenticated(ref)) {
      return AuthRequiredPage(
        title: ref.tr('checkout.title'),
        message: ref.tr('auth.required.checkout'),
        onBack: _handleBack,
      );
    }

    final cartState = ref.watch(cartProvider);
    final groups = ref.watch(cartGroupsProvider);
    if (groups.isEmpty) {
      return Scaffold(body: Center(child: Text(ref.tr('checkout.empty'))));
    }

    final addresses = ref.watch(addressBookProvider);
    final defaultAddress = ref.watch(defaultAddressProvider);
    _selectedAddressId ??= defaultAddress?.id;
    BuyerAddress? address;
    for (final item in addresses) {
      if (item.id == _selectedAddressId) {
        address = item;
        break;
      }
    }
    address ??= defaultAddress;

    final checkoutState = ref.watch(checkoutProvider);
    final quote = checkoutState.quote;
    _queueQuoteRefreshIfNeeded(address, groups, checkoutState);

    final money = NumberFormat.currency(locale: 'en_NG', symbol: 'NGN ', decimalDigits: 0);

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) {
          _handleBack();
        }
      },
      child: Scaffold(
        backgroundColor: const Color(0xFFEAF1ED),
        appBar: AppBar(
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_rounded),
            onPressed: _handleBack,
          ),
          title: Text(ref.tr('checkout.title')),
          actions: [
            IconButton(
              icon: const Icon(Icons.home_rounded),
              onPressed: () {
                ref.read(shellTabProvider.notifier).setTab(0);
                context.goNamed('home-shell');
              },
            ),
          ],
        ),
        body: ListView(
          padding: const EdgeInsets.fromLTRB(14, 14, 14, 16),
          children: [
            Card(
              elevation: 0,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(ref.tr('checkout.selectAddress'), style: const TextStyle(fontWeight: FontWeight.w700)),
                    const SizedBox(height: 8),
                    if (address != null)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: Text(
                          address.fullAddress,
                          softWrap: true,
                          maxLines: 3,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(color: Color(0xFF65706B)),
                        ),
                      ),
                    DropdownButtonFormField<String>(
                      isExpanded: true,
                      key: ValueKey<String?>('addr-${_selectedAddressId ?? address?.id}'),
                      initialValue: address?.id,
                      hint: Text(ref.tr('checkout.chooseAddress')),
                      items: [
                        for (final item in addresses)
                          DropdownMenuItem(
                            value: item.id,
                            child: Text(
                              '${item.label}: ${item.displayName}',
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                      ],
                      onChanged: (value) {
                        setState(() {
                          _selectedAddressId = value;
                          _lastQuoteKey = null;
                        });
                        ref.read(checkoutProvider.notifier).clearQuote();
                      },
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
              ),
              child: TextField(
                decoration: InputDecoration(
                  labelText: ref.tr('checkout.discountCode'),
                  hintText: ref.tr('checkout.discountHint'),
                  border: InputBorder.none,
                ),
                onChanged: (value) => setState(() {
                  _discountCodeInput = value;
                  _discountMessage = null;
                }),
              ),
            ),
            const SizedBox(height: 8),
            OutlinedButton(
              onPressed: checkoutState.isLoadingQuote || address == null
                  ? null
                  : () => _applyDiscount(address!.id),
              child: Text(
                checkoutState.isLoadingQuote
                    ? ref.tr('checkout.validating')
                    : ref.tr('checkout.applyCoupon'),
              ),
            ),
            if (_discountMessage != null) ...[
              const SizedBox(height: 6),
              Text(
                _discountMessage!,
                style: TextStyle(
                  color: (quote?.discountTotal ?? 0) > 0
                      ? const Color(0xFF0D8A66)
                      : const Color(0xFFB15F00),
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
            const SizedBox(height: 10),
            if (checkoutState.error != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: Text(
                  checkoutState.error!,
                  style: const TextStyle(color: Colors.redAccent, fontWeight: FontWeight.w600),
                ),
              ),
            if (checkoutState.isLoadingQuote && quote == null)
              const Center(child: Padding(
                padding: EdgeInsets.symmetric(vertical: 40),
                child: CircularProgressIndicator(),
              ))
            else if (quote != null) ...[
              for (final group in quote.sellerGroups) ...[
                _SellerCheckoutCard(group: group, currency: money),
                const SizedBox(height: 10),
              ],
              Card(
                elevation: 0,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    children: [
                      _line(ref.tr('checkout.overallProductSubtotal'), money.format(quote.productSubtotal)),
                      _line(ref.tr('checkout.totalShippingFee'), money.format(quote.totalShippingFee)),
                      _line(
                        '${ref.tr('checkout.discountTotal')}${_appliedDiscountCode != null ? ' ($_appliedDiscountCode)' : ''}',
                        '- ${money.format(quote.discountTotal)}',
                      ),
                      const Divider(),
                      _line(ref.tr('checkout.finalTotalPayable'), money.format(quote.grandTotal), bold: true),
                    ],
                  ),
                ),
              ),
            ] else
              const SizedBox.shrink(),
            const SizedBox(height: 16),
            SizedBox(
              height: 52,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF136A43),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
                onPressed: checkoutState.isInitializing || checkoutState.isVerifying || address == null || quote == null
                    ? null
                    : () => _startPayment(address!.id),
                child: Text(
                  checkoutState.isInitializing
                      ? ref.tr('checkout.confirmingPayment')
                      : ref.tr('checkout.confirmPayOnce'),
                ),
              ),
            ),
            if (checkoutState.paymentSession != null) ...[
              const SizedBox(height: 10),
              OutlinedButton(
                onPressed: checkoutState.isVerifying
                    ? null
                    : () => _verifyPayment(checkoutState.paymentSession!.reference),
                child: Text(
                  checkoutState.isVerifying ? 'Verifying payment...' : 'I have completed payment',
                ),
              ),
            ],
            if (cartState.isLoading)
              const Padding(
                padding: EdgeInsets.only(top: 12),
                child: Center(child: CircularProgressIndicator(strokeWidth: 2)),
              ),
          ],
        ),
      ),
    );
  }

  void _queueQuoteRefreshIfNeeded(
    BuyerAddress? address,
    List<SellerCartGroup> groups,
    CheckoutState checkoutState,
  ) {
    if (address == null) return;
    if (checkoutState.isLoadingQuote || checkoutState.isInitializing || checkoutState.isVerifying) {
      return;
    }
    final nextKey = '${address.id}|${_appliedDiscountCode ?? ''}|${groups.map((item) => item.sellerId).join(',')}';
    if (_lastQuoteKey == nextKey) return;
    _lastQuoteKey = nextKey;
    scheduleMicrotask(() async {
      try {
        await ref.read(checkoutProvider.notifier).refreshQuote(
              addressId: address.id,
              discountCode: _appliedDiscountCode,
            );
      } catch (_) {}
    });
  }

  Future<void> _applyDiscount(String addressId) async {
    final code = _discountCodeInput.trim();
    if (code.isEmpty) {
      setState(() {
        _appliedDiscountCode = null;
        _discountMessage = ref.tr('checkout.enterDiscountFirst');
        _lastQuoteKey = null;
      });
      ref.read(checkoutProvider.notifier).clearQuote();
      return;
    }

    try {
      final quote = await ref.read(checkoutProvider.notifier).refreshQuote(
            addressId: addressId,
            discountCode: code,
          );
      if (!mounted) return;
      setState(() {
        _appliedDiscountCode = code.toUpperCase();
        _discountMessage = quote.discountTotal > 0
            ? ref.tr('checkout.discountApplied')
            : ref.tr('checkout.invalidCode');
        _lastQuoteKey = '$addressId|${_appliedDiscountCode ?? ''}|${quote.sellerGroups.map((item) => item.sellerId).join(',')}';
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _discountMessage = '$error';
      });
    }
  }

  Future<void> _startPayment(String addressId) async {
    try {
      final session = await ref.read(checkoutProvider.notifier).initializePayment(
            addressId: addressId,
            discountCode: _appliedDiscountCode,
          );
      if (!mounted) return;
      final launched = await launchUrl(
        Uri.parse(session.authorizationUrl),
        mode: LaunchMode.externalApplication,
      );
      if (!mounted) return;
      if (!launched) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Unable to open Paystack checkout right now.')),
        );
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(ref.tr('checkout.waitingPayment'))),
      );
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('$error')),
      );
    }
  }

  Future<void> _verifyPayment(String reference) async {
    try {
      final result = await ref.read(checkoutProvider.notifier).verifyPayment(reference: reference);
      if (!mounted) return;
      if (!result.verified || result.order == null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(result.message)),
        );
        return;
      }
      await ref.read(cartProvider.notifier).clear();
      if (!mounted) return;
      await showDialog<void>(
        context: context,
        builder: (context) => Dialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(18, 18, 18, 14),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const CircleAvatar(
                  radius: 24,
                  backgroundColor: Color(0xFFE4F4EC),
                  child: Icon(Icons.check_circle_rounded, size: 30, color: Color(0xFF136A43)),
                ),
                const SizedBox(height: 12),
                const Text(
                  'Payment Successful',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 6),
                Text(
                  ref.tr('checkout.paymentSuccessBody'),
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: Color(0xFF65706B)),
                ),
                const SizedBox(height: 14),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () => Navigator.of(context).pop(),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF136A43),
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: Text(ref.tr('checkout.viewOrder')),
                  ),
                ),
              ],
            ),
          ),
        ),
      );
      if (!mounted) return;
      context.pushNamed(OrderDetailsPage.routeName, pathParameters: {'orderId': result.order!.id});
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('$error')),
      );
    }
  }

  Widget _line(String label, String value, {bool bold = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            flex: 5,
            child: Text(
              label,
              softWrap: true,
              style: TextStyle(fontWeight: bold ? FontWeight.w700 : FontWeight.w400),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            flex: 4,
            child: Text(
              value,
              textAlign: TextAlign.right,
              softWrap: true,
              style: TextStyle(fontWeight: bold ? FontWeight.w700 : FontWeight.w400),
            ),
          ),
        ],
      ),
    );
  }
}

class _SellerCheckoutCard extends ConsumerWidget {
  const _SellerCheckoutCard({
    required this.group,
    required this.currency,
  });

  final CheckoutSellerGroupQuote group;
  final NumberFormat currency;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(group.farmName, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
            Text(group.sellerName, style: const TextStyle(color: Color(0xFF65706B))),
            const SizedBox(height: 8),
            for (final item in group.items)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Text(
                        '${item.product.name} x${item.quantity}',
                        softWrap: true,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(currency.format(item.lineTotal)),
                  ],
                ),
              ),
            const Divider(),
            _breakdownLine(ref.tr('checkout.subtotal'), currency.format(group.productSubtotal)),
            _breakdownLine(ref.tr('checkout.shippingFee'), currency.format(group.shippingFee)),
            _breakdownLine(ref.tr('checkout.deliveryRegion'), group.shippingQuote.deliveryRegion),
            _breakdownLine(
              ref.tr('checkout.chargeableWeight'),
              '${group.shippingQuote.totalChargeableWeightKg.toStringAsFixed(1)} kg',
            ),
            _breakdownLine(
              ref.tr('checkout.weightUnitSize'),
              '${group.shippingQuote.weightUnitSizeKg.toStringAsFixed(1)} kg',
            ),
            _breakdownLine(ref.tr('checkout.minimumFee'), currency.format(group.shippingQuote.minimumFee)),
            _breakdownLine(ref.tr('checkout.additionalUnitFee'), currency.format(group.shippingQuote.additionalUnitFee)),
            _breakdownLine(ref.tr('checkout.shippingUnits'), '${group.shippingQuote.shippingUnits}'),
            _breakdownLine(ref.tr('checkout.discount'), '- ${currency.format(group.discountTotal)}'),
            const Divider(),
            _breakdownLine(ref.tr('checkout.groupTotal'), currency.format(group.groupTotal), bold: true),
          ],
        ),
      ),
    );
  }

  Widget _breakdownLine(String label, String value, {bool bold = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        children: [
          Expanded(child: Text(label, style: TextStyle(fontWeight: bold ? FontWeight.w700 : FontWeight.w400))),
          const SizedBox(width: 8),
          Text(value, style: TextStyle(fontWeight: bold ? FontWeight.w700 : FontWeight.w400)),
        ],
      ),
    );
  }
}
