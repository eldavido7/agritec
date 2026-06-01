import 'package:agritec_mobile/core/storage/cache_providers.dart';
import 'package:agritec_mobile/features/auth/application/local_auth_provider.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class BuyerAddress {
  const BuyerAddress({
    required this.id,
    required this.label,
    required this.displayName,
    required this.fullAddress,
    this.latitude,
    this.longitude,
    this.city,
    this.state,
    this.landmark,
    this.isManualAddress = false,
    this.isDefault = false,
  });

  final String id;
  final String label;
  final String displayName;
  final String fullAddress;
  final double? latitude;
  final double? longitude;
  final String? city;
  final String? state;
  final String? landmark;
  final bool isManualAddress;
  final bool isDefault;

  bool get hasMapLocation => latitude != null && longitude != null;

  BuyerAddress copyWith({
    String? id,
    String? label,
    String? displayName,
    String? fullAddress,
    double? latitude,
    double? longitude,
    String? city,
    String? state,
    String? landmark,
    bool? isManualAddress,
    bool? isDefault,
  }) {
    return BuyerAddress(
      id: id ?? this.id,
      label: label ?? this.label,
      displayName: displayName ?? this.displayName,
      fullAddress: fullAddress ?? this.fullAddress,
      latitude: latitude ?? this.latitude,
      longitude: longitude ?? this.longitude,
      city: city ?? this.city,
      state: state ?? this.state,
      landmark: landmark ?? this.landmark,
      isManualAddress: isManualAddress ?? this.isManualAddress,
      isDefault: isDefault ?? this.isDefault,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'label': label,
    'displayName': displayName,
    'fullAddress': fullAddress,
    'latitude': latitude,
    'longitude': longitude,
    'city': city,
    'state': state,
    'landmark': landmark,
    'isManualAddress': isManualAddress,
    'isDefault': isDefault,
  };

  factory BuyerAddress.fromJson(Map<String, dynamic> json) {
    return BuyerAddress(
      id: json['id'] as String,
      label: json['label'] as String,
      displayName:
          (json['displayName'] as String?) ?? (json['fullAddress'] as String),
      fullAddress: json['fullAddress'] as String,
      latitude: (json['latitude'] as num?)?.toDouble(),
      longitude: (json['longitude'] as num?)?.toDouble(),
      city: json['city'] as String?,
      state: json['state'] as String?,
      landmark: json['landmark'] as String?,
      isManualAddress: json['isManualAddress'] as bool? ?? false,
      isDefault: json['isDefault'] as bool? ?? false,
    );
  }
}

class AddressBookNotifier extends Notifier<List<BuyerAddress>> {
  static const _cacheKeyPrefix = 'cache_addresses_v1';

  @override
  List<BuyerAddress> build() {
    ref.watch(currentBuyerUserIdProvider);
    _hydrate();
    final userId = ref.read(currentBuyerUserIdProvider);
    if (userId == 'buyer-demo-1') {
      return const [
        BuyerAddress(
          id: 'addr-demo-1',
          label: 'Home',
          displayName: 'Ikate Elegushi, Lekki',
          fullAddress: '22 Freedom Way, Lekki Phase 1, Lagos',
          latitude: 6.4429,
          longitude: 3.4851,
          city: 'Lagos',
          state: 'Lagos',
          landmark: 'Near The Lennox Mall',
          isDefault: true,
        ),
        BuyerAddress(
          id: 'addr-demo-2',
          label: 'Old Office',
          displayName: 'Ikeja Computer Village',
          fullAddress: '2 Otigba Street, Ikeja, Lagos',
          city: 'Lagos',
          state: 'Lagos',
          landmark: 'Near Slot Store',
          isManualAddress: true,
          isDefault: false,
        ),
      ];
    }
    return const [
      BuyerAddress(
        id: 'addr-1',
        label: 'Home',
        displayName: 'Circle Mall Area, Lekki',
        fullAddress: '4 Admiralty Way, Lekki Phase 1, Lagos',
        latitude: 6.4365,
        longitude: 3.4698,
        city: 'Lagos',
        state: 'Lagos',
        landmark: 'Near Circle Mall',
        isDefault: true,
      ),
    ];
  }

  String _cacheKey() {
    final userId = ref.read(currentBuyerUserIdProvider) ?? 'guest';
    return '$_cacheKeyPrefix-$userId';
  }

  Future<void> _hydrate() async {
    final cache = await ref.read(localCacheServiceProvider.future);
    final raw = cache.readJson(_cacheKey());
    if (raw == null) return;
    final items = raw['addresses'];
    if (items is! List<dynamic>) return;
    final parsed = <BuyerAddress>[];
    for (final item in items) {
      if (item is! Map<String, dynamic>) continue;
      parsed.add(BuyerAddress.fromJson(item));
    }
    if (parsed.isNotEmpty) {
      state = parsed;
    }
  }

  Future<void> _persist() async {
    final cache = await ref.read(localCacheServiceProvider.future);
    await cache.saveJson(_cacheKey(), {
      'addresses': state.map((address) => address.toJson()).toList(),
    });
  }

  void setDefault(String addressId) {
    state = [
      for (final address in state)
        address.copyWith(isDefault: address.id == addressId),
    ];
    _persist();
  }

  void addAddress(BuyerAddress address) {
    final hasDefault = state.any((item) => item.isDefault);
    final normalized = hasDefault ? address : address.copyWith(isDefault: true);
    state = [normalized, ...state];
    _persist();
  }

  void updateAddress(BuyerAddress updated) {
    state = [
      for (final address in state)
        if (address.id == updated.id) updated else address,
    ];
    _persist();
  }

  void deleteAddress(String addressId) {
    final removedDefault = state.any((a) => a.id == addressId && a.isDefault);
    final next = state.where((a) => a.id != addressId).toList();
    if (next.isEmpty) {
      state = next;
      _persist();
      return;
    }
    if (removedDefault) {
      state = [
        next.first.copyWith(isDefault: true),
        ...next.skip(1).map((a) => a.copyWith(isDefault: false)),
      ];
      _persist();
      return;
    }
    state = next;
    _persist();
  }
}

final addressBookProvider =
    NotifierProvider<AddressBookNotifier, List<BuyerAddress>>(
      AddressBookNotifier.new,
    );

final defaultAddressProvider = Provider<BuyerAddress?>((ref) {
  final addresses = ref.watch(addressBookProvider);
  for (final address in addresses) {
    if (address.isDefault) return address;
  }
  return null;
});
