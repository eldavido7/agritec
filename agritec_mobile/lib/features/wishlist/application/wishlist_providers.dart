import 'package:agritec_mobile/core/storage/cache_providers.dart';
import 'package:agritec_mobile/features/auth/application/local_auth_provider.dart';
import 'package:agritec_mobile/features/auth/data/auth_service.dart';
import 'package:agritec_mobile/features/home/application/home_providers.dart';
import 'package:agritec_mobile/features/home/domain/home_models.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class WishlistNotifier extends Notifier<Set<int>> {
  static const _cacheKeyPrefix = 'cache_wishlist_v1';

  @override
  Set<int> build() {
    ref.watch(currentBuyerUserIdProvider);
    ref.watch(buyerAuthTokenProvider);
    _prime();
    return <int>{};
  }

  String _cacheKey() {
    final userId = ref.read(currentBuyerUserIdProvider) ?? 'guest';
    return '$_cacheKeyPrefix-$userId';
  }

  Future<void> _prime() async {
    await _hydrate();
    await refresh();
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

  Future<void> refresh() async {
    final token = ref.read(buyerAuthTokenProvider);
    if (token == null || token.isEmpty) {
      return;
    }

    try {
      final response = await ref.read(mobileApiClientProvider).get(
        '/api/wishlist',
        token: token,
      );
      final items = response['wishlistItems'];
      if (items is! List<dynamic>) return;
      final productIds = <int>{};
      for (final item in items) {
        if (item is! Map<String, dynamic>) continue;
        final productId = int.tryParse('${item['productId'] ?? ''}');
        productId == null ? null : productIds.add(productId);
      }
      state = productIds;
      await _persist();
    } catch (_) {}
  }

  Future<void> toggle(int productId, {String? variantId}) async {
    final token = ref.read(buyerAuthTokenProvider);
    final existed = state.contains(productId);
    final next = {...state};
    if (existed) {
      next.remove(productId);
    } else {
      next.add(productId);
    }
    state = next;
    await _persist();

    if (token == null || token.isEmpty) {
      return;
    }

    try {
      if (existed) {
        await ref.read(mobileApiClientProvider).delete(
          '/api/wishlist/$productId',
          token: token,
          queryParameters: variantId == null ? null : {'variantId': variantId},
        );
      } else {
        await ref.read(mobileApiClientProvider).post(
          '/api/wishlist/$productId',
          token: token,
          data: variantId == null ? {} : {'variantId': variantId},
        );
      }
    } catch (_) {
      final rollback = {...state};
      if (existed) {
        rollback.add(productId);
      } else {
        rollback.remove(productId);
      }
      state = rollback;
      await _persist();
    }
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
