import 'package:agritec_mobile/features/home/application/home_providers.dart';
import 'package:agritec_mobile/core/localization/app_localizations.dart';
import 'package:agritec_mobile/features/home/application/shell_navigation_provider.dart';
import 'package:agritec_mobile/core/localization/localized_text.dart';
import 'package:agritec_mobile/features/product/presentation/product_details_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

class SellerDetailsPage extends ConsumerWidget {
  const SellerDetailsPage({super.key, required this.sellerId});

  final String sellerId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final sellers = ref.watch(homeSellersProvider);
    final allProducts = ref.watch(homeFeaturedProductsProvider);
    final seller = sellers.where((item) => item.id == sellerId).firstOrNull;
    final products = allProducts
        .where((product) => product.sellerId == sellerId)
        .toList();
    final money = NumberFormat.currency(
      locale: 'en_NG',
      symbol: 'NGN ',
      decimalDigits: 0,
    );

    if (sellers.isEmpty && allProducts.isEmpty) {
      return const Scaffold(
        backgroundColor: Color(0xFFEAF1ED),
        body: Center(child: CircularProgressIndicator()),
      );
    }

    if (seller == null) {
      return const Scaffold(
        backgroundColor: Color(0xFFEAF1ED),
        body: Center(
          child: Text(
            'Seller unavailable right now.',
            style: TextStyle(color: Color(0xFF65706B)),
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: const Color(0xFFEAF1ED),
      appBar: AppBar(
        title: Text(ref.tr('seller.details')),
        actions: [
          IconButton(
            icon: const Icon(Icons.home_rounded),
            onPressed: () {
              ref.read(shellTabProvider.notifier).setTab(0);
              Navigator.of(context).popUntil((route) => route.isFirst);
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
              borderRadius: BorderRadius.circular(18),
            ),
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    seller.farmName,
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    seller.name,
                    style: const TextStyle(color: Color(0xFF65706B)),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    seller.location,
                    style: const TextStyle(color: Color(0xFF65706B)),
                  ),
                  if ((seller.state ?? '').trim().isNotEmpty) ...[
                    const SizedBox(height: 4),
                    Text(
                      seller.state!.trim(),
                      style: const TextStyle(color: Color(0xFF9AB8A5)),
                    ),
                  ],
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          Text(
            ref.tr('seller.products'),
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 8),
          if (products.isEmpty)
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Text(
                  ref.tr('seller.noProducts'),
                  style: TextStyle(color: Color(0xFF65706B)),
                ),
              ),
            )
          else
            ...products.map(
              (product) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Card(
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: ListTile(
                    onTap: () => Navigator.of(context).push(
                      MaterialPageRoute<void>(
                        builder: (_) =>
                            ProductDetailsPage(productId: product.id),
                      ),
                    ),
                    leading: ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: Image.network(
                        product.imageUrl,
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
                              style: TextStyle(
                                fontSize: 8,
                                color: Color(0xFF607069),
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                    title: Text(product.name),
                    subtitle: Text(
                      product.categorySlug == 'other' &&
                              (product.categoryNote ?? '').isNotEmpty
                          ? '${trCategory(ref, product.categorySlug, product.category)} (${product.categoryNote})'
                          : trCategory(
                              ref,
                              product.categorySlug,
                              product.category,
                            ),
                    ),
                    trailing: Text(
                      money.format(product.price),
                      style: const TextStyle(
                        color: Color(0xFF0D8A66),
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}




