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
    required this.rating,
    required this.isVerified,
  });

  final String id;
  final String name;
  final String farmName;
  final String location;
  final double rating;
  final bool isVerified;

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'farmName': farmName,
        'location': location,
        'rating': rating,
        'isVerified': isVerified,
      };

  factory HomeSeller.fromJson(Map<String, dynamic> json) {
    return HomeSeller(
      id: json['id'] as String,
      name: json['name'] as String,
      farmName: json['farmName'] as String,
      location: json['location'] as String,
      rating: (json['rating'] as num).toDouble(),
      isVerified: json['isVerified'] as bool,
    );
  }
}

class HomeProduct {
  const HomeProduct({
    required this.id,
    required this.sellerId,
    required this.name,
    required this.categorySlug,
    required this.category,
    this.categoryNote,
    required this.price,
    required this.inventory,
    required this.images,
    required this.hasDiscount,
    required this.discountLabel,
  });

  final int id;
  final String sellerId;
  final String name;
  final String categorySlug;
  final String category;
  final String? categoryNote;
  final int price;
  final int inventory;
  final List<String> images;
  final bool hasDiscount;
  final String? discountLabel;

  String get imageUrl => images.first;

  Map<String, dynamic> toJson() => {
        'id': id,
        'sellerId': sellerId,
        'name': name,
        'categorySlug': categorySlug,
        'category': category,
        'categoryNote': categoryNote,
        'price': price,
        'inventory': inventory,
        'images': images,
        'hasDiscount': hasDiscount,
        'discountLabel': discountLabel,
      };

  factory HomeProduct.fromJson(Map<String, dynamic> json) {
    return HomeProduct(
      id: (json['id'] as num).toInt(),
      sellerId: json['sellerId'] as String,
      name: json['name'] as String,
      categorySlug: json['categorySlug'] as String,
      category: json['category'] as String,
      categoryNote: json['categoryNote'] as String?,
      price: (json['price'] as num).toInt(),
      inventory: (json['inventory'] as num).toInt(),
      images: (json['images'] as List<dynamic>).map((e) => e as String).toList(),
      hasDiscount: json['hasDiscount'] as bool,
      discountLabel: json['discountLabel'] as String?,
    );
  }
}
