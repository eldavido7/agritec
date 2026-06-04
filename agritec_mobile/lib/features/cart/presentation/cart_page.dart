import 'package:agritec_mobile/features/account/application/address_providers.dart';
import 'package:agritec_mobile/core/localization/app_localizations.dart';
import 'package:agritec_mobile/features/account/presentation/addresses_page.dart';
import 'package:agritec_mobile/features/auth/application/auth_prompt.dart';
import 'package:agritec_mobile/features/cart/application/cart_providers.dart';
import 'package:agritec_mobile/features/checkout/presentation/checkout_page.dart';
import 'package:agritec_mobile/features/home/application/shell_navigation_provider.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

class CartPage extends ConsumerWidget {
  const CartPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final groups = ref.watch(cartGroupsProvider);
    final defaultAddress = ref.watch(defaultAddressProvider);
    final total = ref.watch(cartTotalProvider);
    final itemCount = ref.watch(cartItemCountProvider);
    final money = NumberFormat.currency(
      locale: 'en_NG',
      symbol: 'NGN ',
      decimalDigits: 0,
    );

    return Container(
      color: const Color(0xFFEAF1ED),
      child: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 8, 14, 6),
              child: Row(
                children: [
                  IconButton(
                    onPressed: () {
                      if (Navigator.of(context).canPop()) {
                        Navigator.of(context).pop();
                      } else {
                        ref.read(shellTabProvider.notifier).setTab(0);
                      }
                    },
                    icon: const Icon(Icons.arrow_back_rounded),
                  ),
                  const SizedBox(width: 4),
                  Text(
                    ref.tr('cart.title'),
                    style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700),
                  ),
                ],
              ),
            ),
            Expanded(
              child: groups.isEmpty
                  ? Center(
                      child: Container(
                        margin: const EdgeInsets.all(16),
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Text(
                          ref.tr('cart.empty'),
                          style: TextStyle(color: Color(0xFF65706B)),
                        ),
                      ),
                    )
                  : Column(
                      children: [
                        Expanded(
                          child: ListView.builder(
                            padding: const EdgeInsets.fromLTRB(14, 14, 14, 10),
                            itemCount: groups.length,
                            itemBuilder: (context, index) {
                              final group = groups[index];
                              return Padding(
                                padding: const EdgeInsets.only(bottom: 10),
                                child: Card(
                                  elevation: 0,
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(18),
                                  ),
                                  child: Padding(
                                    padding: const EdgeInsets.all(12),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          group.farmName,
                                          style: const TextStyle(
                                            fontSize: 16,
                                            fontWeight: FontWeight.w700,
                                          ),
                                        ),
                                        Text(
                                          group.sellerName,
                                          style: const TextStyle(
                                            color: Color(0xFF68736D),
                                            fontSize: 12,
                                          ),
                                        ),
                                        const SizedBox(height: 10),
                                        ...group.items.map((item) {
                                          return Padding(
                                            padding: const EdgeInsets.only(bottom: 10),
                                            child: Row(
                                              crossAxisAlignment: CrossAxisAlignment.start,
                                              children: [
                                                ClipRRect(
                                                  borderRadius: BorderRadius.circular(8),
                                                  child: Image.network(
                                                    item.product.imageUrl,
                                                    width: 54,
                                                    height: 54,
                                                    fit: BoxFit.cover,
                                                    errorBuilder: (context, error, stackTrace) {
                                                      return Container(
                                                        width: 54,
                                                        height: 54,
                                                        color: const Color(0xFFE8EEEA),
                                                        alignment: Alignment.center,
                                                        padding: const EdgeInsets.all(4),
                                                        child: Text(
                                                          ref.tr('common.imageUnavailable'),
                                                          textAlign: TextAlign.center,
                                                          maxLines: 2,
                                                          overflow: TextOverflow.ellipsis,
                                                          style: TextStyle(
                                                            fontSize: 8,
                                                            color: Color(0xFF607069),
                                                          ),
                                                        ),
                                                      );
                                                    },
                                                  ),
                                                ),
                                                const SizedBox(width: 10),
                                                Expanded(
                                                  child: Column(
                                                    crossAxisAlignment: CrossAxisAlignment.start,
                                                    children: [
                                                      Text(
                                                        item.product.name,
                                                        maxLines: 2,
                                                        overflow: TextOverflow.ellipsis,
                                                        style: const TextStyle(fontWeight: FontWeight.w600),
                                                      ),
                                                      Text(
                                                        money.format(item.product.price),
                                                        style: const TextStyle(
                                                          color: Color(0xFF0D8A66),
                                                          fontWeight: FontWeight.w700,
                                                        ),
                                                      ),
                                                    ],
                                                  ),
                                                ),
                                                _QtyControl(
                                                  quantity: item.quantity,
                                                  onIncrement: () => ref.read(cartProvider.notifier).increment(item.lineKey),
                                                  onDecrement: () => ref.read(cartProvider.notifier).decrement(item.lineKey),
                                                ),
                                                IconButton(
                                                  onPressed: () => ref.read(cartProvider.notifier).remove(item.lineKey),
                                                  icon: const Icon(Icons.delete_outline_rounded),
                                                ),
                                              ],
                                            ),
                                          );
                                        }),
                                        const Divider(height: 18),
                                        Row(
                                          children: [
                                            Text(
                                              ref.tr('cart.sellerSubtotal'),
                                              style: TextStyle(
                                                color: Color(0xFF6D7772),
                                                fontWeight: FontWeight.w600,
                                              ),
                                            ),
                                            const Spacer(),
                                            Text(
                                              money.format(group.sellerTotal),
                                              style: const TextStyle(
                                                fontWeight: FontWeight.w700,
                                                color: Color(0xFF0D8A66),
                                              ),
                                            ),
                                          ],
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              );
                            },
                          ),
                        ),
                        Container(
                          margin: const EdgeInsets.fromLTRB(14, 0, 14, 12),
                          padding: const EdgeInsets.fromLTRB(14, 12, 14, 14),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Text(
                                    '$itemCount item${itemCount == 1 ? '' : 's'}',
                                    style: const TextStyle(color: Color(0xFF65706B)),
                                  ),
                                  const Spacer(),
                                  Text(
                                    '${groups.length} seller${groups.length == 1 ? '' : 's'}',
                                    style: const TextStyle(color: Color(0xFF65706B)),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 8),
                              Row(
                                children: [
                                  Text(
                                    ref.tr('cart.productSubtotal'),
                                    style: TextStyle(fontWeight: FontWeight.w700),
                                  ),
                                  const Spacer(),
                                  Text(
                                    money.format(total),
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w700,
                                      color: Color(0xFF0D8A66),
                                      fontSize: 18,
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 8),
                              // const Text(
                              //   'All seller groups will be combined into one checkout and one payment.',
                              //   style: TextStyle(color: Color(0xFF65706B)),
                              // ),
                              const SizedBox(height: 12),
                              SizedBox(
                                width: double.infinity,
                                child: ElevatedButton(
                                  onPressed: () {
                                    if (!isBuyerAuthenticated(ref)) {
                                      showBuyerAuthPrompt(
                                        context,
                                        ref,
                                        message: ref.tr('auth.required.checkout'),
                                      );
                                      return;
                                    }
                                    if (defaultAddress == null) {
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        SnackBar(
                                          content: Text(
                                            ref.tr('cart.addressRequired'),
                                          ),
                                        ),
                                      );
                                      context.pushNamed(AddressesPage.routeName);
                                      return;
                                    }
                                    context.pushNamed(CheckoutPage.routeName);
                                  },
                                  child: Text(ref.tr('cart.checkoutAll')),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

class _QtyControl extends StatelessWidget {
  const _QtyControl({
    required this.quantity,
    required this.onIncrement,
    required this.onDecrement,
  });

  final int quantity;
  final VoidCallback onIncrement;
  final VoidCallback onDecrement;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFFEAF7F2),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          IconButton(
            visualDensity: VisualDensity.compact,
            onPressed: onDecrement,
            icon: const Icon(Icons.remove_rounded),
          ),
          Text(
            '$quantity',
            style: const TextStyle(fontWeight: FontWeight.w700),
          ),
          IconButton(
            visualDensity: VisualDensity.compact,
            onPressed: onIncrement,
            icon: const Icon(Icons.add_rounded),
          ),
        ],
      ),
    );
  }
}


