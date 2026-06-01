import 'package:agritec_mobile/core/storage/cache_providers.dart';
import 'package:agritec_mobile/features/auth/application/local_auth_provider.dart';
import 'package:agritec_mobile/features/home/application/home_providers.dart';
import 'package:agritec_mobile/features/home/domain/home_models.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class CartNotifier extends Notifier<Map<int, int>> {
  static const _cacheKeyPrefix = 'cache_cart_v1';

  @override
  Map<int, int> build() {
    ref.watch(currentBuyerUserIdProvider);
    _hydrate();
    return <int, int>{};
  }

  String _cacheKey() {
    final userId = ref.read(currentBuyerUserIdProvider) ?? 'guest';
    return '$_cacheKeyPrefix-$userId';
  }

  Future<void> _hydrate() async {
    final cache = await ref.read(localCacheServiceProvider.future);
    final raw = cache.readJson(_cacheKey());
    if (raw == null) return;
    final entries = raw['items'];
    if (entries is! List<dynamic>) return;
    final next = <int, int>{};
    for (final item in entries) {
      if (item is! Map<String, dynamic>) continue;
      final productIdRaw = item['productId'];
      final quantityRaw = item['quantity'];
      if (productIdRaw is num && quantityRaw is num) {
        next[productIdRaw.toInt()] = quantityRaw.toInt();
      }
    }
    state = next;
  }

  Future<void> _persist() async {
    final cache = await ref.read(localCacheServiceProvider.future);
    final payload = {
      'items': state.entries
          .map((entry) => {'productId': entry.key, 'quantity': entry.value})
          .toList(),
    };
    await cache.saveJson(_cacheKey(), payload);
  }

  void addProduct(int productId) {
    final current = state[productId] ?? 0;
    state = {...state, productId: current + 1};
    _persist();
  }

  void increment(int productId) {
    final current = state[productId];
    if (current == null) return;
    state = {...state, productId: current + 1};
    _persist();
  }

  void decrement(int productId) {
    final current = state[productId];
    if (current == null) return;
    if (current <= 1) {
      remove(productId);
      return;
    }
    state = {...state, productId: current - 1};
    _persist();
  }

  void remove(int productId) {
    final copy = {...state};
    copy.remove(productId);
    state = copy;
    _persist();
  }

  void clearSeller(String sellerId, List<HomeProduct> products) {
    final copy = {...state};
    for (final product in products) {
      if (product.sellerId == sellerId) {
        copy.remove(product.id);
      }
    }
    state = copy;
    _persist();
  }

  bool hasProduct(int productId) {
    return state.containsKey(productId);
  }
}

final cartProvider = NotifierProvider<CartNotifier, Map<int, int>>(
  CartNotifier.new,
);

final cartItemCountProvider = Provider<int>((ref) {
  final cart = ref.watch(cartProvider);
  return cart.values.fold(0, (sum, qty) => sum + qty);
});

class SellerCartGroup {
  const SellerCartGroup({
    required this.sellerId,
    required this.sellerName,
    required this.farmName,
    required this.items,
  });

  final String sellerId;
  final String sellerName;
  final String farmName;
  final List<CartLineItem> items;

  int get sellerTotal => items.fold(0, (sum, item) => sum + item.lineTotal);
}

class CartLineItem {
  const CartLineItem({
    required this.product,
    required this.quantity,
    required this.sellerName,
    required this.farmName,
  });

  final HomeProduct product;
  final int quantity;
  final String sellerName;
  final String farmName;

  int get lineTotal => product.price * quantity;

  Map<String, dynamic> toJson() => {
    'product': product.toJson(),
    'quantity': quantity,
    'sellerName': sellerName,
    'farmName': farmName,
  };

  factory CartLineItem.fromJson(Map<String, dynamic> json) {
    return CartLineItem(
      product: HomeProduct.fromJson(json['product'] as Map<String, dynamic>),
      quantity: (json['quantity'] as num).toInt(),
      sellerName: json['sellerName'] as String,
      farmName: json['farmName'] as String,
    );
  }
}

final cartGroupsProvider = Provider<List<SellerCartGroup>>((ref) {
  final cart = ref.watch(cartProvider);
  final products = ref.watch(homeFeaturedProductsProvider);
  final sellers = ref.watch(homeSellersProvider);

  final bySeller = <String, List<CartLineItem>>{};

  for (final entry in cart.entries) {
    final productId = entry.key;
    final quantity = entry.value;
    HomeProduct? product;
    for (final item in products) {
      if (item.id == productId) {
        product = item;
        break;
      }
    }
    if (product == null) continue;
    var seller = sellers.first;
    var sellerFound = false;
    for (final item in sellers) {
      if (item.id == product.sellerId) {
        seller = item;
        sellerFound = true;
        break;
      }
    }
    if (!sellerFound) continue;

    bySeller.putIfAbsent(product.sellerId, () => []);
    bySeller[product.sellerId]!.add(
      CartLineItem(
        product: product,
        quantity: quantity,
        sellerName: seller.name,
        farmName: seller.farmName,
      ),
    );
  }

  return bySeller.entries.map((entry) {
    final seller = sellers.firstWhere((s) => s.id == entry.key);
    return SellerCartGroup(
      sellerId: seller.id,
      sellerName: seller.name,
      farmName: seller.farmName,
      items: entry.value,
    );
  }).toList();
});

final cartTotalProvider = Provider<int>((ref) {
  final groups = ref.watch(cartGroupsProvider);
  return groups.fold(0, (sum, group) => sum + group.sellerTotal);
});
