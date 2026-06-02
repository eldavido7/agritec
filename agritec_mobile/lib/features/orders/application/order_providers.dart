import 'dart:math';

import 'package:agritec_mobile/core/storage/cache_providers.dart';
import 'package:agritec_mobile/features/auth/application/local_auth_provider.dart';
import 'package:agritec_mobile/features/account/application/address_providers.dart';
import 'package:agritec_mobile/features/cart/application/cart_providers.dart';
import 'package:agritec_mobile/core/logistics/logistics_models.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class MarketplaceOrder {
  const MarketplaceOrder({
    required this.id,
    required this.createdAt,
    required this.sellerId,
    required this.sellerName,
    required this.farmName,
    required this.sellerLatitude,
    required this.sellerLongitude,
    required this.buyerAddress,
    required this.items,
    required this.shippingQuote,
    required this.subtotal,
    required this.discountAmount,
    required this.discountCode,
    required this.total,
    required this.timeline,
    required this.currentTimelineStep,
    required this.buyerUserId,
  });

  final String id;
  final DateTime createdAt;
  final String sellerId;
  final String sellerName;
  final String farmName;
  final double sellerLatitude;
  final double sellerLongitude;
  final BuyerAddress buyerAddress;
  final List<CartLineItem> items;
  final ShippingQuote shippingQuote;
  final int subtotal;
  final int discountAmount;
  final String? discountCode;
  final int total;
  final List<String> timeline;
  final int currentTimelineStep;
  final String buyerUserId;

  Map<String, dynamic> toJson() => {
    'id': id,
    'createdAt': createdAt.toIso8601String(),
    'sellerId': sellerId,
    'sellerName': sellerName,
    'farmName': farmName,
    'sellerLatitude': sellerLatitude,
    'sellerLongitude': sellerLongitude,
    'buyerAddress': buyerAddress.toJson(),
    'items': items.map((item) => item.toJson()).toList(),
    'shippingQuote': shippingQuote.toJson(),
    'subtotal': subtotal,
    'discountAmount': discountAmount,
    'discountCode': discountCode,
    'total': total,
    'timeline': timeline,
    'currentTimelineStep': currentTimelineStep,
    'buyerUserId': buyerUserId,
  };

  factory MarketplaceOrder.fromJson(Map<String, dynamic> json) {
    return MarketplaceOrder(
      id: json['id'] as String,
      createdAt: DateTime.parse(json['createdAt'] as String),
      sellerId: json['sellerId'] as String,
      sellerName: json['sellerName'] as String,
      farmName: json['farmName'] as String,
      sellerLatitude: (json['sellerLatitude'] as num).toDouble(),
      sellerLongitude: (json['sellerLongitude'] as num).toDouble(),
      buyerAddress: BuyerAddress.fromJson(
        json['buyerAddress'] as Map<String, dynamic>,
      ),
      items: (json['items'] as List<dynamic>)
          .map((item) => CartLineItem.fromJson(item as Map<String, dynamic>))
          .toList(),
      shippingQuote: json['shippingQuote'] is Map<String, dynamic>
          ? ShippingQuote.fromJson(json['shippingQuote'] as Map<String, dynamic>)
          : _legacyShippingQuote(json['shippingOption'] as Map<String, dynamic>?),
      subtotal: (json['subtotal'] as num).toInt(),
      discountAmount: (json['discountAmount'] as num).toInt(),
      discountCode: json['discountCode'] as String?,
      total: (json['total'] as num).toInt(),
      timeline: (json['timeline'] as List<dynamic>)
          .map((e) => e as String)
          .toList(),
      currentTimelineStep: (json['currentTimelineStep'] as num?)?.toInt() ?? 0,
      buyerUserId: (json['buyerUserId'] as String?) ?? 'buyer-demo-1',
    );
  }
}


ShippingQuote _legacyShippingQuote(Map<String, dynamic>? json) {
  final price = (json?['price'] as num?)?.toInt() ?? 0;
  return ShippingQuote(
    deliveryRegion: 'Legacy shipping',
    totalChargeableWeightKg: 0,
    shippingUnits: price > 0 ? 1 : 0,
    locationRate: price,
    shippingFee: price,
  );
}
class OrdersNotifier extends Notifier<List<MarketplaceOrder>> {
  static const _cacheKeyPrefix = 'cache_orders_v1';
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

  List<MarketplaceOrder> _seedOrdersForCurrentUser() {
    final userId = ref.read(currentBuyerUserIdProvider);
    if (userId != 'buyer-demo-1') {
      return const [];
    }
    return [
      MarketplaceOrder(
        id: 'buyer-order-1025',
        createdAt: DateTime(2026, 5, 31, 10, 12),
        sellerId: 'seller-kingsley',
        sellerName: 'Kingsley Joseph',
        farmName: 'Kingsley Family Farm',
        sellerLatitude: 6.4474,
        sellerLongitude: 3.4722,
        buyerAddress: const BuyerAddress(
          id: 'addr-demo-1',
          label: 'Home',
          displayName: 'Ikate Elegushi, Lekki',
          fullAddress: '22 Freedom Way, Lekki Phase 1, Lagos',
          latitude: 6.4429,
          longitude: 3.4851,
          city: 'Lagos',
          state: 'Lagos',
          landmark: 'Near The Lennox Mall',
          isDefault: true,
        ),
        items: const [],
        shippingQuote: const ShippingQuote(deliveryRegion: 'Outside Abuja', totalChargeableWeightKg: 28.5, shippingUnits: 3, locationRate: 10000, shippingFee: 30000),
        subtotal: 28500,
        discountAmount: 0,
        discountCode: null,
        total: 58500,
        timeline: const [
          'Order placed',
          'Payment confirmed',
          'Seller processing',
          'Out for delivery',
          'Delivered',
        ],
        currentTimelineStep: 1,
        buyerUserId: 'buyer-demo-1',
      ),
      MarketplaceOrder(
        id: 'buyer-order-1026',
        createdAt: DateTime(2026, 5, 31, 14, 45),
        sellerId: 'seller-amina',
        sellerName: 'Amina Bello',
        farmName: 'Bello Fresh Produce',
        sellerLatitude: 12.0022,
        sellerLongitude: 8.592,
        buyerAddress: const BuyerAddress(
          id: 'addr-demo-2',
          label: 'Old Office',
          displayName: 'Ikeja Computer Village',
          fullAddress: '2 Otigba Street, Ikeja, Lagos',
          city: 'Lagos',
          state: 'Lagos',
          isManualAddress: true,
        ),
        items: const [],
        shippingQuote: const ShippingQuote(deliveryRegion: 'Outside Abuja', totalChargeableWeightKg: 8.2, shippingUnits: 1, locationRate: 10000, shippingFee: 10000),
        subtotal: 8200,
        discountAmount: 0,
        discountCode: null,
        total: 18200,
        timeline: const [
          'Order placed',
          'Payment confirmed',
          'Seller processing',
          'Out for delivery',
          'Delivered',
        ],
        currentTimelineStep: 0,
        buyerUserId: 'buyer-demo-1',
      ),
    ];
  }

  Future<void> _hydrate() async {
    if (_didHydrate) return;
    _didHydrate = true;
    final cache = await ref.read(localCacheServiceProvider.future);
    final raw = cache.readJson(_cacheKey());
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
    required SellerCartGroup group,
    required BuyerAddress buyerAddress,
    required ShippingQuote shippingQuote,
    required int discountAmount,
    String? discountCode,
  }) {
    final random = Random();
    final subtotal = group.sellerTotal;
    final total = subtotal + shippingQuote.shippingFee - discountAmount;
    final order = MarketplaceOrder(
      id: 'ORD${DateTime.now().millisecondsSinceEpoch}${random.nextInt(999)}',
      createdAt: DateTime.now(),
      sellerId: group.sellerId,
      sellerName: group.sellerName,
      farmName: group.farmName,
      sellerLatitude: _sellerCoordinates[group.sellerId]?.$1 ?? 6.4474,
      sellerLongitude: _sellerCoordinates[group.sellerId]?.$2 ?? 3.4722,
      buyerAddress: buyerAddress.copyWith(),
      items: group.items,
      shippingQuote: shippingQuote,
      subtotal: subtotal,
      discountAmount: discountAmount,
      discountCode: discountCode,
      total: total,
      timeline: const [
        'Order placed',
        'Payment confirmed',
        'Seller processing',
        'Out for delivery',
        'Delivered',
      ],
      currentTimelineStep: 0,
      buyerUserId: ref.read(currentBuyerUserIdProvider) ?? 'guest',
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

final orderByIdProvider = Provider.family<MarketplaceOrder?, String>((
  ref,
  orderId,
) {
  final orders = ref.watch(ordersProvider);
  for (final order in orders) {
    if (order.id == orderId) return order;
  }
  return null;
});



