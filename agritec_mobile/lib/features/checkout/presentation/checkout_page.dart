import 'dart:async';

import 'package:agritec_mobile/core/localization/app_localizations.dart';
import 'package:agritec_mobile/features/account/application/address_providers.dart';
import 'package:agritec_mobile/features/auth/application/auth_prompt.dart';
import 'package:agritec_mobile/features/cart/application/cart_providers.dart';
import 'package:agritec_mobile/features/checkout/application/checkout_providers.dart';
import 'package:agritec_mobile/features/checkout/presentation/payment_callback_page.dart';
import 'package:agritec_mobile/features/home/application/shell_navigation_provider.dart';
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
  bool _openingPaymentStatus = false;
  bool _isApplyingDiscount = false;
  final Map<String, String> _sellerLogisticsSelections = <String, String>{};
  String? _allGroupsLogisticsCompanyId;

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
    _synchronizeLogisticsSelections(quote);
    _queueQuoteRefreshIfNeeded(address, groups, checkoutState);

    final money = NumberFormat.currency(
      locale: 'en_NG',
      symbol: 'NGN ',
      decimalDigits: 0,
    );

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
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
              ),
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      ref.tr('checkout.selectAddress'),
                      style: const TextStyle(fontWeight: FontWeight.w700),
                    ),
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
                      key: ValueKey<String?>(
                        'addr-${_selectedAddressId ?? address?.id}',
                      ),
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
                          _allGroupsLogisticsCompanyId = null;
                          _sellerLogisticsSelections.clear();
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
              onPressed: _isApplyingDiscount || address == null
                  ? null
                  : () => _applyDiscount(address!.id),
              child: Text(
                _isApplyingDiscount
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
                  style: const TextStyle(
                    color: Colors.redAccent,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            if (checkoutState.isLoadingQuote && quote == null)
              const Center(
                child: Padding(
                  padding: EdgeInsets.symmetric(vertical: 40),
                  child: CircularProgressIndicator(),
                ),
              )
            else if (quote != null) ...[
              Builder(
                builder: (context) {
                  final hasPendingLogisticsSelection = quote.sellerGroups.any(
                    (group) => group.logisticsSelectionPending,
                  );
                  return Column(
                    children: [
              Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      ref.tr('checkout.shippingHelper'),
                      style: const TextStyle(color: Color(0xFF65706B)),
                    ),
                    if (_buildSharedLogisticsChoices(quote).isNotEmpty) ...[
                      const SizedBox(height: 8),
                      Text(
                        ref.tr('checkout.sharedLogisticsLabel'),
                        style: const TextStyle(fontWeight: FontWeight.w700),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        ref.tr('checkout.sharedLogisticsHint'),
                        style: const TextStyle(color: Color(0xFF65706B)),
                      ),
                    ],
                  ],
                ),
              ),
              if (_buildSharedLogisticsChoices(quote).isNotEmpty) ...[
                DropdownButtonFormField<String>(
                  isExpanded: true,
                  key: ValueKey<String>(
                    'all-groups-${_allGroupsLogisticsCompanyId ?? ''}',
                  ),
                  initialValue: _allGroupsLogisticsCompanyId ?? '',
                  hint: Text(ref.tr('checkout.sharedLogisticsLabel')),
                  items: [
                    DropdownMenuItem<String>(
                      value: '',
                      child: Text(ref.tr('checkout.selectPerSellerGroup')),
                    ),
                    for (final company in _buildSharedLogisticsChoices(quote))
                      DropdownMenuItem<String>(
                        value: company.id,
                        child: Text(
                          company.isNationwide
                              ? '${company.companyName} (${ref.tr('checkout.nationwide')})'
                              : '${company.companyName} (${company.pricingState ?? ref.tr('checkout.regional')})',
                        ),
                      ),
                  ],
                  onChanged: (value) {
                    setState(() {
                      _allGroupsLogisticsCompanyId =
                          (value == null || value.isEmpty) ? null : value;
                      _sellerLogisticsSelections.clear();
                      _lastQuoteKey = null;
                    });
                    ref.read(checkoutProvider.notifier).clearQuote();
                  },
                ),
                const SizedBox(height: 10),
              ],
              for (final group in quote.sellerGroups) ...[
                _SellerCheckoutCard(
                  group: group,
                  currency: money,
                  selectedLogisticsCompanyId: _allGroupsLogisticsCompanyId ??
                      _sellerLogisticsSelections[group.sellerId],
                  logisticsLockedByNationwide:
                      _allGroupsLogisticsCompanyId != null,
                  onChanged: (value) {
                    setState(() {
                      _allGroupsLogisticsCompanyId = null;
                      if (value == null || value.isEmpty) {
                        _sellerLogisticsSelections.remove(group.sellerId);
                      } else {
                        _sellerLogisticsSelections[group.sellerId] = value;
                      }
                      _lastQuoteKey = null;
                    });
                  },
                ),
                const SizedBox(height: 10),
              ],
              Card(
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    children: [
                      _line(
                        ref.tr('checkout.overallProductSubtotal'),
                        money.format(quote.productSubtotal),
                      ),
                      _line(
                        ref.tr('checkout.totalShippingFee'),
                        hasPendingLogisticsSelection
                            ? ref.tr('checkout.shippingPending')
                            : money.format(quote.totalShippingFee),
                      ),
                      _line(
                        '${ref.tr('checkout.discountTotal')}${_appliedDiscountCode != null ? ' ($_appliedDiscountCode)' : ''}',
                        '- ${money.format(quote.discountTotal)}',
                      ),
                      const Divider(),
                      _line(
                        ref.tr('checkout.finalTotalPayable'),
                        hasPendingLogisticsSelection
                            ? ref.tr('checkout.totalPending')
                            : money.format(quote.grandTotal),
                        bold: true,
                      ),
                    ],
                  ),
                ),
              ),
                    ],
                  );
                },
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
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
                onPressed: checkoutState.isInitializing ||
                        checkoutState.isVerifying ||
                        address == null ||
                        quote == null ||
                        !_hasCompleteLogisticsSelection(quote)
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
                    : _openPaymentStatusPage,
                child: Text(ref.tr('checkout.checkPaymentStatus')),
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
    if (checkoutState.isLoadingQuote ||
        checkoutState.isInitializing ||
        checkoutState.isVerifying) {
      return;
    }
    final nextKey =
        '${address.id}|${_appliedDiscountCode ?? ''}|${_allGroupsLogisticsCompanyId ?? ''}|${groups.map((item) => item.sellerId).join(',')}|${_sellerLogisticsSelections.entries.map((entry) => '${entry.key}:${entry.value}').join(',')}';
    if (_lastQuoteKey == nextKey && checkoutState.quote != null) return;
    _lastQuoteKey = nextKey;
    scheduleMicrotask(() async {
      try {
        await ref.read(checkoutProvider.notifier).refreshQuote(
              addressId: address.id,
              discountCode: _appliedDiscountCode,
              logisticsSelections:
                  _allGroupsLogisticsCompanyId == null
                      ? Map<String, String>.from(_sellerLogisticsSelections)
                      : const <String, String>{},
              allGroupsLogisticsCompanyId: _allGroupsLogisticsCompanyId,
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
      setState(() {
        _isApplyingDiscount = true;
      });
      final quote = await ref.read(checkoutProvider.notifier).refreshQuote(
            addressId: addressId,
            discountCode: code,
            logisticsSelections:
                _allGroupsLogisticsCompanyId == null
                    ? Map<String, String>.from(_sellerLogisticsSelections)
                    : const <String, String>{},
            allGroupsLogisticsCompanyId: _allGroupsLogisticsCompanyId,
          );
      if (!mounted) return;
      setState(() {
        _appliedDiscountCode = code.toUpperCase();
        _discountMessage = quote.discountTotal > 0
            ? ref.tr('checkout.discountApplied')
            : ref.tr('checkout.invalidCode');
        _lastQuoteKey =
            '$addressId|${_appliedDiscountCode ?? ''}|${_allGroupsLogisticsCompanyId ?? ''}|${quote.sellerGroups.map((item) => item.sellerId).join(',')}|${_sellerLogisticsSelections.entries.map((entry) => '${entry.key}:${entry.value}').join(',')}';
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _discountMessage = '$error';
      });
    } finally {
      if (mounted) {
        setState(() {
          _isApplyingDiscount = false;
        });
      }
    }
  }

  Future<void> _startPayment(String addressId) async {
    try {
      final session =
          await ref.read(checkoutProvider.notifier).initializePayment(
                addressId: addressId,
                discountCode: _appliedDiscountCode,
                logisticsSelections:
                    _allGroupsLogisticsCompanyId == null
                        ? Map<String, String>.from(_sellerLogisticsSelections)
                        : const <String, String>{},
                allGroupsLogisticsCompanyId: _allGroupsLogisticsCompanyId,
              );
      if (!mounted) return;
      final launched = await launchUrl(
        Uri.parse(session.authorizationUrl),
        mode: LaunchMode.externalApplication,
      );
      if (!mounted) return;
      if (!launched) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(ref.tr('checkout.paystackOpenFailed'))),
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

  Future<void> _openPaymentStatusPage() async {
    if (_openingPaymentStatus) return;
    _openingPaymentStatus = true;
    try {
      final session =
          await ref.read(checkoutProvider.notifier).getPendingPaymentSession();
      if (!mounted || session == null) return;
      await context.pushNamed(
        PaymentCallbackPage.routeName,
        queryParameters: {
          'reference': session.reference,
          'orderId': session.orderId,
        },
      );
    } finally {
      _openingPaymentStatus = false;
    }
  }

  void _synchronizeLogisticsSelections(CheckoutQuoteData? quote) {
    if (quote == null) return;
    final updates = <String, String>{};
    for (final group in quote.sellerGroups) {
      if (_sellerLogisticsSelections[group.sellerId] == null &&
          group.logisticsCompanyId != null &&
          group.logisticsCompanyId!.isNotEmpty) {
        updates[group.sellerId] = group.logisticsCompanyId!;
      }
    }
    if (updates.isEmpty) return;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      setState(() {
        _sellerLogisticsSelections.addAll(updates);
      });
    });
  }

  bool _hasCompleteLogisticsSelection(CheckoutQuoteData quote) {
    if (_allGroupsLogisticsCompanyId != null &&
        _allGroupsLogisticsCompanyId!.isNotEmpty) {
      return true;
    }
    for (final group in quote.sellerGroups) {
      if ((_sellerLogisticsSelections[group.sellerId] ?? '').isEmpty) {
        return false;
      }
    }
    return true;
  }

  List<CheckoutEligibleLogisticsCompany> _buildSharedLogisticsChoices(
    CheckoutQuoteData quote,
  ) {
    if (quote.sellerGroups.isEmpty) return const <CheckoutEligibleLogisticsCompany>[];
    final counts = <String, int>{};
    final companies = <String, CheckoutEligibleLogisticsCompany>{};
    for (final group in quote.sellerGroups) {
      final seenInGroup = <String>{};
      for (final company in group.eligibleLogisticsCompanies) {
        if (seenInGroup.contains(company.id)) continue;
        seenInGroup.add(company.id);
        counts.update(company.id, (value) => value + 1, ifAbsent: () => 1);
        companies[company.id] = company;
      }
    }
    final result = companies.values
        .where((company) => counts[company.id] == quote.sellerGroups.length)
        .toList();
    result.sort((a, b) => a.companyName.compareTo(b.companyName));
    return result;
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
              style: TextStyle(
                fontWeight: bold ? FontWeight.w700 : FontWeight.w400,
              ),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            flex: 4,
            child: Text(
              value,
              textAlign: TextAlign.right,
              softWrap: true,
              style: TextStyle(
                fontWeight: bold ? FontWeight.w700 : FontWeight.w400,
              ),
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
    required this.selectedLogisticsCompanyId,
    required this.logisticsLockedByNationwide,
    required this.onChanged,
  });

  final CheckoutSellerGroupQuote group;
  final NumberFormat currency;
  final String? selectedLogisticsCompanyId;
  final bool logisticsLockedByNationwide;
  final ValueChanged<String?> onChanged;

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
            Text(
              group.farmName,
              style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
            ),
            Text(
              group.sellerName,
              style: const TextStyle(color: Color(0xFF65706B)),
            ),
            const SizedBox(height: 8),
            DropdownButtonFormField<String>(
              isExpanded: true,
              key: ValueKey<String>(
                '${group.sellerId}-${selectedLogisticsCompanyId ?? ''}-${logisticsLockedByNationwide ? 'locked' : 'open'}',
              ),
              initialValue: selectedLogisticsCompanyId,
              hint: Text(ref.tr('checkout.selectLogistics')),
              items: [
                for (final company in group.eligibleLogisticsCompanies)
                  DropdownMenuItem<String>(
                    value: company.id,
                    child: Text(
                      company.isNationwide
                          ? '${company.companyName} (${ref.tr('checkout.nationwide')})'
                          : '${company.companyName} (${company.pricingState ?? ref.tr('checkout.regional')})',
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
              ],
              onChanged: logisticsLockedByNationwide ? null : onChanged,
            ),
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
                    Flexible(
                      child: Text(
                        currency.format(item.lineTotal),
                        textAlign: TextAlign.right,
                      ),
                    ),
                  ],
                ),
              ),
            const Divider(),
            _breakdownLine(
              ref.tr('checkout.subtotal'),
              currency.format(group.productSubtotal),
            ),
            _breakdownLine(
              ref.tr('checkout.deliveryRegion'),
              group.shippingQuote.deliveryRegion,
            ),
            if (group.logisticsCompanyName != null)
              _breakdownLine(
                ref.tr('checkout.logisticsCompany'),
                group.logisticsCompanyName!,
              ),
            _breakdownLine(
              ref.tr('checkout.chargeableWeight'),
              '${group.shippingQuote.totalChargeableWeightKg.toStringAsFixed(1)} kg',
            ),
            if (group.logisticsSelectionPending)
              _breakdownLine(
                ref.tr('checkout.shippingFee'),
                ref.tr('checkout.shippingPending'),
              )
            else
              _breakdownLine(
                ref.tr('checkout.shippingFee'),
                currency.format(group.shippingFee),
              ),
            _breakdownLine(
              ref.tr('checkout.discount'),
              '- ${currency.format(group.discountTotal)}',
            ),
            const Divider(),
            if (group.logisticsSelectionPending)
              _breakdownLine(
                ref.tr('checkout.groupTotal'),
                ref.tr('checkout.totalPending'),
                bold: true,
              )
            else
              _breakdownLine(
                ref.tr('checkout.groupTotal'),
                currency.format(group.groupTotal),
                bold: true,
              ),
          ],
        ),
      ),
    );
  }

  Widget _breakdownLine(String label, String value, {bool bold = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Text(
              label,
              softWrap: true,
              style: TextStyle(
                fontWeight: bold ? FontWeight.w700 : FontWeight.w400,
              ),
            ),
          ),
          const SizedBox(width: 8),
          Flexible(
            child: Text(
              value,
              softWrap: true,
              textAlign: TextAlign.right,
              style: TextStyle(
                fontWeight: bold ? FontWeight.w700 : FontWeight.w400,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
