import 'package:agritec_mobile/core/api/mobile_api.dart';
import 'package:agritec_mobile/core/logistics/logistics_models.dart';
import 'package:agritec_mobile/core/services/local_cache_service.dart';
import 'package:agritec_mobile/core/ui/category_visuals.dart';
import 'package:agritec_mobile/features/home/domain/home_models.dart';

class HomeDataSnapshot {
  const HomeDataSnapshot({
    required this.categories,
    required this.sellers,
    required this.products,
  });

  final List<HomeCategory> categories;
  final List<HomeSeller> sellers;
  final List<HomeProduct> products;

  Map<String, dynamic> toJson() => {
        'categories': categories.map((c) => c.toJson()).toList(),
        'sellers': sellers.map((s) => s.toJson()).toList(),
        'products': products.map((p) => p.toJson()).toList(),
      };

  factory HomeDataSnapshot.fromJson(Map<String, dynamic> json) {
    return HomeDataSnapshot(
      categories: (json['categories'] as List<dynamic>)
          .map((item) => HomeCategory.fromJson(item as Map<String, dynamic>))
          .toList(),
      sellers: (json['sellers'] as List<dynamic>)
          .map((item) => HomeSeller.fromJson(item as Map<String, dynamic>))
          .toList(),
      products: (json['products'] as List<dynamic>)
          .map((item) => HomeProduct.fromJson(item as Map<String, dynamic>))
          .toList(),
    );
  }
}

class HomeRepository {
  HomeRepository(this._cacheService, this._apiClient);

  static const cacheKey = 'cache_home_snapshot_v5';
  final LocalCacheService _cacheService;
  final MobileApiClient _apiClient;

  Future<HomeDataSnapshot> getSnapshot() async {
    final cached = _cacheService.readJson(cacheKey);
    if (cached != null) {
      return HomeDataSnapshot.fromJson(cached);
    }
    return refreshSnapshot();
  }

  Future<HomeDataSnapshot> refreshSnapshot() async {
    final categoriesPayload = await _apiClient.get('/api/platform/categories');
    final productsPayload = await _apiClient.get('/api/products', queryParameters: {
      'page': 1,
      'pageSize': 200,
    });
    final sellersPayload = await _apiClient.get('/api/sellers', queryParameters: {
      'page': 1,
      'pageSize': 100,
    });
    final discountsPayload = await _apiClient.get('/api/discounts');

    final discountCodesByProduct = <String, String>{};
    final discountCodesByVariant = <String, String>{};
    final discounts = discountsPayload['discounts'];
    if (discounts is List<dynamic>) {
      for (final item in discounts) {
        if (item is! Map<String, dynamic>) continue;
        final code = (item['code'] as String?)?.trim();
        if (code == null || code.isEmpty) continue;
        for (final productId in (item['productIds'] as List<dynamic>? ?? const <dynamic>[])) {
          discountCodesByProduct['$productId'] = code;
        }
        for (final variantId in (item['variantIds'] as List<dynamic>? ?? const <dynamic>[])) {
          discountCodesByVariant['$variantId'] = code;
        }
      }
    }

    final productList = (productsPayload['products'] as List<dynamic>? ?? const <dynamic>[])
        .whereType<Map<String, dynamic>>()
        .map((product) => _mapProduct(product, discountCodesByProduct, discountCodesByVariant))
        .toList();

    final categoryCounts = <String, int>{};
    for (final product in productList) {
      categoryCounts.update(product.categorySlug, (current) => current + 1, ifAbsent: () => 1);
    }

    final categories = (categoriesPayload['categories'] as List<dynamic>? ?? const <dynamic>[])
        .whereType<Map<String, dynamic>>()
        .map((category) {
          final slug = category['slug'] as String;
          final visual = categoryVisualForSlug(slug);
          return HomeCategory(
            id: slug,
            slug: slug,
            name: (category['label'] as String?) ?? slug,
            icon: visual.icon.codePoint.toString(),
            productCount: categoryCounts[slug] ?? 0,
          );
        })
        .toList();

    final sellers = (sellersPayload['sellers'] as List<dynamic>? ?? const <dynamic>[])
        .whereType<Map<String, dynamic>>()
        .map(_mapSeller)
        .toList();

    final snapshot = HomeDataSnapshot(
      categories: categories,
      sellers: sellers,
      products: productList,
    );
    await _cacheService.saveJson(cacheKey, snapshot.toJson());
    return snapshot;
  }

  HomeSeller _mapSeller(Map<String, dynamic> seller) {
    final fullAddress = (seller['fullAddress'] as String?)?.trim();
    final savedLocationLabel = (seller['locationLabel'] as String?)?.trim();
    final city = (seller['city'] as String?)?.trim();
    final state = (seller['state'] as String?)?.trim();
    final location = fullAddress != null && fullAddress.isNotEmpty
        ? fullAddress
        : savedLocationLabel != null && savedLocationLabel.isNotEmpty
        ? savedLocationLabel
        : [city, state]
            .whereType<String>()
            .where((value) => value.isNotEmpty)
            .toSet()
            .join(', ');

    return HomeSeller(
      id: seller['id'] as String,
      name: (seller['ownerName'] as String?) ?? 'Seller',
      farmName: (seller['farmName'] as String?) ?? 'Farm',
      location: location.isEmpty ? 'Nigeria' : location,
      state: state,
      latitude: (seller['latitude'] as num?)?.toDouble(),
      longitude: (seller['longitude'] as num?)?.toDouble(),
      rating: (seller['rating'] as num?)?.toDouble() ?? 0,
      isVerified: seller['isVerified'] as bool? ?? false,
    );
  }

  HomeProduct _mapProduct(
    Map<String, dynamic> product,
    Map<String, String> discountCodesByProduct,
    Map<String, String> discountCodesByVariant,
  ) {
    final productId = int.tryParse('${product['id']}') ?? -1;
    final images = _parseImages(product['images']);
    final variants = (product['variants'] as List<dynamic>? ?? const <dynamic>[])
        .whereType<Map<String, dynamic>>()
        .toList();
    String? discountCode = discountCodesByProduct['${product['id']}'];
    if (discountCode == null) {
      for (final variant in variants) {
        final code = discountCodesByVariant['${variant['id']}'];
        if (code != null) {
          discountCode = code;
          break;
        }
      }
    }

    return HomeProduct(
      id: productId,
      sellerId: product['sellerId'] as String,
      createdAt: DateTime.tryParse((product['createdAt'] as String?) ?? '') ??
          DateTime.fromMillisecondsSinceEpoch(0),
      name: (product['title'] as String?) ?? 'Product',
      categorySlug: (product['categorySlug'] as String?) ?? 'other',
      category: (product['category']?['label'] as String?) ?? 'Other',
      categoryNote: product['categoryNote'] as String?,
      price: (product['basePrice'] as num?)?.toInt() ?? 0,
      inventory: (product['inventory'] as num?)?.toInt() ?? 0,
      images: images,
      hasDiscount: discountCode != null,
      discountLabel: discountCode,
      logistics: _mapLogistics(product),
    );
  }

  List<String> _parseImages(Object? rawImages) {
    final parsed = <String>[];
    if (rawImages is List<dynamic>) {
      for (final image in rawImages) {
        if (image is String && image.trim().isNotEmpty) {
          parsed.add(image.trim());
          continue;
        }
        if (image is Map<String, dynamic>) {
          final secure = (image['secureUrl'] as String?)?.trim();
          if (secure != null && secure.isNotEmpty) {
            parsed.add(secure);
            continue;
          }
          final url = (image['url'] as String?)?.trim();
          if (url != null && url.isNotEmpty) {
            parsed.add(url);
          }
        }
      }
    }
    return parsed;
  }

  LogisticsMetadata _mapLogistics(Map<String, dynamic> source) {
    return LogisticsMetadata(
      salesUnit: salesUnitFromJson(source['salesUnit']),
      unitWeightKg: (source['unitWeightKg'] as num?)?.toDouble() ?? 1,
      unitLengthCm: (source['unitLengthCm'] as num?)?.toDouble(),
      unitWidthCm: (source['unitWidthCm'] as num?)?.toDouble(),
      unitHeightCm: (source['unitHeightCm'] as num?)?.toDouble(),
      packageType: packageTypeFromJson(source['packageType']),
    );
  }
}

