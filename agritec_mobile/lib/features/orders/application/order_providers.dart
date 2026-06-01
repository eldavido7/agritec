import 'dart:math';

import 'package:agritec_mobile/core/storage/cache_providers.dart';
import 'package:agritec_mobile/features/auth/application/local_auth_provider.dart';
import 'package:agritec_mobile/features/account/application/address_providers.dart';
import 'package:agritec_mobile/features/cart/application/cart_providers.dart';
import 'package:agritec_mobile/features/product/application/product_details_providers.dart';
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
    required this.shippingOption,
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
  final ShippingOption shippingOption;
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
    'shippingOption': shippingOption.toJson(),
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
      shippingOption: ShippingOption.fromJson(
        json['shippingOption'] as Map<String, dynamic>,
      ),
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
        shippingOption: const ShippingOption(
          id: 'ship-kingsley-1',
          name: 'Lagos Same Day',
          price: 3500,
          deliveryEstimate: 'Same day',
          coverageArea: 'Lagos mainland and island',
          enabled: true,
        ),
        subtotal: 28500,
        discountAmount: 0,
        discountCode: null,
        total: 32000,
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
        shippingOption: const ShippingOption(
          id: 'ship-amina-1',
          name: 'Kano Metro Dispatch',
          price: 2500,
          deliveryEstimate: '24 hours',
          coverageArea: 'Kano city',
          enabled: true,
        ),
        subtotal: 8200,
        discountAmount: 0,
        discountCode: null,
        total: 10700,
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
    required ShippingOption shippingOption,
    required int discountAmount,
    String? discountCode,
  }) {
    final random = Random();
    final subtotal = group.sellerTotal;
    final total = subtotal + shippingOption.price - discountAmount;
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
      shippingOption: shippingOption,
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
