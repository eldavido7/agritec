import bcrypt from 'bcryptjs';
import { PrismaClient, Prisma, UserRole, ProductStatus, SalesUnit, PackageType } from '@prisma/client';

const prisma = new PrismaClient();
const decimal = (value) => new Prisma.Decimal(value);

const categories = [
  { slug: 'vegetables', label: 'Vegetables' },
  { slug: 'fruits', label: 'Fruits' },
  { slug: 'grains-cereals', label: 'Grains & Cereals' },
  { slug: 'tubers-roots', label: 'Tubers & Roots' },
  { slug: 'legumes', label: 'Legumes' },
  { slug: 'spices-herbs', label: 'Spices & Herbs' },
  { slug: 'livestock', label: 'Livestock' },
  { slug: 'poultry', label: 'Poultry' },
  { slug: 'fish-seafood', label: 'Fish & Seafood' },
  { slug: 'dairy', label: 'Dairy' },
  { slug: 'seeds-seedlings', label: 'Seeds & Seedlings' },
  { slug: 'farm-inputs', label: 'Farm Inputs' },
  { slug: 'processed-farm-products', label: 'Processed Farm Products' },
  { slug: 'other', label: 'Other' },
].map((category, index) => ({ ...category, sortOrder: index + 1, isActive: true }));

const adminUser = {
  id: 'admin-super-1',
  email: 'admin@agritec.com',
  fullName: 'Admin User',
  phone: '+2347000000001',
  password: 'admin123',
  role: UserRole.ADMIN,
};

const sellerUsers = [
  {
    userId: 'user-seller-kingsley',
    sellerId: 'seller-kingsley',
    email: 'kingsley@farm.com',
    fullName: 'Kingsley Joseph',
    phone: '+2347012345678',
    password: 'kingsley123',
    farmName: 'Kingsley Family Farm',
    locationLabel: 'Lagos, Nigeria',
    fullAddress: '12 Admiralty Way, Lekki Phase 1, Lagos',
    city: 'Lagos',
    state: 'Lagos',
    latitude: 6.4474,
    longitude: 3.4722,
  },
  {
    userId: 'user-seller-amina',
    sellerId: 'seller-amina',
    email: 'amina@farm.com',
    fullName: 'Amina Bello',
    phone: '+2347023456789',
    password: 'amina123',
    farmName: 'Bello Fresh Produce',
    locationLabel: 'Kano, Nigeria',
    fullAddress: '45 Zoo Road, Kano Municipal, Kano',
    city: 'Kano',
    state: 'Kano',
    latitude: 12.0022,
    longitude: 8.5920,
  },
];

const buyerUsers = [
  {
    userId: 'user-buyer-demo-1',
    buyerId: 'buyer-demo-1',
    email: 'demo@agritec.app',
    fullName: 'Demo Buyer',
    phone: '+2348010001111',
    password: 'Demo@1234',
    addresses: [
      {
        id: 'addr-demo-1',
        displayName: 'Ikate Elegushi, Lekki',
        addressLine: '22 Freedom Way',
        fullAddress: '22 Freedom Way, Lekki Phase 1, Lagos',
        city: 'Lagos',
        state: 'Lagos',
        landmark: 'Near The Lennox Mall',
        latitude: 6.4429,
        longitude: 3.4851,
        isDefault: true,
        isManualAddress: false,
        isAdminAssisted: false,
        createdByRole: 'BUYER',
      },
    ],
  },
];

const products = [
  {
    id: '1',
    sellerId: 'seller-kingsley',
    title: 'Basmati Rice - Premium Grade',
    description: 'Premium quality basmati rice from Kingsley Family Farm.',
    categorySlug: 'grains-cereals',
    basePrice: 28500,
    inventory: 250,
    hasVariants: true,
    salesUnit: SalesUnit.BAG,
    packageType: PackageType.BAG,
    unitWeightKg: 25,
    unitLengthCm: 70,
    unitWidthCm: 45,
    unitHeightCm: 16,
    images: [
      'https://images.unsplash.com/photo-1586190251793-378ec6acda75?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1603073163233-9696f59cd8be?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1548695867-641b6f70a77f?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400&h=300&fit=crop',
    ],
    variants: [
      { id: '1-1', name: 'Premium 1kg', price: 28500, inventory: 120, salesUnit: SalesUnit.BAG, packageType: PackageType.BAG, unitWeightKg: 1, unitLengthCm: 24, unitWidthCm: 16, unitHeightCm: 6 },
      { id: '1-2', name: 'Bulk 5kg', price: 135000, inventory: 80, salesUnit: SalesUnit.BAG, packageType: PackageType.BAG, unitWeightKg: 5, unitLengthCm: 40, unitWidthCm: 26, unitHeightCm: 10 },
      { id: '1-3', name: 'Commercial 20kg', price: 520000, inventory: 50, salesUnit: SalesUnit.BAG, packageType: PackageType.BAG, unitWeightKg: 20, unitLengthCm: 68, unitWidthCm: 42, unitHeightCm: 15 },
    ],
  },
  {
    id: '2',
    sellerId: 'seller-kingsley',
    title: 'Organic Wheat',
    description: 'Organic wheat suitable for household and wholesale buyers.',
    categorySlug: 'grains-cereals',
    basePrice: 17500,
    inventory: 180,
    hasVariants: true,
    salesUnit: SalesUnit.BAG,
    packageType: PackageType.BAG,
    unitWeightKg: 20,
    unitLengthCm: 68,
    unitWidthCm: 42,
    unitHeightCm: 14,
    images: [
      'https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1618888007540-2bcfc17241fd?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1599599810694-d3003ca4b974?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1626082927389-6cd097cda687?w=400&h=300&fit=crop',
    ],
    variants: [
      { id: '2-1', name: 'Standard 1kg', price: 17500, inventory: 100, salesUnit: SalesUnit.BAG, packageType: PackageType.BAG, unitWeightKg: 1, unitLengthCm: 24, unitWidthCm: 16, unitHeightCm: 6 },
      { id: '2-2', name: 'Family 10kg', price: 160000, inventory: 80, salesUnit: SalesUnit.BAG, packageType: PackageType.BAG, unitWeightKg: 10, unitLengthCm: 55, unitWidthCm: 34, unitHeightCm: 12 },
    ],
  },
  {
    id: '3',
    sellerId: 'seller-kingsley',
    title: 'Fresh Tomatoes',
    description: 'Fresh tomatoes harvested and packed for market delivery.',
    categorySlug: 'vegetables',
    basePrice: 2200,
    inventory: 8,
    hasVariants: true,
    salesUnit: SalesUnit.BASKET,
    packageType: PackageType.BASKET,
    unitWeightKg: 18,
    unitLengthCm: 55,
    unitWidthCm: 38,
    unitHeightCm: 28,
    images: [
      'https://images.unsplash.com/photo-1592924357228-91ec8127936f?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1571407118258-4d34d75b5b38?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1577003833154-a92bbd4d6d7d?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1523677071509-39a1f5c59d3c?w=400&h=300&fit=crop',
    ],
    variants: [
      { id: '3-1', name: 'Regular 1kg', price: 2200, inventory: 5, salesUnit: SalesUnit.KG, packageType: PackageType.PIECE, unitWeightKg: 1 },
      { id: '3-2', name: 'Premium 1kg', price: 2800, inventory: 3, salesUnit: SalesUnit.KG, packageType: PackageType.PIECE, unitWeightKg: 1 },
    ],
  },
  {
    id: '4',
    sellerId: 'seller-kingsley',
    title: 'Milk - Full Cream',
    description: 'Full cream milk offered in multiple retail volumes.',
    categorySlug: 'dairy',
    basePrice: 3500,
    inventory: 320,
    hasVariants: true,
    salesUnit: SalesUnit.LITRE,
    packageType: PackageType.PIECE,
    unitWeightKg: 1.1,
    unitLengthCm: 9,
    unitWidthCm: 9,
    unitHeightCm: 24,
    images: [
      'https://images.unsplash.com/photo-1608270861620-7c40ca6fb718?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1523677571669-ba0c46d3cc0d?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1517693712202-14dd9538aa97?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1554995618-83f09137aa1d?w=400&h=300&fit=crop',
    ],
    variants: [
      { id: '4-1', name: '500ml', price: 1750, inventory: 100, salesUnit: SalesUnit.LITRE, packageType: PackageType.PIECE, unitWeightKg: 0.55, unitLengthCm: 7, unitWidthCm: 7, unitHeightCm: 18 },
      { id: '4-2', name: '1L', price: 3500, inventory: 150, salesUnit: SalesUnit.LITRE, packageType: PackageType.PIECE, unitWeightKg: 1.1, unitLengthCm: 9, unitWidthCm: 9, unitHeightCm: 24 },
      { id: '4-3', name: '2L', price: 6500, inventory: 70, salesUnit: SalesUnit.LITRE, packageType: PackageType.PIECE, unitWeightKg: 2.2, unitLengthCm: 12, unitWidthCm: 12, unitHeightCm: 30 },
    ],
  },
  {
    id: '5',
    sellerId: 'seller-kingsley',
    title: 'Plantain',
    description: 'Fresh plantain bundles prepared for retail and market supply.',
    categorySlug: 'vegetables',
    basePrice: 850,
    inventory: 450,
    hasVariants: false,
    salesUnit: SalesUnit.BUNDLE,
    packageType: PackageType.BUNDLE,
    unitWeightKg: 7,
    unitLengthCm: 60,
    unitWidthCm: 32,
    unitHeightCm: 25,
    images: [
      'https://images.unsplash.com/photo-1571407118258-4d34d75b5b38?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1577003833154-a92bbd4d6d7d?w=400&h=300&fit=crop',
    ],
    variants: [],
  },
  {
    id: '6',
    sellerId: 'seller-kingsley',
    title: 'Yam',
    description: 'Large yam tubers sold individually.',
    categorySlug: 'vegetables',
    basePrice: 2500,
    inventory: 9,
    hasVariants: false,
    salesUnit: SalesUnit.PIECE,
    packageType: PackageType.PIECE,
    unitWeightKg: 2.5,
    images: [
      'https://images.unsplash.com/photo-1511621776919-a1aae19e8ff5?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=400&h=300&fit=crop',
    ],
    variants: [],
  },
  {
    id: '7',
    sellerId: 'seller-kingsley',
    title: 'Honey',
    description: 'Natural honey packaged for direct sale.',
    categorySlug: 'other',
    categoryNote: 'Natural Sweeteners',
    basePrice: 5500,
    inventory: 85,
    hasVariants: false,
    salesUnit: SalesUnit.PACK,
    packageType: PackageType.BOX,
    unitWeightKg: 1.3,
    images: [
      'https://images.unsplash.com/photo-1587049352861-d64a4ec2a1ea?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400&h=300&fit=crop',
    ],
    variants: [],
  },
  {
    id: '101',
    sellerId: 'seller-amina',
    title: 'Sweet Corn',
    description: 'Sweet corn supplied fresh or in crate quantities.',
    categorySlug: 'grains-cereals',
    basePrice: 1200,
    inventory: 640,
    hasVariants: true,
    salesUnit: SalesUnit.CRATE,
    packageType: PackageType.CRATE,
    unitWeightKg: 15,
    unitLengthCm: 60,
    unitWidthCm: 40,
    unitHeightCm: 25,
    images: [
      'https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1471193945509-9ad0617afabf?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&h=300&fit=crop',
    ],
    variants: [
      { id: '101-1', name: 'Fresh 1kg', price: 1200, inventory: 320, salesUnit: SalesUnit.KG, packageType: PackageType.PIECE, unitWeightKg: 1 },
      { id: '101-2', name: 'Crate 15kg', price: 16500, inventory: 90, salesUnit: SalesUnit.CRATE, packageType: PackageType.CRATE, unitWeightKg: 15, unitLengthCm: 60, unitWidthCm: 40, unitHeightCm: 25 },
    ],
  },
  {
    id: '102',
    sellerId: 'seller-amina',
    title: 'Free Range Eggs',
    description: 'Free range eggs sold by tray and crate quantities.',
    categorySlug: 'poultry',
    basePrice: 4300,
    inventory: 210,
    hasVariants: true,
    salesUnit: SalesUnit.TRAY,
    packageType: PackageType.CRATE,
    unitWeightKg: 2.2,
    unitLengthCm: 30,
    unitWidthCm: 30,
    unitHeightCm: 7,
    images: [
      'https://images.unsplash.com/photo-1506976785307-8732e854ad03?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1587486913049-53fc88980cfc?w=400&h=300&fit=crop',
    ],
    variants: [
      { id: '102-1', name: 'Half crate', price: 4300, inventory: 110, salesUnit: SalesUnit.TRAY, packageType: PackageType.CRATE, unitWeightKg: 1.1, unitLengthCm: 30, unitWidthCm: 30, unitHeightCm: 4 },
      { id: '102-2', name: 'Full crate', price: 8200, inventory: 100, salesUnit: SalesUnit.TRAY, packageType: PackageType.CRATE, unitWeightKg: 2.2, unitLengthCm: 30, unitWidthCm: 30, unitHeightCm: 7 },
    ],
  },
  {
    id: '103',
    sellerId: 'seller-amina',
    title: 'Red Bell Pepper',
    description: 'Red bell pepper harvested and packed for fresh market delivery.',
    categorySlug: 'vegetables',
    basePrice: 1800,
    inventory: 70,
    hasVariants: false,
    salesUnit: SalesUnit.BASKET,
    packageType: PackageType.BASKET,
    unitWeightKg: 10,
    unitLengthCm: 45,
    unitWidthCm: 35,
    unitHeightCm: 24,
    images: [
      'https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=400&h=300&fit=crop',
    ],
    variants: [],
  },
];

async function clearDatabase() {
  await prisma.messageAttachment.deleteMany();
  await prisma.message.deleteMany();
  await prisma.conversationParticipant.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.inventoryMovement.deleteMany();
  await prisma.walletTransaction.deleteMany();
  await prisma.withdrawalRequest.deleteMany();
  await prisma.sellerWallet.deleteMany();
  await prisma.sellerBankAccount.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.sellerOrderGroup.deleteMany();
  await prisma.orderAddressSnapshot.deleteMany();
  await prisma.parentOrder.deleteMany();
  await prisma.wishlistItem.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.discount.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.address.deleteMany();
  await prisma.buyerProfile.deleteMany();
  await prisma.sellerProfile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.category.deleteMany();
  await prisma.platformSettings.deleteMany();
  await prisma.shippingSettings.deleteMany();
  await prisma.commissionSettings.deleteMany();
  await prisma.payoutSettings.deleteMany();
}

async function seedUsers() {
  const adminPasswordHash = await bcrypt.hash(adminUser.password, 12);
  await prisma.user.create({
    data: {
      id: adminUser.id,
      email: adminUser.email,
      passwordHash: adminPasswordHash,
      fullName: adminUser.fullName,
      phone: adminUser.phone,
      role: adminUser.role,
      emailVerifiedAt: new Date(),
      lastActiveAt: new Date(),
    },
  });

  for (const seller of sellerUsers) {
    await prisma.user.create({
      data: {
        id: seller.userId,
        email: seller.email,
        passwordHash: await bcrypt.hash(seller.password, 12),
        fullName: seller.fullName,
        phone: seller.phone,
        role: UserRole.SELLER,
        emailVerifiedAt: new Date(),
        lastActiveAt: new Date(),
        sellerProfile: {
          create: {
            id: seller.sellerId,
            farmName: seller.farmName,
            locationLabel: seller.locationLabel,
            fullAddress: seller.fullAddress,
            city: seller.city,
            state: seller.state,
            latitude: decimal(seller.latitude),
            longitude: decimal(seller.longitude),
            autoPayoutEnabled: false,
          },
        },
      },
    });
  }

  for (const buyer of buyerUsers) {
    await prisma.user.create({
      data: {
        id: buyer.userId,
        email: buyer.email,
        passwordHash: await bcrypt.hash(buyer.password, 12),
        fullName: buyer.fullName,
        phone: buyer.phone,
        role: UserRole.BUYER,
        emailVerifiedAt: new Date(),
        lastActiveAt: new Date(),
        buyerProfile: {
          create: {
            id: buyer.buyerId,
            addresses: {
              create: buyer.addresses.map((address) => ({
                id: address.id,
                displayName: address.displayName,
                addressLine: address.addressLine,
                fullAddress: address.fullAddress,
                city: address.city,
                state: address.state,
                landmark: address.landmark,
                latitude: address.latitude == null ? null : decimal(address.latitude),
                longitude: address.longitude == null ? null : decimal(address.longitude),
                isDefault: address.isDefault,
                isManualAddress: address.isManualAddress,
                isAdminAssisted: address.isAdminAssisted,
                createdByRole: address.createdByRole,
              })),
            },
            cart: { create: {} },
          },
        },
      },
    });
  }
}

async function seedProducts() {
  for (const product of products) {
    await prisma.product.create({
      data: {
        id: product.id,
        sellerId: product.sellerId,
        title: product.title,
        description: product.description,
        status: ProductStatus.ACTIVE,
        categorySlug: product.categorySlug,
        categoryNote: product.categoryNote,
        tags: [],
        basePrice: product.basePrice,
        inventory: product.inventory,
        hasVariants: product.hasVariants,
        images: product.images.map((url, index) => ({
          secureUrl: url,
          publicId: `agritec/products/${product.sellerId}/${product.id}/${index + 1}`,
          altText: product.title,
          displayOrder: index,
        })),
        salesUnit: product.salesUnit,
        packageType: product.packageType,
        unitWeightKg: decimal(product.unitWeightKg),
        unitLengthCm: product.unitLengthCm == null ? null : decimal(product.unitLengthCm),
        unitWidthCm: product.unitWidthCm == null ? null : decimal(product.unitWidthCm),
        unitHeightCm: product.unitHeightCm == null ? null : decimal(product.unitHeightCm),
        variants: {
          create: product.variants.map((variant) => ({
            id: variant.id,
            sku: `${product.sellerId.toUpperCase()}-${product.id}-${variant.id}`,
            name: variant.name,
            price: variant.price,
            inventory: variant.inventory,
            salesUnit: variant.salesUnit ?? null,
            packageType: variant.packageType ?? null,
            unitWeightKg: variant.unitWeightKg == null ? null : decimal(variant.unitWeightKg),
            unitLengthCm: variant.unitLengthCm == null ? null : decimal(variant.unitLengthCm),
            unitWidthCm: variant.unitWidthCm == null ? null : decimal(variant.unitWidthCm),
            unitHeightCm: variant.unitHeightCm == null ? null : decimal(variant.unitHeightCm),
          })),
        },
      },
    });
  }
}

async function main() {
  await clearDatabase();

  await prisma.category.createMany({ data: categories });
  await prisma.platformSettings.create({
    data: {
      id: 'platform',
      marketplaceName: 'AgriTec',
      currencyCode: 'NGN',
      countryCode: 'NG',
      supportEmail: 'support@agritec.com',
    },
  });
  await prisma.shippingSettings.create({
    data: {
      id: 'shipping',
      abujaRatePerShippingUnit: 5000,
      outsideAbujaRatePerShippingUnit: 10000,
      weightUnitSizeKg: decimal(10),
      volumetricDivisor: 5000,
    },
  });
  await prisma.commissionSettings.create({
    data: {
      id: 'commission',
      commissionRateBps: 1000,
    },
  });
  await prisma.payoutSettings.create({
    data: {
      id: 'payout',
      autoPayoutThreshold: 500000,
      weeklyPayoutDay: 5,
    },
  });

  await seedUsers();
  await seedProducts();

  console.log(`Seeded ${categories.length} categories, ${1 + sellerUsers.length + buyerUsers.length} users, and ${products.length} products.`);
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


