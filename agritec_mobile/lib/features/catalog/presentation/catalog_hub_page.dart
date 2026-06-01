import 'package:agritec_mobile/features/catalog/application/catalog_providers.dart';
import 'package:agritec_mobile/core/localization/app_localizations.dart';
import 'package:agritec_mobile/core/ui/category_visuals.dart';
import 'package:agritec_mobile/features/catalog/presentation/catalog_listing_page.dart';
import 'package:agritec_mobile/features/home/application/home_providers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

class CatalogHubPage extends ConsumerWidget {
  const CatalogHubPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final categories = ref.watch(catalogCategoriesProvider);
    final query = ref.watch(catalogQueryProvider);
    final hasQuery = query.trim().isNotEmpty;
    final results = ref.watch(filteredCatalogProductsProvider);
    final money = NumberFormat.currency(
      locale: 'en_NG',
      symbol: '₦',
      decimalDigits: 0,
    );

    return Container(
      color: const Color(0xFFEAF1ED),
      child: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(14, 12, 14, 16),
          children: [
            Container(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 14),
              decoration: BoxDecoration(
                color: const Color(0xFF136A43),
                borderRadius: BorderRadius.circular(26),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    ref.tr('search.title'),
                    style: const TextStyle(
                      fontWeight: FontWeight.w800,
                      fontSize: 27,
                      height: 1.05,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    ref.tr('search.subtitle'),
                    style: const TextStyle(color: Color(0xFFD1E6DA)),
                  ),
                  const SizedBox(height: 14),
                  TextField(
                    decoration: InputDecoration(
                      hintText: ref.tr('search.hint'),
                      prefixIcon: const Icon(Icons.search_rounded),
                      filled: true,
                      fillColor: Colors.white,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide: BorderSide.none,
                      ),
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 12,
                      ),
                    ),
                    onChanged: (value) =>
                        ref.read(catalogQueryProvider.notifier).setQuery(value),
                  ),
                ],
              ),
            ),
            if (hasQuery) ...[
              const SizedBox(height: 8),
              Text(
                'Current query: "$query"',
                style: const TextStyle(color: Color(0xFF51605A), fontSize: 12),
              ),
            ],
            const SizedBox(height: 16),
            if (hasQuery) ...[
              Row(
                children: [
                  Expanded(
                    child: Text(
                      '${ref.tr('search.results')} (${results.length})',
                      style: const TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 18,
                      ),
                    ),
                  ),
                  TextButton(
                    onPressed: () =>
                        _openAllProducts(context, ref, resetSearch: false),
                    child: Text(ref.tr('search.openFullResults')),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              if (results.isEmpty)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 24),
                  child: Center(
                    child: Text(
                      ref.tr('search.noResults'),
                      style: const TextStyle(color: Color(0xFF6A746F)),
                    ),
                  ),
                )
              else
                ...results.take(6).map((product) {
                  final seller = ref.watch(
                    homeSellerByIdProvider(product.sellerId),
                  );
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: Card(
                      color: Colors.white,
                      child: ListTile(
                        onTap: () =>
                            _openAllProducts(context, ref, resetSearch: false),
                        leading: ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: Image.network(
                            product.imageUrl,
                            width: 52,
                            height: 52,
                            fit: BoxFit.cover,
                            errorBuilder: (context, error, stackTrace) =>
                                Container(
                                  width: 52,
                                  height: 52,
                                  color: const Color(0xFFE8EEEA),
                                  alignment: Alignment.center,
                                  child: const Icon(
                                    Icons.broken_image_rounded,
                                    size: 16,
                                    color: Color(0xFF607069),
                                  ),
                                ),
                          ),
                        ),
                        title: Text(
                          product.name,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        subtitle: Text(
                          '${seller.farmName} • ${money.format(product.price)}',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        trailing: const Icon(Icons.chevron_right_rounded),
                      ),
                    ),
                  );
                }),
            ] else ...[
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: const Color(0xFFF4F7F5),
                  borderRadius: BorderRadius.circular(22),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        ref.tr('search.categories'),
                        style: const TextStyle(
                          fontWeight: FontWeight.w700,
                          fontSize: 18,
                        ),
                      ),
                    ),
                    TextButton(
                      onPressed: () => _openAllProducts(context, ref),
                      child: Text(ref.tr('search.openProducts')),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 10),
              Wrap(
                spacing: 10,
                runSpacing: 10,
                children: categories.map((category) {
                  final visual = categoryVisualForSlug(category.slug);
                  return InkWell(
                    borderRadius: BorderRadius.circular(16),
                    onTap: () {
                      ref
                          .read(catalogCategoryProvider.notifier)
                          .setCategory(category.slug);
                      ref.read(catalogQueryProvider.notifier).setQuery('');
                      _openAllProducts(context, ref, resetSearch: false);
                    },
                    child: Container(
                      width: (MediaQuery.of(context).size.width - 48) / 2,
                      padding: const EdgeInsets.symmetric(
                        horizontal: 14,
                        vertical: 16,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 26,
                            height: 26,
                            decoration: BoxDecoration(
                              color: visual.bgColor,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            alignment: Alignment.center,
                            child: Icon(
                              visual.icon,
                              size: 15,
                              color: visual.iconColor,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              category.label,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                }).toList(),
              ),
              const SizedBox(height: 20),
            ],
            SizedBox(
              height: 52,
              child: ElevatedButton.icon(
                onPressed: () =>
                    _openAllProducts(context, ref, resetSearch: true),
                icon: const Icon(Icons.storefront_rounded),
                label: Text(ref.tr('search.browseAllProducts')),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF136A43),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _openAllProducts(
    BuildContext context,
    WidgetRef ref, {
    bool resetSearch = false,
  }) {
    if (resetSearch) {
      ref.read(catalogQueryProvider.notifier).setQuery('');
      ref.read(catalogCategoryProvider.notifier).setCategory(null);
      ref
          .read(catalogSortProvider.notifier)
          .setSort(CatalogSortOption.relevance);
    }
    Navigator.of(
      context,
    ).push(MaterialPageRoute<void>(builder: (_) => const CatalogListingPage()));
  }
}
