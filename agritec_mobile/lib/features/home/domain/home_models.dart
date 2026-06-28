import 'package:agritec_mobile/core/logistics/logistics_models.dart';

class HomeProductVariant {
  const HomeProductVariant({
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

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'price': price,
        'inventory': inventory,
        ...?logistics?.toJson(),
      };

  factory HomeProductVariant.fromJson(Map<String, dynamic> json) {
    return HomeProductVariant(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? 'Variant',
      price: (json['price'] as num?)?.toInt() ?? 0,
      inventory: (json['inventory'] as num?)?.toInt() ?? 0,
      logistics: json.containsKey('salesUnit')
          ? LogisticsMetadata.fromJson(json)
          : null,
    );
  }
}

class HomeProductDiscount {
  const HomeProductDiscount({
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

  bool appliesTo({required String sellerId, required int productId, String? variantId}) {
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

  Map<String, dynamic> toJson() => {
        'id': id,
        'sellerId': sellerId,
        'code': code,
        'description': description,
        'type': type,
        'value': value,
        'productIds': productIds,
        'variantIds': variantIds,
        'isActive': isActive,
      };

  factory HomeProductDiscount.fromJson(Map<String, dynamic> json) {
    return HomeProductDiscount(
      id: json['id'] as String? ?? '',
      sellerId: json['sellerId'] as String? ?? '',
      code: json['code'] as String? ?? '',
      description: json['description'] as String? ?? '',
      type: json['type'] as String? ?? '',
      value: (json['value'] as num?)?.toInt() ?? 0,
      productIds: (json['productIds'] as List<dynamic>? ?? const <dynamic>[])
          .map((item) => int.tryParse('$item'))
          .whereType<int>()
          .toList(),
      variantIds: (json['variantIds'] as List<dynamic>? ?? const <dynamic>[])
          .map((item) => '$item')
          .toList(),
      isActive: json['isActive'] as bool? ?? false,
    );
  }
}

class HomeCategory {
  const HomeCategory({
    required this.id,
    required this.slug,
    required this.name,
    required this.icon,
    required this.productCount,
  });

  final String id;
  final String slug;
  final String name;
  final String icon;
  final int productCount;

  Map<String, dynamic> toJson() => {
        'id': id,
        'slug': slug,
        'name': name,
        'icon': icon,
        'productCount': productCount,
      };

  factory HomeCategory.fromJson(Map<String, dynamic> json) {
    return HomeCategory(
      id: json['id'] as String,
      slug: json['slug'] as String,
      name: json['name'] as String,
      icon: json['icon'] as String,
      productCount: (json['productCount'] as num).toInt(),
    );
  }
}

class HomeSeller {
  const HomeSeller({
    required this.id,
    required this.name,
    required this.farmName,
    required this.location,
    this.state,
    this.latitude,
    this.longitude,
    required this.rating,
    required this.isVerified,
  });

  final String id;
  final String name;
  final String farmName;
  final String location;
  final String? state;
  final double? latitude;
  final double? longitude;
  final double rating;
  final bool isVerified;

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'farmName': farmName,
        'location': location,
        'state': state,
        'latitude': latitude,
        'longitude': longitude,
        'rating': rating,
        'isVerified': isVerified,
      };

  factory HomeSeller.fromJson(Map<String, dynamic> json) {
    return HomeSeller(
      id: json['id'] as String,
      name: json['name'] as String,
      farmName: json['farmName'] as String,
      location: json['location'] as String,
      state: json['state'] as String?,
      latitude: (json['latitude'] as num?)?.toDouble(),
      longitude: (json['longitude'] as num?)?.toDouble(),
      rating: (json['rating'] as num).toDouble(),
      isVerified: json['isVerified'] as bool,
    );
  }
}

class HomeProduct {
  const HomeProduct({
    required this.id,
    required this.sellerId,
    required this.createdAt,
    required this.name,
    this.description,
    required this.categorySlug,
    required this.category,
    this.categoryNote,
    required this.price,
    required this.inventory,
    required this.images,
    required this.hasDiscount,
    required this.discountLabel,
    this.variants = const <HomeProductVariant>[],
    this.discounts = const <HomeProductDiscount>[],
    required this.logistics,
  });

  final int id;
  final String sellerId;
  final DateTime createdAt;
  final String name;
  final String? description;
  final String categorySlug;
  final String category;
  final String? categoryNote;
  final int price;
  final int inventory;
  final List<String> images;
  final bool hasDiscount;
  final String? discountLabel;
  final List<HomeProductVariant> variants;
  final List<HomeProductDiscount> discounts;
  final LogisticsMetadata logistics;

  String get imageUrl => images.isEmpty ? '' : images.first;
  String get salesUnitLabel => logistics.salesUnit.label;

      Map<String, dynamic> toJson() => {
        'id': id,
        'sellerId': sellerId,
        'createdAt': createdAt.toIso8601String(),
        'name': name,
        'description': description,
        'categorySlug': categorySlug,
        'category': category,
        'categoryNote': categoryNote,
        'price': price,
        'inventory': inventory,
        'images': images,
        'hasDiscount': hasDiscount,
        'discountLabel': discountLabel,
        'variants': variants.map((item) => item.toJson()).toList(),
        'discounts': discounts.map((item) => item.toJson()).toList(),
        ...logistics.toJson(),
      };

  factory HomeProduct.fromJson(Map<String, dynamic> json) {
    return HomeProduct(
      id: (json['id'] as num).toInt(),
      sellerId: json['sellerId'] as String,
      createdAt: DateTime.tryParse(json['createdAt'] as String? ?? '') ??
          DateTime.fromMillisecondsSinceEpoch(0),
      name: json['name'] as String,
      description: (json['description'] as String?)?.trim().isEmpty == true
          ? null
          : json['description'] as String?,
      categorySlug: json['categorySlug'] as String,
      category: json['category'] as String,
      categoryNote: json['categoryNote'] as String?,
      price: (json['price'] as num).toInt(),
      inventory: (json['inventory'] as num).toInt(),
      images: (json['images'] as List<dynamic>).map((e) => e as String).toList(),
      hasDiscount: json['hasDiscount'] as bool,
      discountLabel: json['discountLabel'] as String?,
      variants: (json['variants'] as List<dynamic>? ?? const <dynamic>[])
          .whereType<Map<String, dynamic>>()
          .map(HomeProductVariant.fromJson)
          .toList(),
      discounts: (json['discounts'] as List<dynamic>? ?? const <dynamic>[])
          .whereType<Map<String, dynamic>>()
          .map(HomeProductDiscount.fromJson)
          .toList(),
      logistics: LogisticsMetadata.fromJson(json),
    );
  }
}
