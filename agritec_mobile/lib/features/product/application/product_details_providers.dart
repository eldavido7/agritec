import 'package:agritec_mobile/core/logistics/logistics_models.dart';
import 'package:agritec_mobile/features/auth/data/auth_service.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class ProductVariant {
  const ProductVariant({
    required this.id,
    required this.name,
    required this.price,
    required this.inventory,
    this.logistics,
  });

  final String id;
  final String name;
  final int price;
  final int inventory;
  final LogisticsMetadata? logistics;
}

class ProductDiscount {
  const ProductDiscount({
    required this.id,
    required this.sellerId,
    required this.code,
    required this.description,
    required this.type,
    required this.value,
    required this.productIds,
    required this.variantIds,
    required this.isActive,
  });

  final String id;
  final String sellerId;
  final String code;
  final String description;
  final String type;
  final int value;
  final List<int> productIds;
  final List<String> variantIds;
  final bool isActive;

  bool appliesTo({
    required String sellerId,
    required int productId,
    String? variantId,
  }) {
    if (!isActive || this.sellerId != sellerId) return false;
    final normalizedVariantId = variantId?.trim();
    if (variantIds.isNotEmpty) {
      return normalizedVariantId != null && variantIds.contains(normalizedVariantId);
    }
    if (productIds.isNotEmpty) {
      return productIds.contains(productId);
    }
    return false;
  }
}

class MarketplaceProductDetails {
  const MarketplaceProductDetails({
    required this.variants,
    required this.discounts,
  });

  final List<ProductVariant> variants;
  final List<ProductDiscount> discounts;
}

final productDetailsProvider = FutureProvider.family<MarketplaceProductDetails, int>((ref, productId) async {
  final api = ref.read(mobileApiClientProvider);
  final productPayload = await api.get('/api/products/$productId');
  final productJson = productPayload['product'] as Map<String, dynamic>;
  final sellerId = productJson['sellerId'] as String;
  final discountsPayload = await api.get('/api/discounts', queryParameters: {
    'sellerId': sellerId,
    'productId': '$productId',
  });

  final variants = ((productJson['variants'] as List<dynamic>?) ?? const <dynamic>[])
      .whereType<Map<String, dynamic>>()
      .map(
        (variant) => ProductVariant(
          id: variant['id'] as String,
          name: (variant['name'] as String?) ?? 'Variant',
          price: (variant['price'] as num?)?.toInt() ?? 0,
          inventory: (variant['inventory'] as num?)?.toInt() ?? 0,
          logistics: LogisticsMetadata(
            salesUnit: salesUnitFromJson(variant['salesUnit'] ?? productJson['salesUnit']),
            unitWeightKg: (variant['unitWeightKg'] as num?)?.toDouble() ??
                (productJson['unitWeightKg'] as num?)?.toDouble() ??
                1,
            unitLengthCm: (variant['unitLengthCm'] as num?)?.toDouble() ??
                (productJson['unitLengthCm'] as num?)?.toDouble(),
            unitWidthCm: (variant['unitWidthCm'] as num?)?.toDouble() ??
                (productJson['unitWidthCm'] as num?)?.toDouble(),
            unitHeightCm: (variant['unitHeightCm'] as num?)?.toDouble() ??
                (productJson['unitHeightCm'] as num?)?.toDouble(),
            packageType: packageTypeFromJson(variant['packageType'] ?? productJson['packageType']),
          ),
        ),
      )
      .toList();

  final discounts = ((discountsPayload['discounts'] as List<dynamic>?) ?? const <dynamic>[])
      .whereType<Map<String, dynamic>>()
      .map(
        (discount) => ProductDiscount(
          id: discount['id'] as String,
          sellerId: discount['sellerId'] as String,
          code: (discount['code'] as String?) ?? '',
          description: (discount['description'] as String?) ?? '',
          type: ((discount['type'] as String?) ?? '').toLowerCase(),
          value: (discount['value'] as num?)?.toInt() ?? 0,
          productIds: ((discount['productIds'] as List<dynamic>?) ?? const <dynamic>[])
              .map((item) => int.tryParse('$item'))
              .whereType<int>()
              .toList(),
          variantIds: ((discount['variantIds'] as List<dynamic>?) ?? const <dynamic>[])
              .map((item) => '$item')
              .toList(),
          isActive: discount['currentlyActive'] as bool? ?? (discount['isActive'] as bool? ?? false),
        ),
      )
      .toList();

  return MarketplaceProductDetails(variants: variants, discounts: discounts);
});

final productVariantsProvider = Provider.family<List<ProductVariant>, int>((ref, productId) {
  final details = ref.watch(productDetailsProvider(productId)).asData?.value;
  return details?.variants ?? const [];
});

final marketplaceDiscountsProvider = Provider.family<List<ProductDiscount>, int>((ref, productId) {
  final details = ref.watch(productDetailsProvider(productId)).asData?.value;
  return details?.discounts ?? const [];
});

final productDiscountProvider = Provider.family<ProductDiscount?, ({
  String sellerId,
  int productId,
  String? variantId,
})>((ref, request) {
  final discounts = ref.watch(marketplaceDiscountsProvider(request.productId));
  for (final discount in discounts) {
    if (discount.appliesTo(
      sellerId: request.sellerId,
      productId: request.productId,
      variantId: request.variantId,
    )) {
      return discount;
    }
  }
  return null;
});
