import 'package:agritec_mobile/core/logistics/logistics_models.dart';
import 'package:agritec_mobile/core/storage/cache_providers.dart';
import 'package:agritec_mobile/features/account/application/address_providers.dart';
import 'package:agritec_mobile/features/auth/application/local_auth_provider.dart';
import 'package:agritec_mobile/features/auth/data/auth_service.dart';
import 'package:agritec_mobile/features/cart/application/cart_providers.dart';
import 'package:agritec_mobile/features/home/application/home_providers.dart';
import 'package:agritec_mobile/features/home/domain/home_models.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class SellerOrderGroup {
  const SellerOrderGroup({
    required this.id,
    required this.sellerId,
    required this.sellerName,
    required this.farmName,
    required this.sellerLatitude,
    required this.sellerLongitude,
    required this.status,
    required this.items,
    required this.shippingQuote,
    required this.productSubtotal,
    required this.shippingFee,
    required this.discountTotal,
    required this.groupTotal,
    required this.timeline,
    required this.currentTimelineStep,
    required this.statusHistory,
    this.logisticsCompanyId,
    this.logisticsCompanyName,
  });

  final String id;
  final String sellerId;
  final String sellerName;
  final String farmName;
  final double sellerLatitude;
  final double sellerLongitude;
  final String status;
  final List<CartLineItem> items;
  final ShippingQuote shippingQuote;
  final int productSubtotal;
  final int shippingFee;
  final int discountTotal;
  final int groupTotal;
  final List<String> timeline;
  final int currentTimelineStep;
  final List<OrderStatusHistoryEntry> statusHistory;
  final String? logisticsCompanyId;
  final String? logisticsCompanyName;

  Map<String, dynamic> toJson() => {
        'id': id,
        'sellerId': sellerId,
        'sellerName': sellerName,
        'farmName': farmName,
        'sellerLatitude': sellerLatitude,
        'sellerLongitude': sellerLongitude,
        'status': status,
        'items': items.map((item) => item.toJson()).toList(),
        'shippingQuote': shippingQuote.toJson(),
        'productSubtotal': productSubtotal,
        'shippingFee': shippingFee,
        'discountTotal': discountTotal,
        'groupTotal': groupTotal,
        'timeline': timeline,
        'currentTimelineStep': currentTimelineStep,
        'statusHistory': statusHistory.map((entry) => entry.toJson()).toList(),
        'logisticsCompanyId': logisticsCompanyId,
        'logisticsCompanyName': logisticsCompanyName,
      };
}

class OrderStatusHistoryEntry {
  const OrderStatusHistoryEntry({
    required this.id,
    required this.status,
    required this.createdAt,
    this.description,
    this.updatedByRole,
    this.updatedByUserName,
  });

  final String id;
  final String status;
  final DateTime createdAt;
  final String? description;
  final String? updatedByRole;
  final String? updatedByUserName;

  Map<String, dynamic> toJson() => {
        'id': id,
        'status': status,
        'createdAt': createdAt.toIso8601String(),
        'description': description,
        'updatedByRole': updatedByRole,
        'updatedByUserName': updatedByUserName,
      };

  factory OrderStatusHistoryEntry.fromJson(Map<String, dynamic> json) {
    return OrderStatusHistoryEntry(
      id: json['id'] as String? ?? '',
      status: json['status'] as String? ?? 'PENDING',
      createdAt: DateTime.tryParse(json['createdAt'] as String? ?? '') ??
          DateTime.fromMillisecondsSinceEpoch(0),
      description: json['description'] as String?,
      updatedByRole: json['updatedByRole'] as String?,
      updatedByUserName: json['updatedByUserName'] as String?,
    );
  }
}

class MarketplaceOrder {
  const MarketplaceOrder({
    required this.id,
    required this.buyerUserId,
    required this.paymentReference,
    required this.createdAt,
    required this.buyerAddress,
    required this.productSubtotal,
    required this.totalShippingFee,
    required this.discountTotal,
    required this.grandTotal,
    required this.sellerGroups,
    required this.parentStatus,
    required this.paymentStatus,
  });

  final String id;
  final String buyerUserId;
  final String paymentReference;
  final DateTime createdAt;
  final BuyerAddress buyerAddress;
  final int productSubtotal;
  final int totalShippingFee;
  final int discountTotal;
  final int grandTotal;
  final List<SellerOrderGroup> sellerGroups;
  final String parentStatus;
  final String paymentStatus;

  int get itemCount => sellerGroups.fold(0, (sum, group) => sum + group.items.fold(0, (inner, item) => inner + item.quantity));

  String get statusSummary {
    if (paymentStatus.toUpperCase() != 'PAID') {
      return 'Pending payment';
    }
    final statuses = sellerGroups.map((group) => group.status).toSet().toList();
    if (statuses.length == 1) return statuses.first;
    if (statuses.contains('delivered')) return 'Partially delivered';
    if (statuses.contains('shipped')) return 'Partially shipped';
    return 'Processing';
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'buyerUserId': buyerUserId,
        'paymentReference': paymentReference,
        'createdAt': createdAt.toIso8601String(),
        'buyerAddress': buyerAddress.toJson(),
        'productSubtotal': productSubtotal,
        'totalShippingFee': totalShippingFee,
        'discountTotal': discountTotal,
        'grandTotal': grandTotal,
        'sellerGroups': sellerGroups.map((group) => group.toJson()).toList(),
        'parentStatus': parentStatus,
        'paymentStatus': paymentStatus,
      };
}

class OrdersNotifier extends Notifier<List<MarketplaceOrder>> {
  static const _cacheKeyPrefix = 'cache_orders_v3';
  String? _sessionStamp;
  bool _didPrime = false;
  bool _isPriming = false;

  @override
  List<MarketplaceOrder> build() {
    final userId = ref.watch(currentBuyerUserIdProvider);
    final token = ref.watch(buyerAuthTokenProvider);
    final stamp = '${userId ?? 'guest'}:${token ?? 'none'}';
    if (_sessionStamp != stamp) {
      _sessionStamp = stamp;
      _didPrime = false;
      _isPriming = false;
    }
    _prime();
    return const [];
  }

  String _cacheKey() {
    final userId = ref.read(currentBuyerUserIdProvider) ?? 'guest';
    return '$_cacheKeyPrefix-$userId';
  }

  Future<void> _prime() async {
    if (_didPrime || _isPriming) return;
    _didPrime = true;
    _isPriming = true;
    try {
      final cache = await ref.read(localCacheServiceProvider.future);
      final raw = cache.readJson(_cacheKey());
      if (raw case {'orders': List<dynamic> items}) {
        final parsed = items
            .whereType<Map<String, dynamic>>()
            .map(_marketplaceOrderFromJson)
            .toList();
        if (parsed.isNotEmpty) {
          state = parsed;
        }
      }

      final token = ref.read(buyerAuthTokenProvider);
      final userId = ref.read(currentBuyerUserIdProvider);
      if (token == null || token.trim().isEmpty || userId == null) {
        return;
      }

      await refresh();
    } finally {
      _isPriming = false;
    }
  }

  Future<void> refresh() async {
    final token = ref.read(buyerAuthTokenProvider);
    final userId = ref.read(currentBuyerUserIdProvider);
    if (token == null || token.trim().isEmpty || userId == null) {
      state = const [];
      return;
    }

    final api = ref.read(mobileApiClientProvider);
    final payload = await api.get('/api/orders', token: token);
    final rawOrders = payload['orders'];
    final fallbackProducts = ref.read(homeFeaturedProductsProvider);
    final fallbackSellers = ref.read(homeSellersProvider);
    if (rawOrders is! List<dynamic>) {
      state = const [];
      return;
    }

    state = rawOrders
        .whereType<Map<String, dynamic>>()
        .map((json) => orderFromApiJson(
              json,
              fallbackProducts: fallbackProducts,
              fallbackSellers: fallbackSellers,
            ))
        .toList();
    await _persist();
  }

  Future<MarketplaceOrder?> fetchOrderById(String orderId) async {
    final token = ref.read(buyerAuthTokenProvider);
    if (token == null || token.trim().isEmpty) return null;
    await refresh();
    final existing = state.where((item) => item.id == orderId).firstOrNull;
    if (existing != null) {
      return existing;
    }

    final api = ref.read(mobileApiClientProvider);
    final payload = await api.get('/api/orders/$orderId', token: token);
    final orderJson = payload['order'];
    if (orderJson is! Map<String, dynamic>) return null;
    final order = orderFromApiJson(
      orderJson,
      fallbackProducts: ref.read(homeFeaturedProductsProvider),
      fallbackSellers: ref.read(homeSellersProvider),
    );
    upsert(order);
    return order;
  }

  void upsert(MarketplaceOrder order) {
    final next = [...state];
    final index = next.indexWhere((item) => item.id == order.id);
    if (index >= 0) {
      next[index] = order;
    } else {
      next.insert(0, order);
    }
    state = next;
    _persist();
  }

  void upsertFromApiJson(Map<String, dynamic> json) {
    final order = orderFromApiJson(
      json,
      fallbackProducts: ref.read(homeFeaturedProductsProvider),
      fallbackSellers: ref.read(homeSellersProvider),
    );
    upsert(order);
  }

  Future<void> _persist() async {
    final cache = await ref.read(localCacheServiceProvider.future);
    await cache.saveJson(_cacheKey(), {
      'orders': state.map((order) => order.toJson()).toList(),
    });
  }
}

MarketplaceOrder _marketplaceOrderFromJson(Map<String, dynamic> json) {
  return MarketplaceOrder(
    id: json['id'] as String,
    buyerUserId: (json['buyerUserId'] as String?) ?? 'guest',
    paymentReference: (json['paymentReference'] as String?) ?? '',
    createdAt: DateTime.parse(json['createdAt'] as String),
    buyerAddress: BuyerAddress.fromJson(json['buyerAddress'] as Map<String, dynamic>),
    productSubtotal: (json['productSubtotal'] as num).toInt(),
    totalShippingFee: (json['totalShippingFee'] as num).toInt(),
    discountTotal: (json['discountTotal'] as num).toInt(),
    grandTotal: (json['grandTotal'] as num).toInt(),
    parentStatus: (json['parentStatus'] as String?) ?? 'PENDING_PAYMENT',
    paymentStatus: (json['paymentStatus'] as String?) ?? 'PENDING',
    sellerGroups: (json['sellerGroups'] as List<dynamic>)
        .whereType<Map<String, dynamic>>()
        .map(
          (group) => SellerOrderGroup(
            id: group['id'] as String,
            sellerId: group['sellerId'] as String,
            sellerName: group['sellerName'] as String,
            farmName: group['farmName'] as String,
            sellerLatitude: (group['sellerLatitude'] as num?)?.toDouble() ?? 0,
            sellerLongitude: (group['sellerLongitude'] as num?)?.toDouble() ?? 0,
            status: group['status'] as String,
            items: (group['items'] as List<dynamic>)
                .whereType<Map<String, dynamic>>()
                .map(CartLineItem.fromJson)
                .toList(),
            shippingQuote: ShippingQuote.fromJson(group['shippingQuote'] as Map<String, dynamic>),
            productSubtotal: (group['productSubtotal'] as num).toInt(),
            shippingFee: (group['shippingFee'] as num).toInt(),
            discountTotal: (group['discountTotal'] as num).toInt(),
            groupTotal: (group['groupTotal'] as num).toInt(),
            timeline: (group['timeline'] as List<dynamic>).map((item) => '$item').toList(),
            currentTimelineStep: (group['currentTimelineStep'] as num).toInt(),
            statusHistory:
                (group['statusHistory'] as List<dynamic>? ?? const <dynamic>[])
                    .whereType<Map<String, dynamic>>()
                    .map(OrderStatusHistoryEntry.fromJson)
                    .toList(),
            logisticsCompanyId: group['logisticsCompanyId'] as String?,
            logisticsCompanyName: group['logisticsCompanyName'] as String?,
          ),
        )
        .toList(),
  );
}

MarketplaceOrder orderFromApiJson(
  Map<String, dynamic> json, {
  required List<HomeProduct> fallbackProducts,
  required List<HomeSeller> fallbackSellers,
}) {
  final addressJson = json['addressSnapshot'] as Map<String, dynamic>?;
  final paymentJson = json['payment'] as Map<String, dynamic>?;
  final buyerId = (json['buyerId'] as String?) ?? (json['buyerUserId'] as String?) ?? 'guest';
  final sellerGroupsJson = (json['sellerGroups'] as List<dynamic>? ?? const <dynamic>[])
      .whereType<Map<String, dynamic>>()
      .toList();

  return MarketplaceOrder(
    id: json['id'] as String,
    buyerUserId: buyerId,
    paymentReference: (paymentJson?['reference'] as String?) ?? '',
    createdAt: DateTime.parse(json['createdAt'] as String),
    buyerAddress: BuyerAddress(
      id: 'order-${json['id']}-address',
      label: 'Delivery',
      displayName: (addressJson?['displayName'] as String?) ??
          (addressJson?['addressLine'] as String?) ??
          '',
      fullAddress: (addressJson?['fullAddress'] as String?) ?? '',
      addressLine: (addressJson?['addressLine'] as String?) ?? '',
      latitude: _parseDouble(addressJson?['latitude']),
      longitude: _parseDouble(addressJson?['longitude']),
      city: (addressJson?['city'] as String?) ?? '',
      state: (addressJson?['state'] as String?) ?? '',
      landmark: addressJson?['landmark'] as String?,
      isDefault: false,
      createdByRole: _creatorRoleFromAddress(addressJson),
      isManualAddress: addressJson?['isManualAddress'] as bool? ?? false,
      isAdminAssisted: addressJson?['isAdminAssisted'] as bool? ?? false,
    ),
    productSubtotal: (json['productSubtotal'] as num?)?.toInt() ?? 0,
    totalShippingFee: (json['totalShippingFee'] as num?)?.toInt() ?? 0,
    discountTotal: (json['discountTotal'] as num?)?.toInt() ?? 0,
    grandTotal: (json['grandTotal'] as num?)?.toInt() ?? 0,
    parentStatus: (json['status'] as String?) ?? 'PENDING_PAYMENT',
    paymentStatus: (json['paymentStatus'] as String?) ?? 'PENDING',
    sellerGroups: sellerGroupsJson.map((groupJson) {
      final sellerId = groupJson['sellerId'] as String? ?? 'unknown';
      final rawStatus = (groupJson['status'] as String?) ?? 'PENDING';
      final status = _groupStatusLabel(rawStatus);
      final statusHistory = (groupJson['statusHistory'] as List<dynamic>? ??
              const <dynamic>[])
          .whereType<Map<String, dynamic>>()
          .map(
            (entryJson) => OrderStatusHistoryEntry(
              id: entryJson['id'] as String? ?? '',
              status: (entryJson['status'] as String?) ?? 'PENDING',
              createdAt: DateTime.tryParse(
                    entryJson['createdAt'] as String? ?? '',
                  ) ??
                  DateTime.fromMillisecondsSinceEpoch(0),
              description: entryJson['description'] as String?,
              updatedByRole: entryJson['updatedByRole'] as String?,
              updatedByUserName:
                  (entryJson['updatedByUser'] as Map<String, dynamic>?)?['fullName']
                      as String?,
            ),
          )
          .toList();
      final timelineLabels = statusHistory.isNotEmpty
          ? statusHistory.map((entry) => _timelineLabelForStatus(entry.status)).toList()
          : _defaultTimeline;
      final timelineStep = statusHistory.isNotEmpty
          ? statusHistory.length - 1
          : _timelineStepForStatus(rawStatus);
      final rawItems = (groupJson['items'] as List<dynamic>? ?? const <dynamic>[])
          .whereType<Map<String, dynamic>>()
          .toList();
      final items = rawItems.map((itemJson) {
        final productId = int.tryParse('${itemJson['productId'] ?? ''}') ?? -1;
        final fallback = fallbackProducts.where((item) => item.id == productId).firstOrNull;
        final image = (itemJson['productImageUrlSnapshot'] as String?)?.trim();
        final product = HomeProduct(
          id: productId,
          sellerId: sellerId,
          createdAt: fallback?.createdAt ?? DateTime.fromMillisecondsSinceEpoch(0),
          name: (itemJson['variantTitleSnapshot'] as String?)?.trim().isNotEmpty == true
              ? '${itemJson['productTitleSnapshot']} - ${itemJson['variantTitleSnapshot']}'
              : (itemJson['productTitleSnapshot'] as String?) ?? fallback?.name ?? 'Product',
          categorySlug: fallback?.categorySlug ?? 'other',
          category: fallback?.category ?? 'Other',
          categoryNote: fallback?.categoryNote,
          price: (itemJson['unitPrice'] as num?)?.toInt() ?? fallback?.price ?? 0,
          inventory: (itemJson['quantity'] as num?)?.toInt() ?? 0,
          images: image != null && image.isNotEmpty
              ? [image]
              : (fallback?.images ?? const ['']),
          hasDiscount: false,
          discountLabel: null,
          logistics: LogisticsMetadata(
            salesUnit: salesUnitFromJson(itemJson['salesUnitSnapshot']),
            unitWeightKg: (itemJson['unitWeightKgSnapshot'] as num?)?.toDouble() ??
                fallback?.logistics.unitWeightKg ??
                1,
            unitLengthCm: (itemJson['unitLengthCmSnapshot'] as num?)?.toDouble(),
            unitWidthCm: (itemJson['unitWidthCmSnapshot'] as num?)?.toDouble(),
            unitHeightCm: (itemJson['unitHeightCmSnapshot'] as num?)?.toDouble(),
            packageType: packageTypeFromJson(itemJson['packageTypeSnapshot']),
          ),
        );
        return CartLineItem(
          lineKey: cartLineKey(product.id, variantId: itemJson['variantId'] as String?),
          product: product,
          quantity: (itemJson['quantity'] as num?)?.toInt() ?? 0,
          sellerName: (itemJson['sellerNameSnapshot'] as String?) ?? (groupJson['sellerNameSnapshot'] as String?) ?? 'Seller',
          farmName: (itemJson['farmNameSnapshot'] as String?) ?? (groupJson['farmNameSnapshot'] as String?) ?? 'Farm',
          variantId: itemJson['variantId'] as String?,
          variantName: itemJson['variantTitleSnapshot'] as String?,
        );
      }).toList();

      final liveSeller = fallbackSellers
          .where((item) => item.id == sellerId)
          .firstOrNull;
      final parsedSellerLat = _parseDouble(groupJson['sellerLatitude']);
      final parsedSellerLng = _parseDouble(groupJson['sellerLongitude']);
      final sellerLatitude = parsedSellerLat ??
          liveSeller?.latitude ??
          0;
      final sellerLongitude = parsedSellerLng ??
          liveSeller?.longitude ??
          0;

      return SellerOrderGroup(
        id: groupJson['id'] as String,
        sellerId: sellerId,
        sellerName: (groupJson['sellerNameSnapshot'] as String?) ?? 'Seller',
        farmName: (groupJson['farmNameSnapshot'] as String?) ?? 'Farm',
        sellerLatitude: sellerLatitude,
        sellerLongitude: sellerLongitude,
        status: status,
        items: items,
        shippingQuote: ShippingQuote(
          deliveryRegion: (groupJson['deliveryRegion'] as String?) ?? 'Unknown region',
          totalActualWeightKg: (groupJson['totalChargeableWeightKg'] as num?)?.toDouble() ?? 0,
          totalVolumetricWeightKg: null,
          usedVolumetricWeight: false,
          totalChargeableWeightKg: (groupJson['totalChargeableWeightKg'] as num?)?.toDouble() ?? 0,
          weightUnitSizeKg: (groupJson['weightUnitSizeKg'] as num?)?.toDouble() ?? 10,
          shippingUnits: (groupJson['shippingUnits'] as num?)?.toInt() ?? 1,
          minimumFee: (groupJson['minimumFee'] as num?)?.toInt() ?? 0,
          additionalUnitFee: (groupJson['additionalUnitFee'] as num?)?.toInt() ?? 0,
          shippingFee: (groupJson['shippingFee'] as num?)?.toInt() ?? 0,
        ),
        productSubtotal: (groupJson['productSubtotal'] as num?)?.toInt() ?? 0,
        shippingFee: (groupJson['shippingFee'] as num?)?.toInt() ?? 0,
        discountTotal: (groupJson['discountTotal'] as num?)?.toInt() ?? 0,
        groupTotal: (groupJson['groupTotal'] as num?)?.toInt() ?? 0,
        timeline: timelineLabels,
        currentTimelineStep: timelineStep,
        statusHistory: statusHistory,
        logisticsCompanyId: groupJson['logisticsCompanyId'] as String?,
        logisticsCompanyName: (groupJson['logisticsCompanyNameSnapshot']
                as String?) ??
            (groupJson['logisticsCompanyName'] as String?) ??
            (groupJson['logisticsCompany'] as Map<String, dynamic>?)?['companyName']
                as String?,
      );
    }).toList(),
  );
}

double? _parseDouble(Object? value) {
  if (value is num) return value.toDouble();
  if (value is String) return double.tryParse(value.trim());
  return null;
}

String _creatorRoleFromAddress(Map<String, dynamic>? addressJson) {
  final raw = (addressJson?['createdByRole'] as String?)?.toLowerCase();
  if (raw == 'admin') return 'admin';
  return 'buyer';
}

String _groupStatusLabel(String rawStatus) {
  switch (rawStatus.toUpperCase()) {
    case 'DELIVERED':
      return 'delivered';
    case 'SHIPPED':
      return 'shipped';
    case 'CANCELLED':
      return 'cancelled';
    case 'REFUNDED':
      return 'refunded';
    default:
      return 'processing';
  }
}

int _timelineStepForStatus(String rawStatus) {
  switch (rawStatus.toUpperCase()) {
    case 'PENDING':
      return 0;
    case 'CONFIRMED':
      return 1;
    case 'PROCESSING':
      return 2;
    case 'SHIPPED':
      return 3;
    case 'DELIVERED':
      return 4;
    default:
      return 0;
  }
}

String _timelineLabelForStatus(String rawStatus) {
  switch (rawStatus.toUpperCase()) {
    case 'PENDING':
      return 'Order placed';
    case 'CONFIRMED':
      return 'Payment confirmed';
    case 'PROCESSING':
      return 'Seller processing';
    case 'SHIPPED':
      return 'Out for delivery';
    case 'DELIVERED':
      return 'Delivered';
    case 'CANCELLED':
      return 'Cancelled';
    case 'REFUNDED':
      return 'Refund completed';
    default:
      return rawStatus;
  }
}

const _defaultTimeline = <String>[
  'Order placed',
  'Payment confirmed',
  'Seller processing',
  'Out for delivery',
  'Delivered',
];

final ordersProvider = NotifierProvider<OrdersNotifier, List<MarketplaceOrder>>(
  OrdersNotifier.new,
);

final orderByIdProvider = Provider.family<MarketplaceOrder?, String>((ref, orderId) {
  final orders = ref.watch(ordersProvider);
  for (final order in orders) {
    if (order.id == orderId) return order;
  }
  return null;
});


