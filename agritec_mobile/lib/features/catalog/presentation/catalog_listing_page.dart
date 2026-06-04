import 'package:agritec_mobile/features/catalog/application/catalog_providers.dart';
import 'package:agritec_mobile/core/localization/app_localizations.dart';
import 'package:agritec_mobile/core/localization/localized_text.dart';
import 'package:agritec_mobile/features/auth/application/auth_prompt.dart';
import 'package:agritec_mobile/features/home/application/home_providers.dart';
import 'package:agritec_mobile/features/home/application/shell_navigation_provider.dart';
import 'package:agritec_mobile/features/product/presentation/product_details_page.dart';
import 'package:agritec_mobile/features/wishlist/application/wishlist_providers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

class CatalogListingPage extends ConsumerStatefulWidget {
  const CatalogListingPage({super.key});

  @override
  ConsumerState<CatalogListingPage> createState() => _CatalogListingPageState();
}

class _CatalogListingPageState extends ConsumerState<CatalogListingPage> {
  static const _itemsPerPage = 10;
  int _currentPage = 1;

  @override
  Widget build(BuildContext context) {
    final products = ref.watch(filteredCatalogProductsProvider);
    final selectedCategory = ref.watch(catalogCategoryProvider);
    final sort = ref.watch(catalogSortProvider);
    final authenticated = isBuyerAuthenticated(ref);
    final money = NumberFormat.currency(
      locale: 'en_NG',
      symbol: 'N',
      decimalDigits: 0,
    );

    final totalPages = (products.length / _itemsPerPage).ceil().clamp(1, 9999);
    final safePage = _currentPage > totalPages ? totalPages : _currentPage;
    final pageItems = products
        .skip((safePage - 1) * _itemsPerPage)
        .take(_itemsPerPage)
        .toList();
    return Scaffold(
      backgroundColor: const Color(0xFFEAF1ED),
      appBar: AppBar(
        title: Text(ref.tr('products.title')),
        actions: [
          IconButton(
            onPressed: () {
              ref.read(shellTabProvider.notifier).setTab(0);
              Navigator.of(context).popUntil((route) => route.isFirst);
            },
            icon: const Icon(Icons.home_rounded),
          ),
          IconButton(
            onPressed: () => _openSortSheet(context, ref, sort),
            icon: const Icon(Icons.sort_rounded),
          ),
          IconButton(
            onPressed: () => _openFilterSheet(context, ref, selectedCategory),
            icon: const Icon(Icons.filter_alt_rounded),
          ),
        ],
      ),
      body: products.isEmpty
          ? Center(
              child: Text(
                ref.tr('products.empty'),
                style: const TextStyle(color: Color(0xFF6A746F)),
              ),
            )
          : ListView.separated(
              padding: const EdgeInsets.fromLTRB(14, 14, 14, 16),
              itemBuilder: (context, index) {
                final product = pageItems[index];
                final seller = ref.watch(
                  homeSellerByIdProvider(product.sellerId),
                );
                final isSaved =
                    authenticated && ref.watch(wishlistProvider).contains(product.id);
                return InkWell(
                  borderRadius: BorderRadius.circular(20),
                  onTap: () {
                    Navigator.of(context).push(
                      MaterialPageRoute<void>(
                        builder: (_) =>
                            ProductDetailsPage(productId: product.id),
                      ),
                    );
                  },
                  child: Card(
                    elevation: 0,
                    color: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(18),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.all(10),
                      child: Row(
                        children: [
                          ClipRRect(
                            borderRadius: BorderRadius.circular(12),
                            child: Image.network(
                              product.imageUrl,
                              width: 84,
                              height: 84,
                              fit: BoxFit.cover,
                              errorBuilder: (context, error, stackTrace) =>
                                  Container(
                                    width: 84,
                                    height: 84,
                                    color: const Color(0xFFE8EEEA),
                                    alignment: Alignment.center,
                                    padding: const EdgeInsets.all(6),
                                    child: Text(
                                      ref.tr('common.imageUnavailable'),
                                      maxLines: 2,
                                      overflow: TextOverflow.ellipsis,
                                      textAlign: TextAlign.center,
                                      style: TextStyle(
                                        fontSize: 11,
                                        color: Color(0xFF607069),
                                      ),
                                    ),
                                  ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  product.name,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  '${seller.farmName} * ${product.category}${product.categorySlug == 'other' && (product.categoryNote ?? '').isNotEmpty ? ' (${product.categoryNote})' : ''}',
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    fontSize: 12,
                                    color: Color(0xFF66726B),
                                  ),
                                ),
                                const SizedBox(height: 8),
                                Row(
                                  children: [
                                    Text(
                                      '${money.format(product.price)} per ${product.salesUnitLabel}',
                                      style: const TextStyle(
                                        color: Color(0xFF0D8A66),
                                        fontWeight: FontWeight.w700,
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    if (product.hasDiscount)
                                      Container(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 8,
                                          vertical: 3,
                                        ),
                                        decoration: BoxDecoration(
                                          color: const Color(0xFFFFE9CC),
                                          borderRadius: BorderRadius.circular(
                                            999,
                                          ),
                                        ),
                                        child: Text(
                                          product.discountLabel ?? ref.tr('product.offer'),
                                          style: const TextStyle(
                                            fontSize: 11,
                                            fontWeight: FontWeight.w700,
                                            color: Color(0xFFB15F00),
                                          ),
                                        ),
                                      ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                          IconButton(
                            onPressed: () {
                              if (!isBuyerAuthenticated(ref)) {
                                showBuyerAuthPrompt(
                                  context,
                                  ref,
                                  message: ref.tr('auth.required.wishlist'),
                                );
                                return;
                              }
                              ref
                                  .read(wishlistProvider.notifier)
                                  .toggle(product.id);
                            },
                            icon: Icon(
                              isSaved
                                  ? Icons.favorite_rounded
                                  : Icons.favorite_border_rounded,
                              color: isSaved ? const Color(0xFFCC3D1F) : null,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              },
              separatorBuilder: (context, index) => const SizedBox(height: 6),
              itemCount: pageItems.length,
            ),
      bottomNavigationBar: products.length <= _itemsPerPage
          ? null
          : SafeArea(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('${ref.tr('products.page')} $safePage/$totalPages'),
                      Row(
                        children: [
                          IconButton(
                            onPressed: safePage > 1
                                ? () => setState(
                                      () => _currentPage = safePage - 1,
                                    )
                                : null,
                            icon: const Icon(Icons.chevron_left_rounded),
                          ),
                          IconButton(
                            onPressed: safePage < totalPages
                                ? () => setState(
                                      () => _currentPage = safePage + 1,
                                    )
                                : null,
                            icon: const Icon(Icons.chevron_right_rounded),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ),
    );
  }

  void _openSortSheet(
    BuildContext context,
    WidgetRef ref,
    CatalogSortOption selected,
  ) {
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (_) {
        return Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                ref.tr('products.sortBy'),
                style: const TextStyle(
                  fontWeight: FontWeight.w700,
                  fontSize: 18,
                ),
              ),
              const SizedBox(height: 8),
              ...CatalogSortOption.values.map((option) {
                final isSelected = option == selected;
                return ListTile(
                  onTap: () {
                    ref.read(catalogSortProvider.notifier).setSort(option);
                    Navigator.of(context).pop();
                  },
                  leading: Icon(
                    isSelected
                        ? Icons.radio_button_checked_rounded
                        : Icons.radio_button_unchecked_rounded,
                    color: isSelected
                        ? const Color(0xFF0D8A66)
                        : const Color(0xFF7A8580),
                  ),
                  title: Text(_sortLabel(ref, option)),
                );
              }),
            ],
          ),
        );
      },
    );
  }

  void _openFilterSheet(
    BuildContext context,
    WidgetRef ref,
    String? selectedCategory,
  ) {
    final categories = ref.read(catalogCategoriesProvider);
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (_) {
        return Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                ref.tr('products.filterByCategory'),
                style: const TextStyle(
                  fontWeight: FontWeight.w700,
                  fontSize: 18,
                ),
              ),
              const SizedBox(height: 8),
              ListTile(
                onTap: () {
                  ref.read(catalogCategoryProvider.notifier).setCategory(null);
                  Navigator.of(context).pop();
                },
                leading: Icon(
                  selectedCategory == null
                      ? Icons.radio_button_checked_rounded
                      : Icons.radio_button_unchecked_rounded,
                  color: selectedCategory == null
                      ? const Color(0xFF0D8A66)
                      : const Color(0xFF7A8580),
                ),
                title: Text(ref.tr('products.allCategories')),
              ),
              ...categories.map((category) {
                final isSelected = selectedCategory == category.slug;
                return ListTile(
                  onTap: () {
                    ref
                        .read(catalogCategoryProvider.notifier)
                        .setCategory(category.slug);
                    Navigator.of(context).pop();
                  },
                  leading: Icon(
                    isSelected
                        ? Icons.radio_button_checked_rounded
                        : Icons.radio_button_unchecked_rounded,
                    color: isSelected
                        ? const Color(0xFF0D8A66)
                        : const Color(0xFF7A8580),
                  ),
                  title: Text(trCategory(ref, category.slug, category.label)),
                );
              }),
            ],
          ),
        );
      },
    );
  }

  String _sortLabel(WidgetRef ref, CatalogSortOption option) {
    switch (option) {
      case CatalogSortOption.relevance:
        return ref.tr('products.sort.relevance');
      case CatalogSortOption.priceLowToHigh:
        return ref.tr('products.sort.lowToHigh');
      case CatalogSortOption.priceHighToLow:
        return ref.tr('products.sort.highToLow');
      case CatalogSortOption.nameAZ:
        return ref.tr('products.sort.nameAz');
    }
  }
}





