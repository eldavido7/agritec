import 'dart:async';

import 'package:agritec_mobile/core/api/mobile_api.dart';
import 'package:agritec_mobile/core/logistics/logistics_models.dart';
import 'package:agritec_mobile/core/storage/cache_providers.dart';
import 'package:agritec_mobile/features/auth/application/local_auth_provider.dart';
import 'package:agritec_mobile/features/auth/data/auth_service.dart';
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

class CartState {
  const CartState({
    this.quantities = const <String, int>{},
    this.itemsByLineKey = const <String, CartLineItem>{},
    this.itemIdsByLineKey = const <String, String>{},
    this.isLoading = false,
    this.hasLoadedRemote = false,
  });

  final Map<String, int> quantities;
  final Map<String, CartLineItem> itemsByLineKey;
  final Map<String, String> itemIdsByLineKey;
  final bool isLoading;
  final bool hasLoadedRemote;

  CartState copyWith({
    Map<String, int>? quantities,
    Map<String, CartLineItem>? itemsByLineKey,
    Map<String, String>? itemIdsByLineKey,
    bool? isLoading,
    bool? hasLoadedRemote,
  }) {
    return CartState(
      quantities: quantities ?? this.quantities,
      itemsByLineKey: itemsByLineKey ?? this.itemsByLineKey,
      itemIdsByLineKey: itemIdsByLineKey ?? this.itemIdsByLineKey,
      isLoading: isLoading ?? this.isLoading,
      hasLoadedRemote: hasLoadedRemote ?? this.hasLoadedRemote,
    );
  }
}

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
      lineKey: (json['lineKey'] as String?) ??
          '${(json['product'] as Map<String, dynamic>)['id']}',
      product: HomeProduct.fromJson(json['product'] as Map<String, dynamic>),
      quantity: (json['quantity'] as num).toInt(),
      sellerName: json['sellerName'] as String,
      farmName: json['farmName'] as String,
      variantId: json['variantId'] as String?,
      variantName: json['variantName'] as String?,
    );
  }
}

HomeProduct buildHomeProductFromApi({
  required Map<String, dynamic> apiProduct,
  Map<String, dynamic>? apiVariant,
  required List<HomeProduct> fallbackProducts,
}) {
  final productId = int.tryParse('${apiProduct['id']}') ?? -1;
  final fallback = fallbackProducts.where((item) => item.id == productId).firstOrNull;
  final categoryJson = apiProduct['category'] as Map<String, dynamic>?;
  final images = _parseProductImages(apiProduct['images'], fallback?.images ?? const []);
  final hasVariant = apiVariant != null;
  final price = _toInt(apiVariant?['price']) ?? _toInt(apiProduct['basePrice']) ?? fallback?.price ?? 0;
  final inventory = _toInt(apiVariant?['inventory']) ?? _toInt(apiProduct['inventory']) ?? fallback?.inventory ?? 0;

  return HomeProduct(
    id: productId,
    sellerId: (apiProduct['sellerId'] as String?) ?? fallback?.sellerId ?? 'unknown',
    createdAt: DateTime.tryParse((apiProduct['createdAt'] as String?) ?? '') ??
        fallback?.createdAt ??
        DateTime.fromMillisecondsSinceEpoch(0),
    name: hasVariant
        ? '${(apiProduct['title'] as String?) ?? fallback?.name ?? 'Product'} - ${apiVariant['name'] ?? ''}'.trim()
        : (apiProduct['title'] as String?) ?? fallback?.name ?? 'Product',
    categorySlug: (categoryJson?['slug'] as String?) ??
        (apiProduct['categorySlug'] as String?) ??
        fallback?.categorySlug ??
        'other',
    description: (apiProduct['description'] as String?) ?? fallback?.description,
    category: (categoryJson?['name'] as String?) ??
        (apiProduct['categoryName'] as String?) ??
        fallback?.category ??
        'Other',
    categoryNote: (apiProduct['categoryNote'] as String?) ?? fallback?.categoryNote,
    price: price,
    inventory: inventory,
    images: images,
    hasDiscount: fallback?.hasDiscount ?? false,
    discountLabel: fallback?.discountLabel,
    variants: fallback?.variants ?? const <HomeProductVariant>[],
    discounts: fallback?.discounts ?? const <HomeProductDiscount>[],
    logistics: _logisticsFromApi(apiVariant ?? apiProduct, fallback?.logistics),
  );
}

CartLineItem buildCartLineItemFromApi({
  required Map<String, dynamic> apiProduct,
  Map<String, dynamic>? apiVariant,
  required int quantity,
  String? lineKey,
  required List<HomeProduct> fallbackProducts,
}) {
  final product = buildHomeProductFromApi(
    apiProduct: apiProduct,
    apiVariant: apiVariant,
    fallbackProducts: fallbackProducts,
  );
  final sellerJson = apiProduct['seller'] as Map<String, dynamic>?;
  return CartLineItem(
    lineKey: lineKey ?? cartLineKey(product.id, variantId: apiVariant?['id'] as String?),
    product: product,
    quantity: quantity,
    sellerName: (sellerJson?['user']?['fullName'] as String?) ??
        (sellerJson?['ownerName'] as String?) ??
        (sellerJson?['contactName'] as String?) ??
        'Seller',
    farmName: (sellerJson?['farmName'] as String?) ?? 'Farm',
    variantId: apiVariant?['id'] as String?,
    variantName: apiVariant?['name'] as String?,
  );
}

class CartNotifier extends Notifier<CartState> {
  static const _cacheKeyPrefix = 'cache_cart_v3';
  static const _guestCacheKey = 'cache_cart_v3-guest';

  String? _sessionStamp;
  bool _isPriming = false;

  @override
  CartState build() {
    final userId = ref.watch(currentBuyerUserIdProvider);
    final token = ref.watch(buyerAuthTokenProvider);
    final stamp = '${userId ?? 'guest'}:${token ?? 'none'}';
    if (_sessionStamp != stamp) {
      _sessionStamp = stamp;
      _isPriming = false;
    }
    _prime();
    return const CartState();
  }

  String _cacheKeyForUser(String? userId) => '$_cacheKeyPrefix-${userId ?? 'guest'}';

  String _currentCacheKey() => _cacheKeyForUser(ref.read(currentBuyerUserIdProvider));

  Future<void> _prime() async {
    if (_isPriming) return;
    _isPriming = true;

    try {
      final localQuantities = await _readQuantities(_currentCacheKey());
      if (localQuantities.isNotEmpty) {
        _applyLocalState(localQuantities);
      }

      final token = ref.read(buyerAuthTokenProvider);
      final userId = ref.read(currentBuyerUserIdProvider);
      if (token == null || token.trim().isEmpty || userId == null) {
        return;
      }

      final guestQuantities = await _readQuantities(_guestCacheKey);
      final desired = <String, int>{...localQuantities};
      for (final entry in guestQuantities.entries) {
        desired.update(entry.key, (current) => current + entry.value, ifAbsent: () => entry.value);
      }

      await _syncDesiredStateToServer(token: token, desiredQuantities: desired);
      if (guestQuantities.isNotEmpty) {
        final cache = await ref.read(localCacheServiceProvider.future);
        await cache.saveJson(_guestCacheKey, {'items': const []});
      }
    } finally {
      _isPriming = false;
    }
  }

  Future<Map<String, int>> _readQuantities(String cacheKey) async {
    final cache = await ref.read(localCacheServiceProvider.future);
    final raw = cache.readJson(cacheKey);
    if (raw == null) return <String, int>{};
    final entries = raw['items'];
    if (entries is! List<dynamic>) return <String, int>{};
    final next = <String, int>{};
    for (final item in entries) {
      if (item is! Map<String, dynamic>) continue;
      final quantity = _toInt(item['quantity']);
      if (quantity == null || quantity <= 0) continue;
      final lineKey = item['lineKey'] as String?;
      final productId = _toInt(item['productId']);
      if (lineKey != null && lineKey.isNotEmpty) {
        next[lineKey] = quantity;
      } else if (productId != null) {
        next[cartLineKey(productId)] = quantity;
      }
    }
    return next;
  }

  Future<void> _persist() async {
    final cache = await ref.read(localCacheServiceProvider.future);
    final payload = {
      'items': state.quantities.entries
          .map(
            (entry) => {
              'lineKey': entry.key,
              'productId': productIdFromCartLineKey(entry.key),
              'quantity': entry.value,
            },
          )
          .toList(),
    };
    await cache.saveJson(_currentCacheKey(), payload);
  }

  void _applyLocalState(Map<String, int> quantities) {
    final nextItems = <String, CartLineItem>{};
    for (final entry in quantities.entries) {
      final existing = state.itemsByLineKey[entry.key];
      if (existing != null) {
        nextItems[entry.key] = CartLineItem(
          lineKey: existing.lineKey,
          product: existing.product,
          quantity: entry.value,
          sellerName: existing.sellerName,
          farmName: existing.farmName,
          variantId: existing.variantId,
          variantName: existing.variantName,
        );
        continue;
      }
      final fallback = _buildFallbackLine(entry.key, entry.value);
      if (fallback != null) {
        nextItems[entry.key] = fallback;
      }
    }

    state = state.copyWith(
      quantities: quantities,
      itemsByLineKey: nextItems,
    );
  }

  CartLineItem? _buildFallbackLine(String lineKey, int quantity) {
    final productId = productIdFromCartLineKey(lineKey);
    if (productId < 0) return null;
    final variantId = lineKey.contains(':') ? lineKey.split(':').last : null;
    final products = ref.read(homeFeaturedProductsProvider);
    final sellers = ref.read(homeSellersProvider);
    final product = products.where((item) => item.id == productId).firstOrNull;
    if (product == null) return null;
    final variant = ref
        .read(productVariantsProvider(productId))
        .where((item) => item.id == variantId)
        .firstOrNull;
    final seller = sellers.where((item) => item.id == product.sellerId).firstOrNull;
    if (seller == null) return null;

    final cartProduct = variant == null
        ? product
        : HomeProduct(
            id: product.id,
            sellerId: product.sellerId,
            createdAt: product.createdAt,
            name: '${product.name} - ${variant.name}',
            description: product.description,
            categorySlug: product.categorySlug,
            category: product.category,
            categoryNote: product.categoryNote,
            price: variant.price,
            inventory: variant.inventory,
            images: product.images,
            hasDiscount: product.hasDiscount,
            discountLabel: product.discountLabel,
            variants: product.variants,
            discounts: product.discounts,
            logistics: variant.logistics ?? product.logistics,
          );

    return CartLineItem(
      lineKey: lineKey,
      product: cartProduct,
      quantity: quantity,
      sellerName: seller.name,
      farmName: seller.farmName,
      variantId: variantId,
      variantName: variant?.name,
    );
  }

  Future<Map<String, dynamic>?> _fetchServerCart(String token) async {
    final api = ref.read(mobileApiClientProvider);
    try {
      return await api.get('/api/cart', token: token);
    } on MobileApiException catch (error) {
      if (error.statusCode == 404) {
        return null;
      }
      rethrow;
    }
  }

  Future<void> _syncDesiredStateToServer({
    required String token,
    required Map<String, int> desiredQuantities,
  }) async {
    state = state.copyWith(isLoading: true);
    final api = ref.read(mobileApiClientProvider);
    final serverPayload = await _fetchServerCart(token);
    final serverItems = _parseServerItems(serverPayload?['cart']?['items']);

    for (final entry in desiredQuantities.entries) {
      final serverItem = serverItems[entry.key];
      final ids = _splitLineKey(entry.key);
      if (serverItem == null) {
        await api.post(
          '/api/cart/items',
          token: token,
          data: {
            'productId': ids.productId,
            'variantId': ids.variantId,
            'quantity': entry.value,
          },
        );
        continue;
      }
      final currentQuantity = _toInt(serverItem['quantity']) ?? 0;
      if (currentQuantity != entry.value) {
        await api.patch(
          '/api/cart/items/${serverItem['id']}',
          token: token,
          data: {'quantity': entry.value},
        );
      }
    }

    for (final entry in serverItems.entries) {
      if (desiredQuantities.containsKey(entry.key)) continue;
      await api.delete('/api/cart/items/${entry.value['id']}', token: token);
    }

    await refresh();
  }

  Map<String, Map<String, dynamic>> _parseServerItems(Object? rawItems) {
    if (rawItems is! List<dynamic>) return <String, Map<String, dynamic>>{};
    final parsed = <String, Map<String, dynamic>>{};
    for (final item in rawItems) {
      if (item is! Map<String, dynamic>) continue;
      final lineKey = item['lineKey'] as String?;
      if (lineKey == null || lineKey.isEmpty) continue;
      parsed[lineKey] = item;
    }
    return parsed;
  }

  Future<void> refresh() async {
    final token = ref.read(buyerAuthTokenProvider);
    if (token == null || token.trim().isEmpty) {
      state = state.copyWith(hasLoadedRemote: false, isLoading: false);
      return;
    }

    state = state.copyWith(isLoading: true);
    try {
      final payload = await _fetchServerCart(token);
      final cartJson = payload?['cart'] as Map<String, dynamic>?;
      final rawItems = cartJson?['items'];
      final nextQuantities = <String, int>{};
      final nextItems = <String, CartLineItem>{};
      final nextIds = <String, String>{};
      final fallbackProducts = ref.read(homeFeaturedProductsProvider);

      if (rawItems is List<dynamic>) {
        for (final item in rawItems) {
          if (item is! Map<String, dynamic>) continue;
          final lineKey = item['lineKey'] as String?;
          final itemId = item['id'] as String?;
          final quantity = _toInt(item['quantity']);
          final productJson = item['product'] as Map<String, dynamic>?;
          final variantJson = item['variant'] as Map<String, dynamic>?;
          if (lineKey == null || itemId == null || quantity == null || productJson == null) {
            continue;
          }
          nextQuantities[lineKey] = quantity;
          nextIds[lineKey] = itemId;
          nextItems[lineKey] = buildCartLineItemFromApi(
            apiProduct: productJson,
            apiVariant: variantJson,
            quantity: quantity,
            lineKey: lineKey,
            fallbackProducts: fallbackProducts,
          );
        }
      }

      state = state.copyWith(
        quantities: nextQuantities,
        itemsByLineKey: nextItems,
        itemIdsByLineKey: nextIds,
        hasLoadedRemote: true,
        isLoading: false,
      );
      await _persist();
    } catch (_) {
      state = state.copyWith(isLoading: false);
      rethrow;
    }
  }

  Future<void> addProduct(int productId, {String? variantId}) async {
    final key = cartLineKey(productId, variantId: variantId);
    final next = <String, int>{...state.quantities};
    next.update(key, (current) => current + 1, ifAbsent: () => 1);
    _applyLocalState(next);
    await _persist();
    final token = ref.read(buyerAuthTokenProvider);
    if (token != null && token.trim().isNotEmpty) {
      unawaited(_syncDesiredStateToServer(token: token, desiredQuantities: next));
    }
  }

  Future<void> increment(String lineKey) async {
    final current = state.quantities[lineKey];
    if (current == null) return;
    final next = <String, int>{...state.quantities, lineKey: current + 1};
    _applyLocalState(next);
    await _persist();
    final token = ref.read(buyerAuthTokenProvider);
    if (token != null && token.trim().isNotEmpty) {
      unawaited(_syncDesiredStateToServer(token: token, desiredQuantities: next));
    }
  }

  Future<void> decrement(String lineKey) async {
    final current = state.quantities[lineKey];
    if (current == null) return;
    final next = <String, int>{...state.quantities};
    if (current <= 1) {
      next.remove(lineKey);
    } else {
      next[lineKey] = current - 1;
    }
    _applyLocalState(next);
    await _persist();
    final token = ref.read(buyerAuthTokenProvider);
    if (token != null && token.trim().isNotEmpty) {
      unawaited(_syncDesiredStateToServer(token: token, desiredQuantities: next));
    }
  }

  Future<void> remove(String lineKey) async {
    final next = <String, int>{...state.quantities}..remove(lineKey);
    _applyLocalState(next);
    await _persist();
    final token = ref.read(buyerAuthTokenProvider);
    if (token != null && token.trim().isNotEmpty) {
      unawaited(_syncDesiredStateToServer(token: token, desiredQuantities: next));
    }
  }

  Future<void> clear() async {
    const next = <String, int>{};
    _applyLocalState(next);
    await _persist();
    final token = ref.read(buyerAuthTokenProvider);
    if (token != null && token.trim().isNotEmpty) {
      unawaited(_syncDesiredStateToServer(token: token, desiredQuantities: next));
    }
  }

  Future<void> clearSeller(String sellerId, List<HomeProduct> products) async {
    final sellerProductIds = products
        .where((product) => product.sellerId == sellerId)
        .map((product) => product.id)
        .toSet();
    final next = <String, int>{...state.quantities};
    next.removeWhere(
      (lineKey, _) => sellerProductIds.contains(productIdFromCartLineKey(lineKey)),
    );
    _applyLocalState(next);
    await _persist();
    final token = ref.read(buyerAuthTokenProvider);
    if (token != null && token.trim().isNotEmpty) {
      unawaited(_syncDesiredStateToServer(token: token, desiredQuantities: next));
    }
  }

  bool hasProduct(int productId, {String? variantId}) {
    return state.quantities.containsKey(cartLineKey(productId, variantId: variantId));
  }
}

final cartProvider = NotifierProvider<CartNotifier, CartState>(CartNotifier.new);

final cartItemCountProvider = Provider<int>((ref) {
  final cart = ref.watch(cartProvider);
  return cart.quantities.values.fold(0, (sum, qty) => sum + qty);
});

final cartGroupsProvider = Provider<List<SellerCartGroup>>((ref) {
  final cart = ref.watch(cartProvider);
  final bySeller = <String, List<CartLineItem>>{};

  for (final item in cart.itemsByLineKey.values) {
    bySeller.putIfAbsent(item.product.sellerId, () => <CartLineItem>[]);
    bySeller[item.product.sellerId]!.add(item);
  }

  return bySeller.entries
      .map(
        (entry) => SellerCartGroup(
          sellerId: entry.key,
          sellerName: entry.value.first.sellerName,
          farmName: entry.value.first.farmName,
          items: entry.value,
        ),
      )
      .toList();
});

final cartTotalProvider = Provider<int>((ref) {
  final groups = ref.watch(cartGroupsProvider);
  return groups.fold(0, (sum, group) => sum + group.sellerTotal);
});

({String productId, String? variantId}) _splitLineKey(String lineKey) {
  final parts = lineKey.split(':');
  return (productId: parts.first, variantId: parts.length > 1 ? parts.last : null);
}

List<String> _parseProductImages(Object? rawImages, List<String> fallback) {
  if (rawImages is List<dynamic>) {
    final parsed = rawImages
        .map((item) {
          if (item is String && item.trim().isNotEmpty) return item.trim();
          if (item is Map<String, dynamic>) {
            final secure = item['secureUrl'] as String?;
            if (secure != null && secure.trim().isNotEmpty) return secure.trim();
            final url = item['url'] as String?;
            if (url != null && url.trim().isNotEmpty) return url.trim();
          }
          return null;
        })
        .whereType<String>()
        .toList();
    if (parsed.isNotEmpty) return parsed;
  }
  return fallback.isNotEmpty ? fallback : const [''];
}

LogisticsMetadata _logisticsFromApi(Map<String, dynamic> source, LogisticsMetadata? fallback) {
  final unitWeightKg = (source['unitWeightKg'] as num?)?.toDouble() ?? fallback?.unitWeightKg ?? 1;
  return LogisticsMetadata(
    salesUnit: salesUnitFromJson(source['salesUnit'] ?? fallback?.salesUnit.apiValue),
    unitWeightKg: unitWeightKg,
    unitLengthCm: (source['unitLengthCm'] as num?)?.toDouble() ?? fallback?.unitLengthCm,
    unitWidthCm: (source['unitWidthCm'] as num?)?.toDouble() ?? fallback?.unitWidthCm,
    unitHeightCm: (source['unitHeightCm'] as num?)?.toDouble() ?? fallback?.unitHeightCm,
    packageType: packageTypeFromJson(source['packageType'] ?? fallback?.packageType.apiValue),
  );
}

int? _toInt(Object? value) {
  if (value is int) return value;
  if (value is num) return value.toInt();
  if (value is String) return int.tryParse(value);
  return null;
}
