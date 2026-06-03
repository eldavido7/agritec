import 'package:agritec_mobile/core/logistics/logistics_models.dart';
import 'package:agritec_mobile/features/home/domain/home_models.dart';

const homeCategories = <HomeCategory>[
  HomeCategory(
    id: 'cat-grains-cereals',
    slug: 'grains-cereals',
    name: 'Grains & Cereals',
    icon: 'GR',
    productCount: 3,
  ),
  HomeCategory(
    id: 'cat-vegetables',
    slug: 'vegetables',
    name: 'Vegetables',
    icon: 'VG',
    productCount: 4,
  ),
  HomeCategory(
    id: 'cat-dairy',
    slug: 'dairy',
    name: 'Dairy',
    icon: 'DY',
    productCount: 1,
  ),
  HomeCategory(
    id: 'cat-poultry',
    slug: 'poultry',
    name: 'Poultry',
    icon: 'PL',
    productCount: 1,
  ),
  HomeCategory(
    id: 'cat-other',
    slug: 'other',
    name: 'Other',
    icon: 'OT',
    productCount: 1,
  ),
];

const homeSellers = <HomeSeller>[
  HomeSeller(
    id: 'seller-kingsley',
    name: 'Kingsley Joseph',
    farmName: 'Kingsley Family Farm',
    location: 'Lagos, Nigeria',
    rating: 4.8,
    isVerified: true,
  ),
  HomeSeller(
    id: 'seller-amina',
    name: 'Amina Bello',
    farmName: 'Bello Fresh Produce',
    location: 'Kano, Nigeria',
    rating: 4.7,
    isVerified: true,
  ),
];

const homeFeaturedProducts = <HomeProduct>[
  HomeProduct(id: 1, sellerId: 'seller-kingsley', name: 'Basmati Rice - Premium Grade', categorySlug: 'grains-cereals', category: 'Grains & Cereals', price: 28500, inventory: 250, images: ['https://images.unsplash.com/photo-1586201375761-83865001e31c?w=1000','https://images.unsplash.com/photo-1516684732162-798a0062be99?w=1000','https://images.unsplash.com/photo-1603073163308-9654c3fb70b5?w=1000','https://images.unsplash.com/photo-1536304929831-ee1ca9d44906?w=1000'], hasDiscount: true, discountLabel: 'RICE15', logistics: LogisticsMetadata(salesUnit: SalesUnit.bag, unitWeightKg: 25, unitLengthCm: 60, unitWidthCm: 38, unitHeightCm: 16, packageType: PackageType.bag)),
  HomeProduct(id: 2, sellerId: 'seller-kingsley', name: 'Organic Wheat', categorySlug: 'grains-cereals', category: 'Grains & Cereals', price: 17500, inventory: 180, images: ['https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=1000','https://images.unsplash.com/photo-1618888007540-2bcfc17241fd?w=1000','https://images.unsplash.com/photo-1599599810694-d3003ca4b974?w=1000'], hasDiscount: false, discountLabel: null, logistics: LogisticsMetadata(salesUnit: SalesUnit.bag, unitWeightKg: 10, unitLengthCm: 50, unitWidthCm: 32, unitHeightCm: 12, packageType: PackageType.bag)),
  HomeProduct(id: 3, sellerId: 'seller-kingsley', name: 'Fresh Tomatoes', categorySlug: 'vegetables', category: 'Vegetables', price: 2200, inventory: 8, images: ['https://images.unsplash.com/photo-1592924357228-91ec8127936f?w=1000','https://images.unsplash.com/photo-1571407118258-4d34d75b5b38?w=1000','https://images.unsplash.com/photo-1577003833154-a92bbd4d6d7d?w=1000'], hasDiscount: false, discountLabel: null, logistics: LogisticsMetadata(salesUnit: SalesUnit.basket, unitWeightKg: 18, unitLengthCm: 55, unitWidthCm: 40, unitHeightCm: 28, packageType: PackageType.basket)),
  HomeProduct(id: 4, sellerId: 'seller-kingsley', name: 'Milk - Full Cream', categorySlug: 'dairy', category: 'Dairy', price: 3500, inventory: 320, images: ['https://images.unsplash.com/photo-1563636619-e9143da7973b?w=1000','https://images.unsplash.com/photo-1550583724-b2692b85b150?w=1000'], hasDiscount: true, discountLabel: 'MILK500', logistics: LogisticsMetadata(salesUnit: SalesUnit.litre, unitWeightKg: 1.1, unitLengthCm: 9, unitWidthCm: 9, unitHeightCm: 24, packageType: PackageType.box)),
  HomeProduct(id: 5, sellerId: 'seller-kingsley', name: 'Plantain', categorySlug: 'vegetables', category: 'Vegetables', price: 850, inventory: 450, images: ['https://images.unsplash.com/photo-1605027990121-cbae9e0642df?w=1000','https://images.unsplash.com/photo-1481349518771-20055b2a7b24?w=1000'], hasDiscount: false, discountLabel: null, logistics: LogisticsMetadata(salesUnit: SalesUnit.bundle, unitWeightKg: 3, unitLengthCm: 40, unitWidthCm: 25, unitHeightCm: 18, packageType: PackageType.bundle)),
  HomeProduct(id: 6, sellerId: 'seller-kingsley', name: 'Yam', categorySlug: 'vegetables', category: 'Vegetables', price: 2500, inventory: 9, images: ['https://images.unsplash.com/photo-1596097635121-14b63b7a0c19?w=1000','https://images.unsplash.com/photo-1615484477907-a8e2d6a2b077?w=1000'], hasDiscount: false, discountLabel: null, logistics: LogisticsMetadata(salesUnit: SalesUnit.piece, unitWeightKg: 2.5, packageType: PackageType.piece)),
  HomeProduct(id: 7, sellerId: 'seller-kingsley', name: 'Honey', categorySlug: 'other', category: 'Other', categoryNote: 'Natural Sweeteners', price: 5500, inventory: 85, images: ['https://images.unsplash.com/photo-1587049352861-d64a4ec2a1ea?w=1000','https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=1000'], hasDiscount: false, discountLabel: null, logistics: LogisticsMetadata(salesUnit: SalesUnit.pack, unitWeightKg: 1.5, packageType: PackageType.box)),
  HomeProduct(id: 101, sellerId: 'seller-amina', name: 'Sweet Corn', categorySlug: 'grains-cereals', category: 'Grains & Cereals', price: 1200, inventory: 640, images: ['https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=1000','https://images.unsplash.com/photo-1471193945509-9ad0617afabf?w=1000','https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=1000'], hasDiscount: true, discountLabel: 'CORN20', logistics: LogisticsMetadata(salesUnit: SalesUnit.crate, unitWeightKg: 15, unitLengthCm: 55, unitWidthCm: 35, unitHeightCm: 30, packageType: PackageType.crate)),
  HomeProduct(id: 102, sellerId: 'seller-amina', name: 'Free Range Eggs', categorySlug: 'poultry', category: 'Poultry', price: 4300, inventory: 210, images: ['https://images.unsplash.com/photo-1506976785307-8732e854ad03?w=1000','https://images.unsplash.com/photo-1587486913049-53fc88980cfc?w=1000'], hasDiscount: false, discountLabel: null, logistics: LogisticsMetadata(salesUnit: SalesUnit.tray, unitWeightKg: 2.2, unitLengthCm: 31, unitWidthCm: 31, unitHeightCm: 8, packageType: PackageType.crate)),
  HomeProduct(id: 103, sellerId: 'seller-amina', name: 'Red Bell Pepper', categorySlug: 'vegetables', category: 'Vegetables', price: 1800, inventory: 70, images: ['https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=1000'], hasDiscount: false, discountLabel: null, logistics: LogisticsMetadata(salesUnit: SalesUnit.crate, unitWeightKg: 12, unitLengthCm: 50, unitWidthCm: 35, unitHeightCm: 25, packageType: PackageType.crate)),
];


