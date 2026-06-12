import 'dart:math';

import 'package:agritec_mobile/core/logistics/logistics_models.dart';
import 'package:agritec_mobile/core/storage/cache_providers.dart';
import 'package:agritec_mobile/features/account/application/address_providers.dart';
import 'package:agritec_mobile/features/auth/application/local_auth_provider.dart';
import 'package:agritec_mobile/features/cart/application/cart_providers.dart';
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
      };

  factory SellerOrderGroup.fromJson(Map<String, dynamic> json) {
    return SellerOrderGroup(
      id: json['id'] as String,
      sellerId: json['sellerId'] as String,
      sellerName: json['sellerName'] as String,
      farmName: json['farmName'] as String,
      sellerLatitude: (json['sellerLatitude'] as num).toDouble(),
      sellerLongitude: (json['sellerLongitude'] as num).toDouble(),
      status: (json['status'] as String?) ?? _statusFromStep((json['currentTimelineStep'] as num?)?.toInt() ?? 0),
      items: (json['items'] as List<dynamic>)
          .map((item) => CartLineItem.fromJson(item as Map<String, dynamic>))
          .toList(),
      shippingQuote: json['shippingQuote'] is Map<String, dynamic>
          ? ShippingQuote.fromJson(json['shippingQuote'] as Map<String, dynamic>)
          : _legacyShippingQuote(json['shippingOption'] as Map<String, dynamic>?),
      productSubtotal: (json['productSubtotal'] as num?)?.toInt() ??
          (json['subtotal'] as num?)?.toInt() ??
          0,
      shippingFee: (json['shippingFee'] as num?)?.toInt() ??
          ((json['shippingQuote'] as Map<String, dynamic>?)?['shippingFee'] as num?)?.toInt() ??
          0,
      discountTotal: (json['discountTotal'] as num?)?.toInt() ??
          (json['discountAmount'] as num?)?.toInt() ??
          0,
      groupTotal: (json['groupTotal'] as num?)?.toInt() ??
          (json['total'] as num?)?.toInt() ??
          0,
      timeline: (json['timeline'] as List<dynamic>?)?.map((e) => e as String).toList() ?? _defaultTimeline,
      currentTimelineStep: (json['currentTimelineStep'] as num?)?.toInt() ?? 0,
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

  int get itemCount => sellerGroups.fold(0, (sum, group) => sum + group.items.fold(0, (inner, item) => inner + item.quantity));

  String get statusSummary {
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
      };

  factory MarketplaceOrder.fromJson(Map<String, dynamic> json) {
    final sellerGroupsJson = json['sellerGroups'];
    if (sellerGroupsJson is List<dynamic>) {
      return MarketplaceOrder(
        id: json['id'] as String,
        buyerUserId: (json['buyerUserId'] as String?) ?? 'buyer-demo-1',
        paymentReference: (json['paymentReference'] as String?) ?? 'PAY-${json['id']}',
        createdAt: DateTime.parse(json['createdAt'] as String),
        buyerAddress: BuyerAddress.fromJson(json['buyerAddress'] as Map<String, dynamic>),
        productSubtotal: (json['productSubtotal'] as num).toInt(),
        totalShippingFee: (json['totalShippingFee'] as num).toInt(),
        discountTotal: (json['discountTotal'] as num).toInt(),
        grandTotal: (json['grandTotal'] as num).toInt(),
        sellerGroups: sellerGroupsJson
            .map((item) => SellerOrderGroup.fromJson(item as Map<String, dynamic>))
            .toList(),
      );
    }

    final legacyGroup = SellerOrderGroup(
      id: '${json['id']}-group-1',
      sellerId: json['sellerId'] as String,
      sellerName: json['sellerName'] as String,
      farmName: json['farmName'] as String,
      sellerLatitude: (json['sellerLatitude'] as num).toDouble(),
      sellerLongitude: (json['sellerLongitude'] as num).toDouble(),
      status: _statusFromStep((json['currentTimelineStep'] as num?)?.toInt() ?? 0),
      items: (json['items'] as List<dynamic>)
          .map((item) => CartLineItem.fromJson(item as Map<String, dynamic>))
          .toList(),
      shippingQuote: json['shippingQuote'] is Map<String, dynamic>
          ? ShippingQuote.fromJson(json['shippingQuote'] as Map<String, dynamic>)
          : _legacyShippingQuote(json['shippingOption'] as Map<String, dynamic>?),
      productSubtotal: (json['subtotal'] as num?)?.toInt() ?? 0,
      shippingFee: ((json['shippingQuote'] as Map<String, dynamic>?)?['shippingFee'] as num?)?.toInt() ?? 0,
      discountTotal: (json['discountAmount'] as num?)?.toInt() ?? 0,
      groupTotal: (json['total'] as num?)?.toInt() ?? 0,
      timeline: (json['timeline'] as List<dynamic>?)?.map((e) => e as String).toList() ?? _defaultTimeline,
      currentTimelineStep: (json['currentTimelineStep'] as num?)?.toInt() ?? 0,
    );

    return MarketplaceOrder(
      id: json['id'] as String,
      buyerUserId: (json['buyerUserId'] as String?) ?? 'buyer-demo-1',
      paymentReference: 'PAY-${json['id']}',
      createdAt: DateTime.parse(json['createdAt'] as String),
      buyerAddress: BuyerAddress.fromJson(json['buyerAddress'] as Map<String, dynamic>),
      productSubtotal: (json['subtotal'] as num?)?.toInt() ?? 0,
      totalShippingFee: legacyGroup.shippingFee,
      discountTotal: legacyGroup.discountTotal,
      grandTotal: (json['total'] as num?)?.toInt() ?? 0,
      sellerGroups: [legacyGroup],
    );
  }
}

ShippingQuote _legacyShippingQuote(Map<String, dynamic>? json) {
  final price = (json?['price'] as num?)?.toInt() ?? 0;
  return ShippingQuote(
    deliveryRegion: 'Legacy shipping',
    totalActualWeightKg: 0,
    totalVolumetricWeightKg: null,
    usedVolumetricWeight: false,
    totalChargeableWeightKg: 0,
    weightUnitSizeKg: 10,
    shippingUnits: price > 0 ? 1 : 0,
    minimumFee: price,
    additionalUnitFee: price,
    shippingFee: price,
  );
}

const _defaultTimeline = <String>[
  'Order placed',
  'Payment confirmed',
  'Seller processing',
  'Out for delivery',
  'Delivered',
];

String _statusFromStep(int step) {
  if (step >= 4) return 'delivered';
  if (step >= 3) return 'shipped';
  return 'processing';
}

class OrdersNotifier extends Notifier<List<MarketplaceOrder>> {
  static const _cacheKeyPrefix = 'cache_orders_v2';
  bool _didHydrate = false;

  @override
  List<MarketplaceOrder> build() {
    ref.watch(currentBuyerUserIdProvider);
    _hydrate();
    return _seedOrdersForCurrentUser();
  }

  String _cacheKey() {
    final userId = ref.read(currentBuyerUserIdProvider) ?? 'guest';
    return '$_cacheKeyPrefix-$userId';
  }

  String _legacyCacheKey() {
    final userId = ref.read(currentBuyerUserIdProvider) ?? 'guest';
    return 'cache_orders_v1-$userId';
  }

  List<MarketplaceOrder> _seedOrdersForCurrentUser() {
    final userId = ref.read(currentBuyerUserIdProvider);
    if (userId != 'buyer-demo-1') {
      return const [];
    }
    return [
      MarketplaceOrder(
        id: 'buyer-order-3001',
        buyerUserId: 'buyer-demo-1',
        paymentReference: 'PSK-20260601-3001',
        createdAt: DateTime(2026, 6, 1, 10, 12),
        buyerAddress: const BuyerAddress(
          id: 'addr-demo-1',
          label: 'Home',
          displayName: 'Ikate Elegushi, Lekki',
          fullAddress: '22 Freedom Way, Lekki Phase 1, Lagos',
          addressLine: '22 Freedom Way',
          latitude: 6.4429,
          longitude: 3.4851,
          city: 'Lagos',
          state: 'Lagos',
          landmark: 'Near The Lennox Mall',
          isDefault: true,
        ),
        productSubtotal: 36700,
        totalShippingFee: 40000,
        discountTotal: 500,
        grandTotal: 76200,
        sellerGroups: const [
          SellerOrderGroup(
            id: 'buyer-order-3001-group-1',
            sellerId: 'seller-kingsley',
            sellerName: 'Kingsley Joseph',
            farmName: 'Kingsley Family Farm',
            sellerLatitude: 6.4474,
            sellerLongitude: 3.4722,
            status: 'delivered',
            items: [],
            shippingQuote: ShippingQuote(
              deliveryRegion: 'Outside Abuja',
              totalActualWeightKg: 28.5,
              totalVolumetricWeightKg: null,
              usedVolumetricWeight: false,
              totalChargeableWeightKg: 28.5,
              weightUnitSizeKg: 10,
              shippingUnits: 3,
              minimumFee: 5000,
              additionalUnitFee: 5000,
              shippingFee: 30000,
            ),
            productSubtotal: 28500,
            shippingFee: 30000,
            discountTotal: 0,
            groupTotal: 58500,
            timeline: _defaultTimeline,
            currentTimelineStep: 4,
          ),
          SellerOrderGroup(
            id: 'buyer-order-3001-group-2',
            sellerId: 'seller-amina',
            sellerName: 'Amina Bello',
            farmName: 'Bello Fresh Produce',
            sellerLatitude: 12.0022,
            sellerLongitude: 8.5920,
            status: 'shipped',
            items: [],
            shippingQuote: ShippingQuote(
              deliveryRegion: 'Outside Abuja',
              totalActualWeightKg: 8.2,
              totalVolumetricWeightKg: 6.4,
              usedVolumetricWeight: true,
              totalChargeableWeightKg: 8.2,
              weightUnitSizeKg: 10,
              shippingUnits: 1,
              minimumFee: 5000,
              additionalUnitFee: 5000,
              shippingFee: 10000,
            ),
            productSubtotal: 8200,
            shippingFee: 10000,
            discountTotal: 500,
            groupTotal: 17700,
            timeline: _defaultTimeline,
            currentTimelineStep: 3,
          ),
        ],
      ),
      MarketplaceOrder(
        id: 'buyer-order-3002',
        buyerUserId: 'buyer-demo-1',
        paymentReference: 'PSK-20260601-3002',
        createdAt: DateTime(2026, 6, 1, 14, 45),
        buyerAddress: const BuyerAddress(
          id: 'addr-demo-2',
          label: 'Old Office',
          displayName: 'Ikeja Computer Village',
          fullAddress: '2 Otigba Street, Ikeja, Lagos',
          addressLine: '2 Otigba Street',
          city: 'Lagos',
          state: 'Lagos',
          createdByRole: 'admin',
          isManualAddress: true,
          isAdminAssisted: true,
        ),
        productSubtotal: 16500,
        totalShippingFee: 10000,
        discountTotal: 0,
        grandTotal: 26500,
        sellerGroups: const [
          SellerOrderGroup(
            id: 'buyer-order-3002-group-1',
            sellerId: 'seller-amina',
            sellerName: 'Amina Bello',
            farmName: 'Bello Fresh Produce',
            sellerLatitude: 12.0022,
            sellerLongitude: 8.5920,
            status: 'processing',
            items: [],
            shippingQuote: ShippingQuote(
              deliveryRegion: 'Outside Abuja',
              totalActualWeightKg: 15,
              totalVolumetricWeightKg: 11.6,
              usedVolumetricWeight: true,
              totalChargeableWeightKg: 15,
              weightUnitSizeKg: 10,
              shippingUnits: 1,
              minimumFee: 5000,
              additionalUnitFee: 5000,
              shippingFee: 10000,
            ),
            productSubtotal: 16500,
            shippingFee: 10000,
            discountTotal: 0,
            groupTotal: 26500,
            timeline: _defaultTimeline,
            currentTimelineStep: 1,
          ),
        ],
      ),
    ];
  }

  Future<void> _hydrate() async {
    if (_didHydrate) return;
    _didHydrate = true;
    final cache = await ref.read(localCacheServiceProvider.future);
    final raw = cache.readJson(_cacheKey()) ?? cache.readJson(_legacyCacheKey());
    if (raw == null) return;
    final items = raw['orders'];
    if (items is! List<dynamic>) return;
    final parsed = <MarketplaceOrder>[];
    for (final item in items) {
      if (item is! Map<String, dynamic>) continue;
      parsed.add(MarketplaceOrder.fromJson(item));
    }
    if (parsed.isNotEmpty) {
      state = parsed;
    }
  }

  Future<void> _persist() async {
    final cache = await ref.read(localCacheServiceProvider.future);
    await cache.saveJson(_cacheKey(), {
      'orders': state.map((order) => order.toJson()).toList(),
    });
  }

  MarketplaceOrder createOrder({
    required List<SellerCartGroup> groups,
    required BuyerAddress buyerAddress,
    required Map<String, ShippingQuote> shippingQuotes,
    required Map<String, int> discountsBySeller,
    String? discountCode,
  }) {
    final random = Random();
    final orderId = 'ORD${DateTime.now().millisecondsSinceEpoch}${random.nextInt(999)}';
    final paymentReference = 'PSK-${DateTime.now().millisecondsSinceEpoch}${random.nextInt(99)}';
    final sellerGroups = <SellerOrderGroup>[];

    for (var index = 0; index < groups.length; index++) {
      final group = groups[index];
      final shippingQuote = shippingQuotes[group.sellerId]!;
      final groupDiscount = discountsBySeller[group.sellerId] ?? 0;
      final productSubtotal = group.sellerTotal;
      final shippingFee = shippingQuote.shippingFee;
      sellerGroups.add(
        SellerOrderGroup(
          id: '$orderId-group-${index + 1}',
          sellerId: group.sellerId,
          sellerName: group.sellerName,
          farmName: group.farmName,
          sellerLatitude: _sellerCoordinates[group.sellerId]?.$1 ?? 6.4474,
          sellerLongitude: _sellerCoordinates[group.sellerId]?.$2 ?? 3.4722,
          status: 'processing',
          items: group.items,
          shippingQuote: shippingQuote,
          productSubtotal: productSubtotal,
          shippingFee: shippingFee,
          discountTotal: groupDiscount,
          groupTotal: productSubtotal + shippingFee - groupDiscount,
          timeline: _defaultTimeline,
          currentTimelineStep: 0,
        ),
      );
    }

    final productSubtotal = sellerGroups.fold(0, (sum, group) => sum + group.productSubtotal);
    final totalShippingFee = sellerGroups.fold(0, (sum, group) => sum + group.shippingFee);
    final discountTotal = sellerGroups.fold(0, (sum, group) => sum + group.discountTotal);
    final grandTotal = sellerGroups.fold(0, (sum, group) => sum + group.groupTotal);

    final order = MarketplaceOrder(
      id: orderId,
      buyerUserId: ref.read(currentBuyerUserIdProvider) ?? 'guest',
      paymentReference: paymentReference,
      createdAt: DateTime.now(),
      buyerAddress: buyerAddress.copyWith(),
      productSubtotal: productSubtotal,
      totalShippingFee: totalShippingFee,
      discountTotal: discountTotal,
      grandTotal: grandTotal,
      sellerGroups: sellerGroups,
    );
    state = [order, ...state];
    _persist();
    return order;
  }
}

const _sellerCoordinates = <String, (double, double)>{
  'seller-kingsley': (6.4474, 3.4722),
  'seller-amina': (12.0022, 8.5920),
};

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

