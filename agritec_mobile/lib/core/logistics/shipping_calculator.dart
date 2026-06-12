import 'dart:math';

import 'package:agritec_mobile/core/logistics/logistics_models.dart';
import 'package:agritec_mobile/features/account/application/address_providers.dart';
import 'package:agritec_mobile/features/cart/application/cart_providers.dart';

ShippingQuote calculatePlatformShippingQuote({
  required List<CartLineItem> items,
  required BuyerAddress? buyerAddress,
  PlatformShippingSettings settings = platformShippingSettings,
}) {
  var totalActualWeight = 0.0;
  var totalVolumetricWeight = 0.0;
  var hasVolumetricData = false;

  for (final item in items) {
    final logistics = item.product.logistics;
    totalActualWeight += logistics.unitWeightKg * item.quantity;
    final volumetric = logistics.volumetricWeightKg(settings.volumetricDivisor);
    if (volumetric != null && volumetric > 0) {
      hasVolumetricData = true;
      totalVolumetricWeight += volumetric * item.quantity;
    }
  }

  final totalChargeableWeight = items.fold<double>(0, (sum, item) {
    return sum +
        item.product.logistics.chargeableWeightKg(settings.volumetricDivisor) *
            item.quantity;
  });

  final state = (buyerAddress?.state ?? '').toLowerCase();
  final city = (buyerAddress?.city ?? '').toLowerCase();
  final isAbuja =
      city.contains('abuja') || state.contains('abuja') || state.contains('fct');
  final minimumFee =
      isAbuja ? settings.abujaMinimumFee : settings.outsideMinimumFee;
  final additionalUnitFee = isAbuja
      ? settings.abujaAdditionalUnitFee
      : settings.outsideAdditionalUnitFee;
  final units = totalChargeableWeight <= settings.weightUnitSizeKg
      ? 1
      : max(1, (totalChargeableWeight / settings.weightUnitSizeKg).ceil());
  final shippingFee = totalChargeableWeight <= settings.weightUnitSizeKg
      ? minimumFee
      : minimumFee + ((units - 1) * additionalUnitFee);

  return ShippingQuote(
    deliveryRegion: isAbuja ? 'Abuja / FCT' : 'Outside Abuja',
    totalActualWeightKg: totalActualWeight,
    totalVolumetricWeightKg: hasVolumetricData ? totalVolumetricWeight : null,
    usedVolumetricWeight: hasVolumetricData,
    totalChargeableWeightKg: totalChargeableWeight,
    weightUnitSizeKg: settings.weightUnitSizeKg,
    shippingUnits: units,
    minimumFee: minimumFee,
    additionalUnitFee: additionalUnitFee,
    shippingFee: shippingFee,
  );
}
