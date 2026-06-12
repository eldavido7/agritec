import 'package:agritec_mobile/core/catalog/platform_categories.dart';
import 'package:agritec_mobile/features/home/application/home_providers.dart';
import 'package:agritec_mobile/features/home/domain/home_models.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

enum CatalogSortOption { relevance, priceLowToHigh, priceHighToLow, nameAZ }

class CatalogQueryNotifier extends Notifier<String> {
  @override
  String build() => '';

  void setQuery(String value) => state = value;
}

class CatalogCategoryNotifier extends Notifier<String?> {
  @override
  String? build() => null;

  void setCategory(String? value) => state = value;
}

class CatalogSortNotifier extends Notifier<CatalogSortOption> {
  @override
  CatalogSortOption build() => CatalogSortOption.relevance;

  void setSort(CatalogSortOption value) => state = value;
}

final catalogQueryProvider = NotifierProvider<CatalogQueryNotifier, String>(
  CatalogQueryNotifier.new,
);

final catalogCategoryProvider =
    NotifierProvider<CatalogCategoryNotifier, String?>(
      CatalogCategoryNotifier.new,
    );

final catalogSortProvider =
    NotifierProvider<CatalogSortNotifier, CatalogSortOption>(
      CatalogSortNotifier.new,
    );

final catalogCategoriesProvider = Provider<List<PlatformCategory>>((ref) {
  final homeCategories = ref.watch(homeCategoriesProvider);
  return homeCategories
      .map((category) => PlatformCategory(slug: category.slug, label: category.name))
      .toList();
});

final filteredCatalogProductsProvider = Provider<List<HomeProduct>>((ref) {
  final products = ref.watch(homeFeaturedProductsProvider);
  final query = ref.watch(catalogQueryProvider).trim().toLowerCase();
  final selectedCategory = ref.watch(catalogCategoryProvider);
  final sortOption = ref.watch(catalogSortProvider);

  var filtered = products.where((product) {
    final matchesCategory =
        selectedCategory == null || product.categorySlug == selectedCategory;
    final searchable = '${product.name} ${product.category}'.toLowerCase();
    final matchesQuery = query.isEmpty || searchable.contains(query);
    return matchesCategory && matchesQuery;
  }).toList();

  switch (sortOption) {
    case CatalogSortOption.priceLowToHigh:
      filtered.sort((a, b) => a.price.compareTo(b.price));
      break;
    case CatalogSortOption.priceHighToLow:
      filtered.sort((a, b) => b.price.compareTo(a.price));
      break;
    case CatalogSortOption.nameAZ:
      filtered.sort((a, b) => a.name.compareTo(b.name));
      break;
    case CatalogSortOption.relevance:
      break;
  }

  return filtered;
});
