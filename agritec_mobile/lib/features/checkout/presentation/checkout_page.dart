import 'dart:async';

import 'package:agritec_mobile/core/logistics/shipping_calculator.dart';
import 'package:agritec_mobile/features/account/application/address_providers.dart';
import 'package:agritec_mobile/features/auth/application/auth_prompt.dart';
import 'package:agritec_mobile/features/cart/application/cart_providers.dart';
import 'package:agritec_mobile/features/home/application/home_providers.dart';
import 'package:agritec_mobile/features/home/application/shell_navigation_provider.dart';
import 'package:agritec_mobile/features/orders/application/order_providers.dart';
import 'package:agritec_mobile/features/orders/presentation/order_details_page.dart';
import 'package:agritec_mobile/features/product/application/product_details_providers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

class CheckoutPage extends ConsumerStatefulWidget {
  const CheckoutPage({super.key, required this.sellerId});

  static const routeName = 'checkout';
  static const routePath = '/checkout/:sellerId';
  final String sellerId;

  @override
  ConsumerState<CheckoutPage> createState() => _CheckoutPageState();
}

class _CheckoutPageState extends ConsumerState<CheckoutPage> {
  String _discountCodeInput = '';
  int _appliedDiscountAmount = 0;
  String? _appliedDiscountCode;
  String? _discountMessage;
  bool _isValidatingDiscount = false;
  bool _isPaying = false;
  String? _selectedAddressId;

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
    SellerCartGroup? group;
    for (final item in groups) {
      if (item.sellerId == widget.sellerId) {
        group = item;
        break;
      }
    }
    if (group == null) {
      return const Scaffold(
        body: Center(child: Text('No cart items for this seller.')),
      );
    }
    final selectedGroup = group;
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
    final shippingQuote = calculatePlatformShippingQuote(items: selectedGroup.items, buyerAddress: address);
    final subtotal = selectedGroup.sellerTotal;
    final discount = _appliedDiscountAmount;
    final shippingFee = shippingQuote.shippingFee;
    final total = subtotal + shippingFee - discount;
    final money = NumberFormat.currency(
      locale: 'en_NG',
      symbol: 'NGN ',
      decimalDigits: 0,
    );

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
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
            ),
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Select Address',
                    style: TextStyle(fontWeight: FontWeight.w700),
                  ),
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
                    key: ValueKey<String?>(
                      'addr-${_selectedAddressId ?? address?.id}',
                    ),
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
                    onChanged: (value) =>
                        setState(() => _selectedAddressId = value),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 10),
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
                  const Text(
                    'Shipping Breakdown',
                    style: TextStyle(fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 8),
                  _line('Delivery region', shippingQuote.deliveryRegion),
                  _line(
                    'Chargeable weight',
                    '${shippingQuote.totalChargeableWeightKg.toStringAsFixed(1)} kg',
                  ),
                  _line(
                    'Shipping units',
                    '${shippingQuote.shippingUnits} x ${money.format(shippingQuote.locationRate)}',
                  ),
                  const Divider(),
                  _line('Shipping fee', money.format(shippingFee), bold: true),
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
              decoration: const InputDecoration(
                labelText: 'Discount Code',
                hintText: 'Enter code (example: RICE15)',
                border: InputBorder.none,
              ),
              onChanged: (value) => setState(() {
                _discountCodeInput = value;
                _appliedDiscountAmount = 0;
                _appliedDiscountCode = null;
                _discountMessage = null;
              }),
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: _isValidatingDiscount
                      ? null
                      : () => _applyDiscount(selectedGroup),
                  child: Text(
                    _isValidatingDiscount ? 'Validating...' : 'Apply Coupon',
                  ),
                ),
              ),
            ],
          ),
          if (_discountMessage != null) ...[
            const SizedBox(height: 6),
            Text(
              _discountMessage!,
              style: TextStyle(
                color: _appliedDiscountAmount > 0
                    ? const Color(0xFF0D8A66)
                    : const Color(0xFFB15F00),
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
          const SizedBox(height: 10),
          Card(
            elevation: 0,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
            ),
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                children: [
                  _line('Subtotal', money.format(subtotal)),
                  _line('Shipping', money.format(shippingFee)),
                  _line(
                    'Discount${_appliedDiscountCode != null ? ' ($_appliedDiscountCode)' : ''}',
                    '- ${money.format(discount)}',
                  ),
                  const Divider(),
                  _line('Total', money.format(total), bold: true),
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
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
              ),
              onPressed: _isPaying || address == null
                  ? null
                  : () async {
                      setState(() => _isPaying = true);
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text(
                            'Waiting for Paystack payment confirmation...',
                          ),
                        ),
                      );
                      await Future<void>.delayed(const Duration(seconds: 2));
                      if (!mounted) return;
                      final order = ref
                          .read(ordersProvider.notifier)
                          .createOrder(
                            group: selectedGroup,
                            buyerAddress: address!,
                            shippingQuote: shippingQuote,
                            discountAmount: discount,
                            discountCode: _appliedDiscountCode,
                          );
                      final products = ref.read(homeFeaturedProductsProvider);
                      ref
                          .read(cartProvider.notifier)
                          .clearSeller(widget.sellerId, products);
                      setState(() => _isPaying = false);
                      if (!context.mounted) return;
                      await showDialog<void>(
                        context: context,
                        builder: (context) => Dialog(
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(18),
                          ),
                          child: Padding(
                            padding: const EdgeInsets.fromLTRB(18, 18, 18, 14),
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const CircleAvatar(
                                  radius: 24,
                                  backgroundColor: Color(0xFFE4F4EC),
                                  child: Icon(
                                    Icons.check_circle_rounded,
                                    size: 30,
                                    color: Color(0xFF136A43),
                                  ),
                                ),
                                const SizedBox(height: 12),
                                const Text(
                                  'Payment Successful',
                                  style: TextStyle(
                                    fontSize: 18,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                                const SizedBox(height: 6),
                                const Text(
                                  'Your order has been placed successfully.',
                                  textAlign: TextAlign.center,
                                  style: TextStyle(color: Color(0xFF65706B)),
                                ),
                                const SizedBox(height: 14),
                                SizedBox(
                                  width: double.infinity,
                                  child: ElevatedButton(
                                    onPressed: () =>
                                        Navigator.of(context).pop(),
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: const Color(0xFF136A43),
                                      foregroundColor: Colors.white,
                                      shape: RoundedRectangleBorder(
                                        borderRadius: BorderRadius.circular(12),
                                      ),
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
                      context.pushNamed(
                        OrderDetailsPage.routeName,
                        pathParameters: {'orderId': order.id},
                      );
                    },
              child: Text(
                _isPaying ? 'Confirming Payment...' : 'Confirm & Pay',
              ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _applyDiscount(SellerCartGroup group) async {
    final code = _discountCodeInput.trim().toUpperCase();
    if (code.isEmpty) {
      setState(() {
        _appliedDiscountAmount = 0;
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

    var discountAmount = 0;
    var matched = false;
    for (final line in group.items) {
      final discount = ref.read(productDiscountProvider(line.product.id));
      if (discount == null || !discount.isActive) continue;
      if (discount.code.toUpperCase() != code) continue;
      matched = true;
      final lineSubtotal = line.product.price * line.quantity;
      if (discount.type == 'percentage') {
        discountAmount += ((lineSubtotal * discount.value) / 100).round();
      } else {
        discountAmount += (discount.value * line.quantity).round();
      }
    }

    setState(() {
      _isValidatingDiscount = false;
      if (!matched) {
        _appliedDiscountAmount = 0;
        _appliedDiscountCode = null;
        _discountMessage =
            'Code is invalid for the products in this checkout.';
        return;
      }
      _appliedDiscountAmount = discountAmount;
      _appliedDiscountCode = code;
      _discountMessage = 'Discount applied successfully.';
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





