import 'dart:math';

import 'package:agritec_mobile/features/account/application/address_providers.dart';
import 'package:agritec_mobile/features/cart/application/cart_providers.dart';
import 'package:agritec_mobile/core/logistics/logistics_models.dart';

ShippingQuote calculatePlatformShippingQuote({
  required List<CartLineItem> items,
  required BuyerAddress? buyerAddress,
  PlatformShippingSettings settings = platformShippingSettings,
}) {
  final totalWeight = items.fold<double>(0, (sum, item) {
    return sum +
        item.product.logistics.chargeableWeightKg(settings.volumetricDivisor) *
            item.quantity;
  });
  final state = (buyerAddress?.state ?? '').toLowerCase();
  final city = (buyerAddress?.city ?? '').toLowerCase();
  final isAbuja = city.contains('abuja') || state.contains('abuja') || state.contains('fct');
  final rate = isAbuja ? settings.abujaRatePerUnit : settings.outsideAbujaRatePerUnit;
  final units = max(1, (totalWeight / settings.weightUnitSizeKg).ceil());
  return ShippingQuote(
    deliveryRegion: isAbuja ? 'Abuja / FCT' : 'Outside Abuja',
    totalChargeableWeightKg: totalWeight,
    shippingUnits: units,
    locationRate: rate,
    shippingFee: units * rate,
  );
}

