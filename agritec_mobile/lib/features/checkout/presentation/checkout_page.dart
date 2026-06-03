import 'dart:async';

import 'package:agritec_mobile/core/logistics/logistics_models.dart';
import 'package:agritec_mobile/core/logistics/shipping_calculator.dart';
import 'package:agritec_mobile/features/account/application/address_providers.dart';
import 'package:agritec_mobile/features/auth/application/auth_prompt.dart';
import 'package:agritec_mobile/features/cart/application/cart_providers.dart';
import 'package:agritec_mobile/features/home/application/shell_navigation_provider.dart';
import 'package:agritec_mobile/features/orders/application/order_providers.dart';
import 'package:agritec_mobile/features/orders/presentation/order_details_page.dart';
import 'package:agritec_mobile/features/product/application/product_details_providers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

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
  bool _isValidatingDiscount = false;
  bool _isPaying = false;
  String? _selectedAddressId;
  Map<String, int> _discountsBySeller = const {};

  @override
  Widget build(BuildContext context) {
    if (!isBuyerAuthenticated(ref)) {
      return AuthRequiredPage(
        title: 'Checkout',
        message: 'Sign in to complete your order.',
        onBack: () {
          if (Navigator.of(context).canPop()) {
            Navigator.of(context).pop();
          } else {
            ref.read(shellTabProvider.notifier).setTab(3);
            context.goNamed('home-shell');
          }
        },
      );
    }

    final groups = ref.watch(cartGroupsProvider);
    if (groups.isEmpty) {
      return const Scaffold(body: Center(child: Text('Your cart is empty.')));
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

    final shippingQuotes = <String, ShippingQuote>{};
    for (final group in groups) {
      shippingQuotes[group.sellerId] = calculatePlatformShippingQuote(
        items: group.items,
        buyerAddress: address,
      );
    }

    final productSubtotal = groups.fold(0, (sum, group) => sum + group.sellerTotal);
    final totalShippingFee = shippingQuotes.values.fold(0, (sum, quote) => sum + quote.shippingFee);
    final discountTotal = _discountsBySeller.values.fold(0, (sum, value) => sum + value);
    final grandTotal = productSubtotal + totalShippingFee - discountTotal;
    final money = NumberFormat.currency(locale: 'en_NG', symbol: 'NGN ', decimalDigits: 0);

    return Scaffold(
      backgroundColor: const Color(0xFFEAF1ED),
      appBar: AppBar(
        title: const Text('Checkout'),
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
                  const Text('Select Address', style: TextStyle(fontWeight: FontWeight.w700)),
                  const SizedBox(height: 8),
                  if (address != null)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Text(
                        'Selected: ${address.fullAddress}',
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
                    hint: const Text('Choose a delivery address'),
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
                    onChanged: (value) => setState(() => _selectedAddressId = value),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 10),
          for (final group in groups) ...[
            _SellerCheckoutCard(
              group: group,
              shippingQuote: shippingQuotes[group.sellerId]!,
              discountAmount: _discountsBySeller[group.sellerId] ?? 0,
              currency: money,
            ),
            const SizedBox(height: 10),
          ],
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
            ),
            child: TextField(
              decoration: const InputDecoration(
                labelText: 'Discount Code',
                hintText: 'Enter code for any eligible seller items',
                border: InputBorder.none,
              ),
              onChanged: (value) => setState(() {
                _discountCodeInput = value;
                _discountsBySeller = const {};
                _appliedDiscountCode = null;
                _discountMessage = null;
              }),
            ),
          ),
          const SizedBox(height: 8),
          OutlinedButton(
            onPressed: _isValidatingDiscount ? null : () => _applyDiscount(groups),
            child: Text(_isValidatingDiscount ? 'Validating...' : 'Apply Coupon'),
          ),
          if (_discountMessage != null) ...[
            const SizedBox(height: 6),
            Text(
              _discountMessage!,
              style: TextStyle(
                color: discountTotal > 0 ? const Color(0xFF0D8A66) : const Color(0xFFB15F00),
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
          const SizedBox(height: 10),
          Card(
            elevation: 0,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                children: [
                  _line('Overall product subtotal', money.format(productSubtotal)),
                  _line('Total shipping fee', money.format(totalShippingFee)),
                  _line(
                    'Discount total${_appliedDiscountCode != null ? ' ($_appliedDiscountCode)' : ''}',
                    '- ${money.format(discountTotal)}',
                  ),
                  const Divider(),
                  _line('Final total payable', money.format(grandTotal), bold: true),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          SizedBox(
            height: 52,
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF136A43),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
              onPressed: _isPaying || address == null
                  ? null
                  : () async {
                      setState(() => _isPaying = true);
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Waiting for Paystack payment confirmation...')),
                      );
                      await Future<void>.delayed(const Duration(seconds: 2));
                      if (!mounted) return;
                      final order = ref.read(ordersProvider.notifier).createOrder(
                            groups: groups,
                            buyerAddress: address!,
                            shippingQuotes: shippingQuotes,
                            discountsBySeller: _discountsBySeller,
                            discountCode: _appliedDiscountCode,
                          );
                      ref.read(cartProvider.notifier).clear();
                      setState(() => _isPaying = false);
                      if (!context.mounted) return;
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
                                  'Your combined marketplace order has been placed successfully.',
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
                                    child: const Text('View Order'),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      );
                      if (!context.mounted) return;
                      context.pushNamed(OrderDetailsPage.routeName, pathParameters: {'orderId': order.id});
                    },
              child: Text(_isPaying ? 'Confirming Payment...' : 'Confirm & Pay Once'),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _applyDiscount(List<SellerCartGroup> groups) async {
    final code = _discountCodeInput.trim().toUpperCase();
    if (code.isEmpty) {
      setState(() {
        _discountsBySeller = const {};
        _appliedDiscountCode = null;
        _discountMessage = 'Enter a discount code first.';
      });
      return;
    }
    setState(() {
      _isValidatingDiscount = true;
      _discountMessage = null;
    });
    await Future<void>.delayed(const Duration(milliseconds: 900));
    if (!mounted) return;

    final nextDiscounts = <String, int>{};
    var matched = false;

    for (final group in groups) {
      var groupDiscount = 0;
      for (final line in group.items) {
        final discount = ref.read(productDiscountProvider(line.product.id));
        if (discount == null || !discount.isActive) continue;
        if (discount.code.toUpperCase() != code) continue;
        matched = true;
        final lineSubtotal = line.product.price * line.quantity;
        if (discount.type == 'percentage') {
          groupDiscount += ((lineSubtotal * discount.value) / 100).round();
        } else {
          groupDiscount += (discount.value * line.quantity).round();
        }
      }
      if (groupDiscount > 0) {
        nextDiscounts[group.sellerId] = groupDiscount;
      }
    }

    setState(() {
      _isValidatingDiscount = false;
      if (!matched) {
        _discountsBySeller = const {};
        _appliedDiscountCode = null;
        _discountMessage = 'Code is invalid for the items in this checkout.';
        return;
      }
      _discountsBySeller = nextDiscounts;
      _appliedDiscountCode = code;
      _discountMessage = 'Discount applied successfully across eligible seller groups.';
    });
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

class _SellerCheckoutCard extends StatelessWidget {
  const _SellerCheckoutCard({
    required this.group,
    required this.shippingQuote,
    required this.discountAmount,
    required this.currency,
  });

  final SellerCartGroup group;
  final ShippingQuote shippingQuote;
  final int discountAmount;
  final NumberFormat currency;

  @override
  Widget build(BuildContext context) {
    final groupTotal = group.sellerTotal + shippingQuote.shippingFee - discountAmount;
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
            _breakdownLine('Subtotal', currency.format(group.sellerTotal)),
            _breakdownLine('Shipping fee', currency.format(shippingQuote.shippingFee)),
            if (shippingQuote.usedVolumetricWeight && shippingQuote.totalVolumetricWeightKg != null)
              _breakdownLine('Chargeable weight', '${shippingQuote.totalChargeableWeightKg.toStringAsFixed(1)} kg'),
            if (!shippingQuote.usedVolumetricWeight)
              const Padding(
                padding: EdgeInsets.only(bottom: 4),
                child: Text(
                  'Using actual weight only for this seller group.',
                  style: TextStyle(color: Color(0xFF65706B), fontSize: 12),
                ),
              ),
            _breakdownLine('Discount', '- ${currency.format(discountAmount)}'),
            const Divider(),
            _breakdownLine('Group total', currency.format(groupTotal), bold: true),
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

