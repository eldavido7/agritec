class PlatformCategory {
  const PlatformCategory({
    required this.slug,
    required this.label,
  });

  final String slug;
  final String label;
}

const platformCategories = <PlatformCategory>[
  PlatformCategory(slug: 'vegetables', label: 'Vegetables'),
  PlatformCategory(slug: 'fruits', label: 'Fruits'),
  PlatformCategory(slug: 'grains-cereals', label: 'Grains & Cereals'),
  PlatformCategory(slug: 'tubers-roots', label: 'Tubers & Roots'),
  PlatformCategory(slug: 'legumes', label: 'Legumes'),
  PlatformCategory(slug: 'spices-herbs', label: 'Spices & Herbs'),
  PlatformCategory(slug: 'livestock', label: 'Livestock'),
  PlatformCategory(slug: 'poultry', label: 'Poultry'),
  PlatformCategory(slug: 'fish-seafood', label: 'Fish & Seafood'),
  PlatformCategory(slug: 'dairy', label: 'Dairy'),
  PlatformCategory(slug: 'seeds-seedlings', label: 'Seeds & Seedlings'),
  PlatformCategory(slug: 'farm-inputs', label: 'Farm Inputs'),
  PlatformCategory(slug: 'processed-farm-products', label: 'Processed Farm Products'),
  PlatformCategory(slug: 'other', label: 'Other'),
];

