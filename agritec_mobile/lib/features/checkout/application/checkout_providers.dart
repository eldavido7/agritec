import 'package:agritec_mobile/core/api/mobile_api.dart';
import 'package:agritec_mobile/core/logistics/logistics_models.dart';
import 'package:agritec_mobile/core/storage/cache_providers.dart';
import 'package:agritec_mobile/features/account/application/address_providers.dart';
import 'package:agritec_mobile/features/auth/application/local_auth_provider.dart';
import 'package:agritec_mobile/features/auth/data/auth_service.dart';
import 'package:agritec_mobile/features/cart/application/cart_providers.dart';
import 'package:agritec_mobile/features/home/application/home_providers.dart';
import 'package:agritec_mobile/features/orders/application/order_providers.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class CheckoutSellerGroupQuote {
  const CheckoutSellerGroupQuote({
    required this.sellerId,
    required this.sellerName,
    required this.farmName,
    required this.items,
    required this.shippingQuote,
    required this.productSubtotal,
    required this.shippingFee,
    required this.discountTotal,
    required this.groupTotal,
    required this.eligibleLogisticsCompanies,
    this.logisticsCompanyId,
    this.logisticsCompanyName,
    this.discountCode,
    required this.discountApplied,
    required this.logisticsSelectionPending,
  });

  final String sellerId;
  final String sellerName;
  final String farmName;
  final List<CartLineItem> items;
  final ShippingQuote shippingQuote;
  final int productSubtotal;
  final int shippingFee;
  final int discountTotal;
  final int groupTotal;
  final List<CheckoutEligibleLogisticsCompany> eligibleLogisticsCompanies;
  final String? logisticsCompanyId;
  final String? logisticsCompanyName;
  final String? discountCode;
  final bool discountApplied;
  final bool logisticsSelectionPending;
}

class CheckoutEligibleLogisticsCompany {
  const CheckoutEligibleLogisticsCompany({
    required this.id,
    required this.companyName,
    required this.coverageType,
    required this.coveredStates,
    required this.pricingScope,
    required this.pricingState,
  });

  final String id;
  final String companyName;
  final String coverageType;
  final List<String> coveredStates;
  final String pricingScope;
  final String? pricingState;

  bool get isNationwide => coverageType.toUpperCase() == 'NATIONWIDE';
}

class CheckoutQuoteData {
  const CheckoutQuoteData({
    required this.address,
    required this.productSubtotal,
    required this.totalShippingFee,
    required this.discountTotal,
    required this.grandTotal,
    required this.sellerGroups,
    this.allGroupsLogisticsCompanyId,
  });

  final BuyerAddress address;
  final int productSubtotal;
  final int totalShippingFee;
  final int discountTotal;
  final int grandTotal;
  final List<CheckoutSellerGroupQuote> sellerGroups;
  final String? allGroupsLogisticsCompanyId;
}

class CheckoutPaymentSession {
  const CheckoutPaymentSession({
    required this.orderId,
    required this.reference,
    required this.authorizationUrl,
    required this.createdAt,
  });

  final String orderId;
  final String reference;
  final String authorizationUrl;
  final DateTime createdAt;

  Map<String, dynamic> toJson() => {
        'orderId': orderId,
        'reference': reference,
        'authorizationUrl': authorizationUrl,
        'createdAt': createdAt.toIso8601String(),
      };

  factory CheckoutPaymentSession.fromJson(Map<String, dynamic> json) {
    return CheckoutPaymentSession(
      orderId: json['orderId'] as String? ?? '',
      reference: json['reference'] as String? ?? '',
      authorizationUrl: json['authorizationUrl'] as String? ?? '',
      createdAt: DateTime.tryParse(json['createdAt'] as String? ?? '') ?? DateTime.now(),
    );
  }
}

class CheckoutVerificationResult {
  const CheckoutVerificationResult({
    required this.verified,
    required this.finalStatus,
    required this.message,
    this.order,
  });

  final bool verified;
  final bool finalStatus;
  final String message;
  final MarketplaceOrder? order;
}

class CheckoutPaymentStatusResult {
  const CheckoutPaymentStatusResult({
    required this.reference,
    required this.orderId,
    required this.status,
    required this.verified,
    required this.finalStatus,
    required this.message,
    this.order,
  });

  final String reference;
  final String orderId;
  final String status;
  final bool verified;
  final bool finalStatus;
  final String message;
  final MarketplaceOrder? order;

  bool get isPaid => status.toUpperCase() == 'PAID';
  bool get isPending => status.toUpperCase() == 'PENDING';
  bool get isPendingTimeout => status.toUpperCase() == 'PENDING_TIMEOUT';
  bool get isFailed =>
      status.toUpperCase() == 'FAILED' || status.toUpperCase() == 'CANCELLED';
}

class CheckoutState {
  const CheckoutState({
    this.quote,
    this.paymentSession,
    this.isLoadingQuote = false,
    this.isInitializing = false,
    this.isVerifying = false,
    this.error,
  });

  final CheckoutQuoteData? quote;
  final CheckoutPaymentSession? paymentSession;
  final bool isLoadingQuote;
  final bool isInitializing;
  final bool isVerifying;
  final String? error;

  CheckoutState copyWith({
    CheckoutQuoteData? quote,
    CheckoutPaymentSession? paymentSession,
    bool? isLoadingQuote,
    bool? isInitializing,
    bool? isVerifying,
    String? error,
    bool clearQuote = false,
    bool clearPaymentSession = false,
    bool clearError = false,
  }) {
    return CheckoutState(
      quote: clearQuote ? null : (quote ?? this.quote),
      paymentSession:
          clearPaymentSession ? null : (paymentSession ?? this.paymentSession),
      isLoadingQuote: isLoadingQuote ?? this.isLoadingQuote,
      isInitializing: isInitializing ?? this.isInitializing,
      isVerifying: isVerifying ?? this.isVerifying,
      error: clearError ? null : (error ?? this.error),
    );
  }
}

class CheckoutNotifier extends Notifier<CheckoutState> {
  static const _pendingPaymentCacheKey = 'cache_pending_payment_v1';
  bool _didPrimePendingPayment = false;

  @override
  CheckoutState build() {
    if (!_didPrimePendingPayment) {
      _didPrimePendingPayment = true;
      _primePendingPayment();
    }
    return const CheckoutState();
  }

  Future<void> _primePendingPayment() async {
    final cache = await ref.read(localCacheServiceProvider.future);
    final raw = cache.readJson(_pendingPaymentCacheKey);
    if (raw == null) return;

    state = state.copyWith(
      paymentSession: CheckoutPaymentSession.fromJson(raw),
    );
  }

  Future<void> _persistPendingPayment(CheckoutPaymentSession session) async {
    final cache = await ref.read(localCacheServiceProvider.future);
    await cache.saveJson(_pendingPaymentCacheKey, session.toJson());
  }

  Future<void> _clearPersistedPendingPayment() async {
    final prefs = await ref.read(sharedPreferencesProvider.future);
    await prefs.remove(_pendingPaymentCacheKey);
  }

  Future<CheckoutPaymentSession?> getPendingPaymentSession() async {
    final current = state.paymentSession;
    if (current != null) return current;

    final cache = await ref.read(localCacheServiceProvider.future);
    final raw = cache.readJson(_pendingPaymentCacheKey);
    if (raw == null) return null;

    final session = CheckoutPaymentSession.fromJson(raw);
    state = state.copyWith(paymentSession: session);
    return session;
  }

  Future<CheckoutQuoteData> refreshQuote({
    required String addressId,
    String? discountCode,
    Map<String, String> logisticsSelections = const <String, String>{},
    String? allGroupsLogisticsCompanyId,
  }) async {
    final token = ref.read(buyerAuthTokenProvider);
    if (token == null || token.trim().isEmpty) {
      throw const MobileApiException(message: 'Sign in to continue');
    }

    state = state.copyWith(isLoadingQuote: true, clearError: true);
    try {
      final api = ref.read(mobileApiClientProvider);
      final payload = await api.post(
        '/api/checkout/quote',
        token: token,
        data: {
          'addressId': addressId,
          'discountCodes': _discountMap(discountCode),
          'logisticsSelections': logisticsSelections,
          'allGroupsLogisticsCompanyId': allGroupsLogisticsCompanyId,
        },
      );
      final quoteJson = payload['quote'] as Map<String, dynamic>;
      final quote = _parseQuote(quoteJson);
      state = state.copyWith(
        quote: quote,
        isLoadingQuote: false,
        clearError: true,
      );
      return quote;
    } on MobileApiException catch (error) {
      state = state.copyWith(isLoadingQuote: false, error: error.message);
      rethrow;
    }
  }

  Future<CheckoutPaymentSession> initializePayment({
    required String addressId,
    String? discountCode,
    Map<String, String> logisticsSelections = const <String, String>{},
    String? allGroupsLogisticsCompanyId,
  }) async {
    final token = ref.read(buyerAuthTokenProvider);
    if (token == null || token.trim().isEmpty) {
      throw const MobileApiException(message: 'Sign in to continue');
    }

    state = state.copyWith(isInitializing: true, clearError: true);
    try {
      final api = ref.read(mobileApiClientProvider);
      final payload = await api.post(
        '/api/checkout/initialize',
        token: token,
        data: {
          'addressId': addressId,
          'discountCodes': _discountMap(discountCode),
          'logisticsSelections': logisticsSelections,
          'allGroupsLogisticsCompanyId': allGroupsLogisticsCompanyId,
        },
      );

      final orderJson = payload['order'] as Map<String, dynamic>?;
      if (orderJson != null) {
        ref.read(ordersProvider.notifier).upsertFromApiJson(orderJson);
      }

      final paymentJson = payload['payment'] as Map<String, dynamic>;
      final session = CheckoutPaymentSession(
        orderId: (payload['orderId'] as String?) ??
            (orderJson?['id'] as String?) ??
            '',
        reference: (payload['reference'] as String?) ??
            (paymentJson['reference'] as String? ?? ''),
        authorizationUrl: (payload['authorizationUrl'] as String?) ??
            (paymentJson['authorizationUrl'] as String? ?? ''),
        createdAt: DateTime.now(),
      );
      await _persistPendingPayment(session);
      state = state.copyWith(
        paymentSession: session,
        isInitializing: false,
        clearError: true,
      );
      return session;
    } on MobileApiException catch (error) {
      state = state.copyWith(isInitializing: false, error: error.message);
      rethrow;
    }
  }

  Future<CheckoutVerificationResult> verifyPayment({required String reference}) async {
    final token = ref.read(buyerAuthTokenProvider);
    if (token == null || token.trim().isEmpty) {
      throw const MobileApiException(message: 'Sign in to continue');
    }

    state = state.copyWith(isVerifying: true, clearError: true);
    try {
      final api = ref.read(mobileApiClientProvider);
      final payload = await api.post(
        '/api/paystack/verify',
        token: token,
        data: {'reference': reference},
      );
      final orderJson = payload['order'] as Map<String, dynamic>?;
      MarketplaceOrder? order;
      if (orderJson != null) {
        ref.read(ordersProvider.notifier).upsertFromApiJson(orderJson);
        order = orderFromApiJson(
          orderJson,
          fallbackProducts: ref.read(homeFeaturedProductsProvider),
          fallbackSellers: ref.read(homeSellersProvider),
        );
      }
      final result = CheckoutVerificationResult(
        verified: payload['verified'] as bool? ?? false,
        finalStatus: payload['final'] as bool? ??
            (payload['verified'] as bool? ?? false),
        message: (payload['message'] as String?) ??
            ((payload['verified'] as bool? ?? false)
                ? 'Payment verified successfully'
                : 'Payment is still pending'),
        order: order,
      );
      if (result.verified) {
        await _clearPersistedPendingPayment();
      }
      state = state.copyWith(
        isVerifying: false,
        clearError: true,
        clearPaymentSession: result.verified,
      );
      return result;
    } on MobileApiException catch (error) {
      state = state.copyWith(isVerifying: false, error: error.message);
      rethrow;
    }
  }

  Future<CheckoutPaymentStatusResult> checkPaymentStatus({
    String? reference,
    String? orderId,
  }) async {
    final token = ref.read(buyerAuthTokenProvider);
    if (token == null || token.trim().isEmpty) {
      throw const MobileApiException(message: 'Sign in to continue');
    }

    final pendingSession = await getPendingPaymentSession();
    final paymentReference = reference ?? pendingSession?.reference;
    final paymentOrderId = orderId ?? pendingSession?.orderId ?? '';
    if (paymentReference == null || paymentReference.trim().isEmpty) {
      throw const MobileApiException(message: 'No pending payment found');
    }

    state = state.copyWith(isVerifying: true, clearError: true);
    try {
      final api = ref.read(mobileApiClientProvider);
      final payload = await api.get(
        '/api/payments/$paymentReference/status',
        token: token,
      );

      final orderJson = payload['order'] as Map<String, dynamic>?;
      MarketplaceOrder? order;
      if (orderJson != null) {
        ref.read(ordersProvider.notifier).upsertFromApiJson(orderJson);
        order = orderFromApiJson(
          orderJson,
          fallbackProducts: ref.read(homeFeaturedProductsProvider),
          fallbackSellers: ref.read(homeSellersProvider),
        );
      }

      final status = (payload['status'] as String?) ?? 'PENDING';
      final result = CheckoutPaymentStatusResult(
        reference: (payload['reference'] as String?) ?? paymentReference,
        orderId: (payload['orderId'] as String?) ?? paymentOrderId,
        status: status,
        verified: payload['verified'] as bool? ?? status.toUpperCase() == 'PAID',
        finalStatus: payload['final'] as bool? ?? false,
        message:
            (payload['message'] as String?) ?? 'Checking payment status...',
        order: order,
      );

      if (result.isPaid) {
        await ref.read(cartProvider.notifier).clear();
        await _clearPersistedPendingPayment();
        state = state.copyWith(
          isVerifying: false,
          clearError: true,
          clearPaymentSession: true,
        );
      } else {
        state = state.copyWith(isVerifying: false, clearError: true);
      }

      return result;
    } on MobileApiException catch (error) {
      state = state.copyWith(isVerifying: false, error: error.message);
      rethrow;
    }
  }

  void clearQuote() {
    state = state.copyWith(clearQuote: true, clearError: true);
  }

  Future<void> clearPaymentSession() async {
    await _clearPersistedPendingPayment();
    state = state.copyWith(clearPaymentSession: true, clearError: true);
  }

  Map<String, String> _discountMap(String? discountCode) {
    final code = discountCode?.trim();
    if (code == null || code.isEmpty) return const <String, String>{};
    final groups = ref.read(cartGroupsProvider);
    return {
      for (final group in groups) group.sellerId: code,
    };
  }

  CheckoutQuoteData _parseQuote(Map<String, dynamic> quoteJson) {
    final addressJson = quoteJson['address'] as Map<String, dynamic>;
    final fallbackProducts = ref.read(homeFeaturedProductsProvider);
    final rawGroups = (quoteJson['sellerGroups'] as List<dynamic>? ?? const <dynamic>[])
        .whereType<Map<String, dynamic>>()
        .toList();

    return CheckoutQuoteData(
      address: BuyerAddress(
        id: addressJson['id'] as String,
        label: 'Delivery',
        displayName: (addressJson['displayName'] as String?) ??
            (addressJson['addressLine'] as String?) ??
            '',
        fullAddress: (addressJson['fullAddress'] as String?) ?? '',
        addressLine: (addressJson['addressLine'] as String?) ?? '',
        latitude: (addressJson['latitude'] as num?)?.toDouble(),
        longitude: (addressJson['longitude'] as num?)?.toDouble(),
        city: (addressJson['city'] as String?) ?? '',
        state: (addressJson['state'] as String?) ?? '',
        landmark: addressJson['landmark'] as String?,
        isDefault: false,
        isManualAddress: addressJson['isManualAddress'] as bool? ?? false,
        isAdminAssisted: addressJson['isAdminAssisted'] as bool? ?? false,
        createdByRole:
            (addressJson['createdByRole'] as String?)?.toLowerCase() == 'admin'
                ? 'admin'
                : 'buyer',
      ),
      productSubtotal: (quoteJson['productSubtotal'] as num?)?.toInt() ?? 0,
      totalShippingFee: (quoteJson['totalShippingFee'] as num?)?.toInt() ?? 0,
      discountTotal: (quoteJson['discountTotal'] as num?)?.toInt() ?? 0,
      grandTotal: (quoteJson['grandTotal'] as num?)?.toInt() ?? 0,
      allGroupsLogisticsCompanyId:
          quoteJson['allGroupsLogisticsCompanyId'] as String?,
      sellerGroups: rawGroups.map((groupJson) {
        final rawItems = (groupJson['items'] as List<dynamic>? ?? const <dynamic>[])
            .whereType<Map<String, dynamic>>()
            .toList();
        return CheckoutSellerGroupQuote(
          sellerId: groupJson['sellerId'] as String,
          sellerName: (groupJson['sellerName'] as String?) ?? 'Seller',
          farmName: (groupJson['farmName'] as String?) ?? 'Farm',
          items: rawItems.map((itemJson) {
            return buildCartLineItemFromApi(
              apiProduct: itemJson['product'] as Map<String, dynamic>,
              apiVariant: itemJson['variant'] as Map<String, dynamic>?,
              quantity: (itemJson['quantity'] as num?)?.toInt() ?? 0,
              lineKey: itemJson['lineKey'] as String?,
              fallbackProducts: fallbackProducts,
            );
          }).toList(),
          shippingQuote: ShippingQuote(
            deliveryRegion: (groupJson['deliveryRegion'] as String?) ??
                'Unknown region',
            totalActualWeightKg: rawItems.fold<double>(
              0,
              (sum, item) =>
                  sum + ((item['actualWeightKg'] as num?)?.toDouble() ?? 0),
            ),
            totalVolumetricWeightKg: null,
            usedVolumetricWeight: rawItems.any(
              (item) => (item['volumetricWeightKg'] as num?) != null,
            ),
            totalChargeableWeightKg:
                (groupJson['totalChargeableWeightKg'] as num?)?.toDouble() ?? 0,
            weightUnitSizeKg:
                (groupJson['weightUnitSizeKg'] as num?)?.toDouble() ?? 10,
            shippingUnits: (groupJson['shippingUnits'] as num?)?.toInt() ?? 1,
            minimumFee: (groupJson['minimumFee'] as num?)?.toInt() ?? 0,
            additionalUnitFee:
                (groupJson['additionalUnitFee'] as num?)?.toInt() ?? 0,
            shippingFee: (groupJson['shippingFee'] as num?)?.toInt() ?? 0,
          ),
          productSubtotal: (groupJson['productSubtotal'] as num?)?.toInt() ?? 0,
          shippingFee: (groupJson['shippingFee'] as num?)?.toInt() ?? 0,
          discountTotal: (groupJson['discountTotal'] as num?)?.toInt() ?? 0,
          groupTotal: (groupJson['groupTotal'] as num?)?.toInt() ?? 0,
          eligibleLogisticsCompanies:
              (groupJson['eligibleLogisticsCompanies'] as List<dynamic>? ??
                      const <dynamic>[])
                  .whereType<Map<String, dynamic>>()
                  .map(
                    (companyJson) => CheckoutEligibleLogisticsCompany(
                      id: companyJson['id'] as String? ?? '',
                      companyName: companyJson['companyName'] as String? ?? 'Logistics',
                      coverageType:
                          companyJson['coverageType'] as String? ??
                              (companyJson['coverageSummary']
                                      as Map<String, dynamic>? ??
                                  const {})['coverageType'] as String? ??
                              'REGIONAL',
                      coveredStates: (companyJson['coveredStates'] as List<dynamic>? ??
                              (companyJson['coverageSummary']
                                      as Map<String, dynamic>? ??
                                  const {})['coveredStates'] as List<dynamic>? ??
                              const <dynamic>[])
                          .map((item) => '$item')
                          .toList(),
                      pricingScope:
                          (companyJson['pricing'] as Map<String, dynamic>? ?? const {})
                                  ['pricingScope'] as String? ??
                              '',
                      pricingState:
                          (companyJson['pricing'] as Map<String, dynamic>? ?? const {})
                              ['state'] as String?,
                    ),
                  )
                  .toList(),
          logisticsCompanyId: groupJson['logisticsCompanyId'] as String?,
          logisticsCompanyName: groupJson['logisticsCompanyName'] as String?,
          discountCode: groupJson['discountCode'] as String?,
          discountApplied: groupJson['discountApplied'] as bool? ?? false,
          logisticsSelectionPending:
              groupJson['logisticsSelectionPending'] as bool? ?? false,
        );
      }).toList(),
    );
  }
}

final checkoutProvider = NotifierProvider<CheckoutNotifier, CheckoutState>(
  CheckoutNotifier.new,
);

