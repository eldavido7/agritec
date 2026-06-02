import 'package:flutter_riverpod/flutter_riverpod.dart';

class ProductVariant {
  const ProductVariant({
    required this.id,
    required this.name,
    required this.price,
    required this.inventory,
  });

  final String id;
  final String name;
  final int price;
  final int inventory;
}

class ProductDiscount {
  const ProductDiscount({
    required this.code,
    required this.description,
    required this.type,
    required this.value,
    required this.isActive,
  });

  final String code;
  final String description;
  final String type;
  final int value;
  final bool isActive;
}

const _variantsByProduct = <int, List<ProductVariant>>{
  1: [
    ProductVariant(id: '1-1', name: 'Premium 1kg', price: 28500, inventory: 120),
    ProductVariant(id: '1-2', name: 'Bulk 5kg', price: 135000, inventory: 80),
    ProductVariant(id: '1-3', name: 'Commercial 20kg', price: 520000, inventory: 50),
  ],
  2: [
    ProductVariant(id: '2-1', name: 'Standard 1kg', price: 17500, inventory: 100),
    ProductVariant(id: '2-2', name: 'Family 10kg', price: 160000, inventory: 80),
  ],
  3: [
    ProductVariant(id: '3-1', name: 'Regular 1kg', price: 2200, inventory: 5),
    ProductVariant(id: '3-2', name: 'Premium 1kg', price: 2800, inventory: 3),
  ],
  4: [
    ProductVariant(id: '4-1', name: '500ml', price: 1750, inventory: 100),
    ProductVariant(id: '4-2', name: '1L', price: 3500, inventory: 150),
    ProductVariant(id: '4-3', name: '2L', price: 6500, inventory: 70),
  ],
  101: [
    ProductVariant(id: '101-1', name: 'Fresh 1kg', price: 1200, inventory: 320),
    ProductVariant(id: '101-2', name: 'Crate 15kg', price: 16500, inventory: 90),
  ],
  102: [
    ProductVariant(id: '102-1', name: 'Half crate', price: 4300, inventory: 110),
    ProductVariant(id: '102-2', name: 'Full crate', price: 8200, inventory: 100),
  ],
  103: [
    ProductVariant(id: '103-1', name: 'Standard pack', price: 1800, inventory: 70),
  ],
};

const _discountByProduct = <int, ProductDiscount>{
  1: ProductDiscount(
    code: 'RICE15',
    description: '15% off premium rice packs',
    type: 'percentage',
    value: 15,
    isActive: true,
  ),
  4: ProductDiscount(
    code: 'MILK500',
    description: 'Flat ₦500 off full cream milk',
    type: 'fixed',
    value: 500,
    isActive: true,
  ),
  101: ProductDiscount(
    code: 'CORN20',
    description: '20% off sweet corn crates',
    type: 'percentage',
    value: 20,
    isActive: true,
  ),
};

final productVariantsProvider = Provider.family<List<ProductVariant>, int>((ref, productId) {
  return _variantsByProduct[productId] ?? const [];
});

final productDiscountProvider = Provider.family<ProductDiscount?, int>((ref, productId) {
  return _discountByProduct[productId];
});

