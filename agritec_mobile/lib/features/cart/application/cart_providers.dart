import 'package:agritec_mobile/core/storage/cache_providers.dart';
import 'package:agritec_mobile/features/auth/application/local_auth_provider.dart';
import 'package:agritec_mobile/features/home/application/home_providers.dart';
import 'package:agritec_mobile/features/home/domain/home_models.dart';
import 'package:agritec_mobile/features/product/application/product_details_providers.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

String cartLineKey(int productId, {String? variantId}) {
  if (variantId == null || variantId.isEmpty) return '$productId';
  return '$productId:$variantId';
}

int productIdFromCartLineKey(String key) {
  return int.tryParse(key.split(':').first) ?? -1;
}

class CartNotifier extends Notifier<Map<String, int>> {
  static const _cacheKeyPrefix = 'cache_cart_v2';

  @override
  Map<String, int> build() {
    ref.watch(currentBuyerUserIdProvider);
    _hydrate();
    return <String, int>{};
  }

  String _cacheKey() {
    final userId = ref.read(currentBuyerUserIdProvider) ?? 'guest';
    return '$_cacheKeyPrefix-$userId';
  }

  String _legacyCacheKey() {
    final userId = ref.read(currentBuyerUserIdProvider) ?? 'guest';
    return 'cache_cart_v1-$userId';
  }

  Future<void> _hydrate() async {
    final cache = await ref.read(localCacheServiceProvider.future);
    var raw = cache.readJson(_cacheKey());
    raw ??= cache.readJson(_legacyCacheKey());
    if (raw == null) return;
    final entries = raw['items'];
    if (entries is! List<dynamic>) return;
    final next = <String, int>{};
    for (final item in entries) {
      if (item is! Map<String, dynamic>) continue;
      final quantityRaw = item['quantity'];
      if (quantityRaw is! num) continue;
      final lineKeyRaw = item['lineKey'];
      final productIdRaw = item['productId'];
      if (lineKeyRaw is String && lineKeyRaw.isNotEmpty) {
        next[lineKeyRaw] = quantityRaw.toInt();
      } else if (productIdRaw is num) {
        next[cartLineKey(productIdRaw.toInt())] = quantityRaw.toInt();
      }
    }
    state = next;
  }

  Future<void> _persist() async {
    final cache = await ref.read(localCacheServiceProvider.future);
    final payload = {
      'items': state.entries
          .map(
            (entry) => {
              'lineKey': entry.key,
              'productId': productIdFromCartLineKey(entry.key),
              'quantity': entry.value,
            },
          )
          .toList(),
    };
    await cache.saveJson(_cacheKey(), payload);
  }

  void addProduct(int productId, {String? variantId}) {
    final key = cartLineKey(productId, variantId: variantId);
    final current = state[key] ?? 0;
    state = {...state, key: current + 1};
    _persist();
  }

  void increment(String lineKey) {
    final current = state[lineKey];
    if (current == null) return;
    state = {...state, lineKey: current + 1};
    _persist();
  }

  void decrement(String lineKey) {
    final current = state[lineKey];
    if (current == null) return;
    if (current <= 1) {
      remove(lineKey);
      return;
    }
    state = {...state, lineKey: current - 1};
    _persist();
  }

  void remove(String lineKey) {
    final copy = {...state};
    copy.remove(lineKey);
    state = copy;
    _persist();
  }

  void clear() {
    state = <String, int>{};
    _persist();
  }

  void clearSeller(String sellerId, List<HomeProduct> products) {
    final sellerProductIds = products
        .where((product) => product.sellerId == sellerId)
        .map((product) => product.id)
        .toSet();
    final copy = {...state};
    copy.removeWhere(
      (lineKey, _) => sellerProductIds.contains(productIdFromCartLineKey(lineKey)),
    );
    state = copy;
    _persist();
  }

  bool hasProduct(int productId, {String? variantId}) {
    return state.containsKey(cartLineKey(productId, variantId: variantId));
  }
}

final cartProvider = NotifierProvider<CartNotifier, Map<String, int>>(
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
    required this.lineKey,
    required this.product,
    required this.quantity,
    required this.sellerName,
    required this.farmName,
    this.variantId,
    this.variantName,
  });

  final String lineKey;
  final HomeProduct product;
  final int quantity;
  final String sellerName;
  final String farmName;
  final String? variantId;
  final String? variantName;

  int get lineTotal => product.price * quantity;

  Map<String, dynamic> toJson() => {
        'lineKey': lineKey,
        'product': product.toJson(),
        'quantity': quantity,
        'sellerName': sellerName,
        'farmName': farmName,
        'variantId': variantId,
        'variantName': variantName,
      };

  factory CartLineItem.fromJson(Map<String, dynamic> json) {
    return CartLineItem(
      lineKey: (json['lineKey'] as String?) ?? '${(json['product'] as Map<String, dynamic>)['id']}',
      product: HomeProduct.fromJson(json['product'] as Map<String, dynamic>),
      quantity: (json['quantity'] as num).toInt(),
      sellerName: json['sellerName'] as String,
      farmName: json['farmName'] as String,
      variantId: json['variantId'] as String?,
      variantName: json['variantName'] as String?,
    );
  }
}

final cartGroupsProvider = Provider<List<SellerCartGroup>>((ref) {
  final cart = ref.watch(cartProvider);
  final products = ref.watch(homeFeaturedProductsProvider);
  final sellers = ref.watch(homeSellersProvider);

  final bySeller = <String, List<CartLineItem>>{};

  for (final entry in cart.entries) {
    final lineKey = entry.key;
    final productId = productIdFromCartLineKey(lineKey);
    final variantId = lineKey.contains(':') ? lineKey.split(':').last : null;
    final quantity = entry.value;
    HomeProduct? product;
    for (final item in products) {
      if (item.id == productId) {
        product = item;
        break;
      }
    }
    if (product == null) continue;

    ProductVariant? variant;
    if (variantId != null) {
      for (final item in ref.watch(productVariantsProvider(product.id))) {
        if (item.id == variantId) {
          variant = item;
          break;
        }
      }
    }

    final cartProduct = variant == null
        ? product
        : HomeProduct(
            id: product.id,
            sellerId: product.sellerId,
            name: '${product.name} - ${variant.name}',
            categorySlug: product.categorySlug,
            category: product.category,
            categoryNote: product.categoryNote,
            price: variant.price,
            inventory: variant.inventory,
            images: product.images,
            hasDiscount: product.hasDiscount,
            discountLabel: product.discountLabel,
            logistics: variant.logistics ?? product.logistics,
          );

    HomeSeller? seller;
    for (final item in sellers) {
      if (item.id == product.sellerId) {
        seller = item;
        break;
      }
    }
    if (seller == null) continue;

    bySeller.putIfAbsent(product.sellerId, () => []);
    bySeller[product.sellerId]!.add(
      CartLineItem(
        lineKey: lineKey,
        product: cartProduct,
        quantity: quantity,
        sellerName: seller.name,
        farmName: seller.farmName,
        variantId: variantId,
        variantName: variant?.name,
      ),
    );
  }

  return bySeller.entries.map((entry) {
    HomeSeller? seller;
    for (final item in sellers) {
      if (item.id == entry.key) {
        seller = item;
        break;
      }
    }
    seller ??= const HomeSeller(
      id: 'unknown',
      name: 'Unknown Seller',
      farmName: 'Unknown Farm',
      location: '',
      rating: 0,
      isVerified: false,
    );
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




