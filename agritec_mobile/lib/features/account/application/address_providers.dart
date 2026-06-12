import 'package:agritec_mobile/core/storage/cache_providers.dart';
import 'package:agritec_mobile/features/auth/application/local_auth_provider.dart';
import 'package:agritec_mobile/features/auth/data/auth_service.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class BuyerAddress {
  const BuyerAddress({
    required this.id,
    required this.label,
    required this.displayName,
    required this.fullAddress,
    this.addressLine,
    this.latitude,
    this.longitude,
    this.city,
    this.state,
    this.landmark,
    this.createdByRole = 'buyer',
    this.isManualAddress = false,
    this.isAdminAssisted = false,
    this.isDefault = false,
  });

  final String id;
  final String label;
  final String displayName;
  final String fullAddress;
  final String? addressLine;
  final double? latitude;
  final double? longitude;
  final String? city;
  final String? state;
  final String? landmark;
  final String createdByRole;
  final bool isManualAddress;
  final bool isAdminAssisted;
  final bool isDefault;

  bool get hasMapLocation => latitude != null && longitude != null;

  BuyerAddress copyWith({
    String? id,
    String? label,
    String? displayName,
    String? fullAddress,
    String? addressLine,
    double? latitude,
    double? longitude,
    String? city,
    String? state,
    String? landmark,
    String? createdByRole,
    bool? isManualAddress,
    bool? isAdminAssisted,
    bool? isDefault,
  }) {
    return BuyerAddress(
      id: id ?? this.id,
      label: label ?? this.label,
      displayName: displayName ?? this.displayName,
      fullAddress: fullAddress ?? this.fullAddress,
      addressLine: addressLine ?? this.addressLine,
      latitude: latitude ?? this.latitude,
      longitude: longitude ?? this.longitude,
      city: city ?? this.city,
      state: state ?? this.state,
      landmark: landmark ?? this.landmark,
      createdByRole: createdByRole ?? this.createdByRole,
      isManualAddress: isManualAddress ?? this.isManualAddress,
      isAdminAssisted: isAdminAssisted ?? this.isAdminAssisted,
      isDefault: isDefault ?? this.isDefault,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'label': label,
    'displayName': displayName,
    'fullAddress': fullAddress,
    'addressLine': addressLine,
    'latitude': latitude,
    'longitude': longitude,
    'city': city,
    'state': state,
    'landmark': landmark,
    'createdByRole': createdByRole,
    'isManualAddress': isManualAddress,
    'isAdminAssisted': isAdminAssisted,
    'isDefault': isDefault,
  };

  factory BuyerAddress.fromJson(Map<String, dynamic> json) {
    final displayName = (json['displayName'] as String?)?.trim();
    final addressLine = (json['addressLine'] as String?)?.trim();
    final fullAddress = '${json['fullAddress'] ?? ''}'.trim();
    return BuyerAddress(
      id: '${json['id']}',
      label: displayName?.isNotEmpty == true
          ? displayName!
          : addressLine?.isNotEmpty == true
              ? addressLine!
              : fullAddress,
      displayName: displayName?.isNotEmpty == true
          ? displayName!
          : addressLine?.isNotEmpty == true
              ? addressLine!
              : fullAddress,
      fullAddress: fullAddress,
      addressLine: addressLine,
      latitude: (json['latitude'] as num?)?.toDouble(),
      longitude: (json['longitude'] as num?)?.toDouble(),
      city: json['city'] as String?,
      state: json['state'] as String?,
      landmark: json['landmark'] as String?,
      createdByRole: '${json['createdByRole'] ?? 'buyer'}'.toLowerCase(),
      isManualAddress: json['isManualAddress'] as bool? ?? false,
      isAdminAssisted: json['isAdminAssisted'] as bool? ?? false,
      isDefault: json['isDefault'] as bool? ?? false,
    );
  }
}

class AddressBookNotifier extends Notifier<List<BuyerAddress>> {
  static const _cacheKeyPrefix = 'cache_addresses_v1';

  @override
  List<BuyerAddress> build() {
    ref.watch(currentBuyerUserIdProvider);
    ref.watch(buyerAuthTokenProvider);
    _prime();
    return const [];
  }

  String _cacheKey() {
    final userId = ref.read(currentBuyerUserIdProvider) ?? 'guest';
    return '$_cacheKeyPrefix-$userId';
  }

  Future<void> _prime() async {
    await _hydrate();
    await refresh();
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

  Future<void> refresh() async {
    final token = ref.read(buyerAuthTokenProvider);
    if (token == null || token.isEmpty) {
      return;
    }

    try {
      final response = await ref.read(mobileApiClientProvider).get(
        '/api/buyer/addresses',
        token: token,
      );
      final items = response['addresses'];
      if (items is! List<dynamic>) return;
      state = [
        for (final item in items)
          if (item is Map<String, dynamic>) BuyerAddress.fromJson(item),
      ];
      await _persist();
    } catch (_) {}
  }

  Future<void> setDefault(String addressId) async {
    final previous = state;
    state = [
      for (final address in state)
        address.copyWith(isDefault: address.id == addressId),
    ];
    await _persist();

    final token = ref.read(buyerAuthTokenProvider);
    if (token == null || token.isEmpty) return;
    try {
      final response = await ref.read(mobileApiClientProvider).patch(
        '/api/buyer/addresses/$addressId',
        token: token,
        data: {'isDefault': true},
      );
      final json = response['address'];
      if (json is Map<String, dynamic>) {
        final updated = BuyerAddress.fromJson(json);
        state = [
          for (final address in state)
            address.id == updated.id
                ? updated
                : address.copyWith(isDefault: false),
        ];
        await _persist();
      }
    } catch (_) {
      state = previous;
      await _persist();
    }
  }

  Future<void> addAddress(BuyerAddress address) async {
    final token = ref.read(buyerAuthTokenProvider);
    if (token == null || token.isEmpty) {
      final hasDefault = state.any((item) => item.isDefault);
      state = [hasDefault ? address : address.copyWith(isDefault: true), ...state];
      await _persist();
      return;
    }

    try {
      final response = await ref.read(mobileApiClientProvider).post(
        '/api/buyer/addresses',
        token: token,
        data: {
          'displayName': address.label,
          'addressLine': address.addressLine ?? address.fullAddress.split(',').first.trim(),
          'fullAddress': address.fullAddress,
          'city': address.city,
          'state': address.state,
          'landmark': address.landmark,
          'latitude': address.latitude,
          'longitude': address.longitude,
          'isDefault': address.isDefault,
          'isManualAddress': address.isManualAddress,
          'isAdminAssisted': address.isAdminAssisted,
        },
      );
      final json = response['address'];
      if (json is Map<String, dynamic>) {
        final created = BuyerAddress.fromJson(json);
        final next = [
          if (created.isDefault)
            ...state.map((item) => item.copyWith(isDefault: false)),
          created,
          if (!created.isDefault) ...state,
        ];
        state = next;
        await _persist();
      }
    } catch (_) {}
  }

  Future<void> updateAddress(BuyerAddress updated) async {
    final previous = state;
    state = [
      for (final address in state)
        if (address.id == updated.id) updated else address,
    ];
    if (updated.isDefault) {
      state = [
        for (final address in state)
          address.id == updated.id
              ? address.copyWith(isDefault: true)
              : address.copyWith(isDefault: false),
      ];
    }
    await _persist();

    final token = ref.read(buyerAuthTokenProvider);
    if (token == null || token.isEmpty) return;
    try {
      final response = await ref.read(mobileApiClientProvider).patch(
        '/api/buyer/addresses/${updated.id}',
        token: token,
        data: {
          'displayName': updated.label,
          'addressLine': updated.addressLine ?? updated.fullAddress.split(',').first.trim(),
          'fullAddress': updated.fullAddress,
          'city': updated.city,
          'state': updated.state,
          'landmark': updated.landmark,
          'latitude': updated.latitude,
          'longitude': updated.longitude,
          'isDefault': updated.isDefault,
        },
      );
      final json = response['address'];
      if (json is Map<String, dynamic>) {
        final serverUpdated = BuyerAddress.fromJson(json);
        state = [
          for (final address in state)
            address.id == serverUpdated.id
                ? serverUpdated
                : serverUpdated.isDefault
                    ? address.copyWith(isDefault: false)
                    : address,
        ];
        await _persist();
      }
    } catch (_) {
      state = previous;
      await _persist();
    }
  }

  Future<void> deleteAddress(String addressId) async {
    final previous = state;
    final removedDefault = state.any((a) => a.id == addressId && a.isDefault);
    final next = state.where((a) => a.id != addressId).toList();
    if (next.isEmpty) {
      state = next;
    } else if (removedDefault) {
      state = [
        next.first.copyWith(isDefault: true),
        ...next.skip(1).map((a) => a.copyWith(isDefault: false)),
      ];
    } else {
      state = next;
    }
    await _persist();

    final token = ref.read(buyerAuthTokenProvider);
    if (token == null || token.isEmpty) return;
    try {
      await ref.read(mobileApiClientProvider).delete(
        '/api/buyer/addresses/$addressId',
        token: token,
      );
    } catch (_) {
      state = previous;
      await _persist();
    }
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
