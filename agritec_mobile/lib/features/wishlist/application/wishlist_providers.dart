import 'package:agritec_mobile/core/storage/cache_providers.dart';
import 'package:agritec_mobile/features/auth/application/local_auth_provider.dart';
import 'package:agritec_mobile/features/home/application/home_providers.dart';
import 'package:agritec_mobile/features/home/domain/home_models.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class WishlistNotifier extends Notifier<Set<int>> {
  static const _cacheKeyPrefix = 'cache_wishlist_v1';

  @override
  Set<int> build() {
    ref.watch(currentBuyerUserIdProvider);
    _hydrate();
    return <int>{};
  }

  String _cacheKey() {
    final userId = ref.read(currentBuyerUserIdProvider) ?? 'guest';
    return '$_cacheKeyPrefix-$userId';
  }

  Future<void> _hydrate() async {
    final cache = await ref.read(localCacheServiceProvider.future);
    final raw = cache.readJson(_cacheKey());
    if (raw == null) return;
    final ids = raw['productIds'];
    if (ids is! List<dynamic>) return;
    state = ids.whereType<num>().map((id) => id.toInt()).toSet();
  }

  Future<void> _persist() async {
    final cache = await ref.read(localCacheServiceProvider.future);
    await cache.saveJson(_cacheKey(), {'productIds': state.toList()});
  }

  void toggle(int productId) {
    final next = {...state};
    if (next.contains(productId)) {
      next.remove(productId);
    } else {
      next.add(productId);
    }
    state = next;
    _persist();
  }

  bool contains(int productId) => state.contains(productId);
}

final wishlistProvider = NotifierProvider<WishlistNotifier, Set<int>>(
  WishlistNotifier.new,
);

final wishlistProductsProvider = Provider<List<HomeProduct>>((ref) {
  final ids = ref.watch(wishlistProvider);
  final products = ref.watch(homeFeaturedProductsProvider);
  return products.where((p) => ids.contains(p.id)).toList();
});
