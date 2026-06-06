import 'package:agritec_mobile/core/logistics/logistics_models.dart';
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

const _variantsByProduct = <int, List<ProductVariant>>{
  1: [
    ProductVariant(
      id: '1-1',
      name: 'Premium 1kg',
      price: 28500,
      inventory: 120,
      logistics: LogisticsMetadata(
        salesUnit: SalesUnit.bag,
        unitWeightKg: 1,
        unitLengthCm: 24,
        unitWidthCm: 16,
        unitHeightCm: 6,
        packageType: PackageType.bag,
      ),
    ),
    ProductVariant(
      id: '1-2',
      name: 'Bulk 5kg',
      price: 135000,
      inventory: 80,
      logistics: LogisticsMetadata(
        salesUnit: SalesUnit.bag,
        unitWeightKg: 5,
        unitLengthCm: 40,
        unitWidthCm: 26,
        unitHeightCm: 10,
        packageType: PackageType.bag,
      ),
    ),
    ProductVariant(
      id: '1-3',
      name: 'Commercial 20kg',
      price: 520000,
      inventory: 50,
      logistics: LogisticsMetadata(
        salesUnit: SalesUnit.bag,
        unitWeightKg: 20,
        unitLengthCm: 68,
        unitWidthCm: 42,
        unitHeightCm: 15,
        packageType: PackageType.bag,
      ),
    ),
  ],
  2: [
    ProductVariant(
      id: '2-1',
      name: 'Standard 1kg',
      price: 17500,
      inventory: 100,
      logistics: LogisticsMetadata(
        salesUnit: SalesUnit.bag,
        unitWeightKg: 1,
        unitLengthCm: 24,
        unitWidthCm: 16,
        unitHeightCm: 6,
        packageType: PackageType.bag,
      ),
    ),
    ProductVariant(
      id: '2-2',
      name: 'Family 10kg',
      price: 160000,
      inventory: 80,
      logistics: LogisticsMetadata(
        salesUnit: SalesUnit.bag,
        unitWeightKg: 10,
        unitLengthCm: 55,
        unitWidthCm: 34,
        unitHeightCm: 12,
        packageType: PackageType.bag,
      ),
    ),
  ],
  3: [
    ProductVariant(
      id: '3-1',
      name: 'Regular 1kg',
      price: 2200,
      inventory: 5,
      logistics: LogisticsMetadata(
        salesUnit: SalesUnit.kg,
        unitWeightKg: 1,
        packageType: PackageType.piece,
      ),
    ),
    ProductVariant(
      id: '3-2',
      name: 'Premium 1kg',
      price: 2800,
      inventory: 3,
      logistics: LogisticsMetadata(
        salesUnit: SalesUnit.kg,
        unitWeightKg: 1,
        packageType: PackageType.piece,
      ),
    ),
  ],
  4: [
    ProductVariant(
      id: '4-1',
      name: '500ml',
      price: 1750,
      inventory: 100,
      logistics: LogisticsMetadata(
        salesUnit: SalesUnit.litre,
        unitWeightKg: 0.55,
        unitLengthCm: 7,
        unitWidthCm: 7,
        unitHeightCm: 18,
        packageType: PackageType.piece,
      ),
    ),
    ProductVariant(
      id: '4-2',
      name: '1L',
      price: 3500,
      inventory: 150,
      logistics: LogisticsMetadata(
        salesUnit: SalesUnit.litre,
        unitWeightKg: 1.1,
        unitLengthCm: 9,
        unitWidthCm: 9,
        unitHeightCm: 24,
        packageType: PackageType.piece,
      ),
    ),
    ProductVariant(
      id: '4-3',
      name: '2L',
      price: 6500,
      inventory: 70,
      logistics: LogisticsMetadata(
        salesUnit: SalesUnit.litre,
        unitWeightKg: 2.2,
        unitLengthCm: 12,
        unitWidthCm: 12,
        unitHeightCm: 30,
        packageType: PackageType.piece,
      ),
    ),
  ],
  101: [
    ProductVariant(
      id: '101-1',
      name: 'Fresh 1kg',
      price: 1200,
      inventory: 320,
      logistics: LogisticsMetadata(
        salesUnit: SalesUnit.kg,
        unitWeightKg: 1,
        packageType: PackageType.piece,
      ),
    ),
    ProductVariant(
      id: '101-2',
      name: 'Crate 15kg',
      price: 16500,
      inventory: 90,
      logistics: LogisticsMetadata(
        salesUnit: SalesUnit.crate,
        unitWeightKg: 15,
        unitLengthCm: 60,
        unitWidthCm: 40,
        unitHeightCm: 25,
        packageType: PackageType.crate,
      ),
    ),
  ],
  102: [
    ProductVariant(
      id: '102-1',
      name: 'Half crate',
      price: 4300,
      inventory: 110,
      logistics: LogisticsMetadata(
        salesUnit: SalesUnit.tray,
        unitWeightKg: 1.1,
        unitLengthCm: 30,
        unitWidthCm: 30,
        unitHeightCm: 4,
        packageType: PackageType.crate,
      ),
    ),
    ProductVariant(
      id: '102-2',
      name: 'Full crate',
      price: 8200,
      inventory: 100,
      logistics: LogisticsMetadata(
        salesUnit: SalesUnit.tray,
        unitWeightKg: 2.2,
        unitLengthCm: 30,
        unitWidthCm: 30,
        unitHeightCm: 7,
        packageType: PackageType.crate,
      ),
    ),
  ],
  103: [
    ProductVariant(id: '103-1', name: 'Standard pack', price: 1800, inventory: 70),
  ],
};

const _marketplaceDiscounts = <ProductDiscount>[
  ProductDiscount(
    id: 'disc-kingsley-1',
    sellerId: 'seller-kingsley',
    code: 'RICE15',
    description: '15% off premium rice packs',
    type: 'percentage',
    value: 15,
    productIds: [1],
    variantIds: [],
    isActive: true,
  ),
  ProductDiscount(
    id: 'disc-kingsley-2',
    sellerId: 'seller-kingsley',
    code: 'MILK500',
    description: 'Flat NGN 500 off the 1L full cream milk variant',
    type: 'fixed',
    value: 500,
    productIds: [],
    variantIds: ['4-2'],
    isActive: true,
  ),
  ProductDiscount(
    id: 'disc-amina-1',
    sellerId: 'seller-amina',
    code: 'CORN20',
    description: '20% off sweet corn crates',
    type: 'percentage',
    value: 20,
    productIds: [],
    variantIds: ['101-2'],
    isActive: true,
  ),
];

ProductDiscount? findApplicableDiscount({
  required String sellerId,
  required int productId,
  String? variantId,
  String? code,
}) {
  final normalizedCode = code?.trim().toUpperCase();
  for (final discount in _marketplaceDiscounts) {
    if (normalizedCode != null && discount.code.toUpperCase() != normalizedCode) {
      continue;
    }
    if (discount.appliesTo(
      sellerId: sellerId,
      productId: productId,
      variantId: variantId,
    )) {
      return discount;
    }
  }
  return null;
}

final productVariantsProvider = Provider.family<List<ProductVariant>, int>((ref, productId) {
  return _variantsByProduct[productId] ?? const [];
});

final marketplaceDiscountsProvider = Provider<List<ProductDiscount>>((ref) {
  return _marketplaceDiscounts;
});

final productDiscountProvider = Provider.family<ProductDiscount?, ({
  String sellerId,
  int productId,
  String? variantId,
})>((ref, request) {
  return findApplicableDiscount(
    sellerId: request.sellerId,
    productId: request.productId,
    variantId: request.variantId,
  );
});
