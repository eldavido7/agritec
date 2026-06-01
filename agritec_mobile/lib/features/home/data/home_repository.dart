import 'package:agritec_mobile/core/services/local_cache_service.dart';
import 'package:agritec_mobile/features/home/data/home_mock_data.dart';
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
  HomeRepository(this._cacheService);

  static const cacheKey = 'cache_home_snapshot_v1';
  final LocalCacheService _cacheService;

  Future<HomeDataSnapshot> getSnapshot() async {
    final cached = _cacheService.readJson(cacheKey);
    if (cached != null) {
      return HomeDataSnapshot.fromJson(cached);
    }
    final snapshot = _mockSnapshot();
    await _cacheService.saveJson(cacheKey, snapshot.toJson());
    return snapshot;
  }

  Future<HomeDataSnapshot> refreshSnapshot() async {
    final snapshot = _mockSnapshot();
    await _cacheService.saveJson(cacheKey, snapshot.toJson());
    return snapshot;
  }

  HomeDataSnapshot _mockSnapshot() {
    return const HomeDataSnapshot(
      categories: homeCategories,
      sellers: homeSellers,
      products: homeFeaturedProducts,
    );
  }
}
