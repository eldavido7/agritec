import 'package:agritec_mobile/core/logistics/logistics_models.dart';
import 'package:agritec_mobile/features/home/application/home_providers.dart';
import 'package:agritec_mobile/features/home/domain/home_models.dart';
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
    required this.description,
    required this.variants,
    required this.discounts,
  });

  final String? description;
  final List<ProductVariant> variants;
  final List<ProductDiscount> discounts;
}

MarketplaceProductDetails? _detailsFromHomeProduct(HomeProduct? product) {
  if (product == null) return null;
  return MarketplaceProductDetails(
    description: product.description,
    variants: product.variants
        .map(
          (variant) => ProductVariant(
            id: variant.id,
            name: variant.name,
            price: variant.price,
            inventory: variant.inventory,
            logistics: variant.logistics,
          ),
        )
        .toList(),
    discounts: product.discounts
        .map(
          (discount) => ProductDiscount(
            id: discount.id,
            sellerId: discount.sellerId,
            code: discount.code,
            description: discount.description,
            type: discount.type,
            value: discount.value,
            productIds: discount.productIds,
            variantIds: discount.variantIds,
            isActive: discount.isActive,
          ),
        )
        .toList(),
  );
}

final productDetailsProvider = Provider.family<MarketplaceProductDetails?, int>((ref, productId) {
  final product = ref
      .watch(homeFeaturedProductsProvider)
      .where((item) => item.id == productId)
      .firstOrNull;
  return _detailsFromHomeProduct(product);
});

final productVariantsProvider = Provider.family<List<ProductVariant>, int>((ref, productId) {
  final details = ref.watch(productDetailsProvider(productId));
  return details?.variants ?? const [];
});

final marketplaceDiscountsProvider = Provider.family<List<ProductDiscount>, int>((ref, productId) {
  final details = ref.watch(productDetailsProvider(productId));
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
