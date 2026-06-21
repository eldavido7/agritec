import 'package:agritec_mobile/core/storage/cache_providers.dart';
import 'package:agritec_mobile/features/auth/data/auth_service.dart';
import 'package:agritec_mobile/features/home/data/home_repository.dart';
import 'package:agritec_mobile/features/home/domain/home_models.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class HomeDataState {
  const HomeDataState({
    required this.categories,
    required this.sellers,
    required this.products,
  });

  final List<HomeCategory> categories;
  final List<HomeSeller> sellers;
  final List<HomeProduct> products;

  HomeDataState copyWith({
    List<HomeCategory>? categories,
    List<HomeSeller>? sellers,
    List<HomeProduct>? products,
  }) {
    return HomeDataState(
      categories: categories ?? this.categories,
      sellers: sellers ?? this.sellers,
      products: products ?? this.products,
    );
  }
}

final homeRepositoryProvider = FutureProvider<HomeRepository>((ref) async {
  final cache = await ref.watch(localCacheServiceProvider.future);
  final api = ref.read(mobileApiClientProvider);
  return HomeRepository(cache, api);
});

class HomeDataNotifier extends Notifier<HomeDataState> {
  @override
  HomeDataState build() {
    _hydrate();
    return const HomeDataState(
      categories: <HomeCategory>[],
      sellers: <HomeSeller>[],
      products: <HomeProduct>[],
    );
  }

  Future<void> _hydrate() async {
    final repository = await ref.read(homeRepositoryProvider.future);
    final cached = await repository.getSnapshot();
    state = state.copyWith(
      categories: cached.categories,
      sellers: cached.sellers,
      products: cached.products,
    );
    final refreshed = await repository.refreshSnapshot();
    state = state.copyWith(
      categories: refreshed.categories,
      sellers: refreshed.sellers,
      products: refreshed.products,
    );
  }
}

final homeDataProvider = NotifierProvider<HomeDataNotifier, HomeDataState>(
  HomeDataNotifier.new,
);

final homeCategoriesProvider = Provider<List<HomeCategory>>((ref) {
  return ref.watch(homeDataProvider).categories;
});

final homeFeaturedProductsProvider = Provider<List<HomeProduct>>((ref) {
  return ref.watch(homeDataProvider).products;
});

final homeSellersProvider = Provider<List<HomeSeller>>((ref) {
  return ref.watch(homeDataProvider).sellers;
});

final homeSellerByIdProvider = Provider.family<HomeSeller, String>((ref, id) {
  final sellers = ref.watch(homeSellersProvider);
  return sellers.firstWhere(
    (seller) => seller.id == id,
    orElse: () => const HomeSeller(
      id: 'unknown',
      name: 'Unknown Seller',
      farmName: 'Unknown Farm',
      location: 'Unknown',
      state: null,
      latitude: null,
      longitude: null,
      rating: 0,
      isVerified: false,
    ),
  );
});
