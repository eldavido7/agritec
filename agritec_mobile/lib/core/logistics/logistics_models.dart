enum SalesUnit { piece, kg, bag, basket, crate, box, bundle, tray, pack, litre, animal, other }
enum PackageType { piece, bag, basket, crate, box, bundle, liveAnimal, other }

extension SalesUnitLabel on SalesUnit {
  String get label => switch (this) {
        SalesUnit.piece => 'Piece', SalesUnit.kg => 'Kg', SalesUnit.bag => 'Bag', SalesUnit.basket => 'Basket',
        SalesUnit.crate => 'Crate', SalesUnit.box => 'Box', SalesUnit.bundle => 'Bundle', SalesUnit.tray => 'Tray',
        SalesUnit.pack => 'Pack', SalesUnit.litre => 'Litre', SalesUnit.animal => 'Animal', SalesUnit.other => 'Unit',
      };
  String get apiValue => name == 'kg' ? 'KG' : name.replaceAll('liveAnimal', 'LIVE_ANIMAL').toUpperCase();
}

extension PackageTypeValue on PackageType {
  String get apiValue => this == PackageType.liveAnimal ? 'LIVE_ANIMAL' : name.toUpperCase();
}

SalesUnit salesUnitFromJson(Object? value) {
  final normalized = '$value'.toUpperCase();
  return SalesUnit.values.firstWhere((unit) => unit.apiValue == normalized, orElse: () => SalesUnit.other);
}

PackageType packageTypeFromJson(Object? value) {
  final normalized = '$value'.toUpperCase();
  return PackageType.values.firstWhere((type) => type.apiValue == normalized, orElse: () => PackageType.other);
}

class LogisticsMetadata {
  const LogisticsMetadata({
    required this.salesUnit,
    required this.unitWeightKg,
    this.unitLengthCm,
    this.unitWidthCm,
    this.unitHeightCm,
    required this.packageType,
  });

  final SalesUnit salesUnit;
  final double unitWeightKg;
  final double? unitLengthCm;
  final double? unitWidthCm;
  final double? unitHeightCm;
  final PackageType packageType;

  bool get hasCompleteDimensions {
    final length = unitLengthCm;
    final width = unitWidthCm;
    final height = unitHeightCm;
    return length != null &&
        width != null &&
        height != null &&
        length > 0 &&
        width > 0 &&
        height > 0;
  }

  double? volumetricWeightKg(double divisor) {
    if (!hasCompleteDimensions) return null;
    return (unitLengthCm! * unitWidthCm! * unitHeightCm!) / divisor;
  }

  double chargeableWeightKg(double divisor) {
    final volumetric = volumetricWeightKg(divisor);
    if (volumetric == null || volumetric <= 0) return unitWeightKg;
    return unitWeightKg > volumetric ? unitWeightKg : volumetric;
  }

  Map<String, dynamic> toJson() => {
        'salesUnit': salesUnit.apiValue,
        'unitWeightKg': unitWeightKg,
        'unitLengthCm': unitLengthCm,
        'unitWidthCm': unitWidthCm,
        'unitHeightCm': unitHeightCm,
        'packageType': packageType.apiValue,
      };

  factory LogisticsMetadata.fromJson(Map<String, dynamic> json) => LogisticsMetadata(
        salesUnit: salesUnitFromJson(json['salesUnit']),
        unitWeightKg: (json['unitWeightKg'] as num?)?.toDouble() ?? 1,
        unitLengthCm: (json['unitLengthCm'] as num?)?.toDouble(),
        unitWidthCm: (json['unitWidthCm'] as num?)?.toDouble(),
        unitHeightCm: (json['unitHeightCm'] as num?)?.toDouble(),
        packageType: packageTypeFromJson(json['packageType']),
      );
}

class PlatformShippingSettings {
  const PlatformShippingSettings({
    required this.abujaRatePerUnit,
    required this.outsideAbujaRatePerUnit,
    required this.weightUnitSizeKg,
    required this.volumetricDivisor,
  });
  final int abujaRatePerUnit;
  final int outsideAbujaRatePerUnit;
  final double weightUnitSizeKg;
  final double volumetricDivisor;
}

const platformShippingSettings = PlatformShippingSettings(abujaRatePerUnit: 5000, outsideAbujaRatePerUnit: 10000, weightUnitSizeKg: 10, volumetricDivisor: 5000);

class ShippingQuote {
  const ShippingQuote({
    required this.deliveryRegion,
    required this.totalActualWeightKg,
    this.totalVolumetricWeightKg,
    required this.usedVolumetricWeight,
    required this.totalChargeableWeightKg,
    required this.shippingUnits,
    required this.locationRate,
    required this.shippingFee,
  });
  final String deliveryRegion;
  final double totalActualWeightKg;
  final double? totalVolumetricWeightKg;
  final bool usedVolumetricWeight;
  final double totalChargeableWeightKg;
  final int shippingUnits;
  final int locationRate;
  final int shippingFee;
  Map<String, dynamic> toJson() => {
        'deliveryRegion': deliveryRegion,
        'totalActualWeightKg': totalActualWeightKg,
        'totalVolumetricWeightKg': totalVolumetricWeightKg,
        'usedVolumetricWeight': usedVolumetricWeight,
        'totalChargeableWeightKg': totalChargeableWeightKg,
        'shippingUnits': shippingUnits,
        'locationRate': locationRate,
        'shippingFee': shippingFee,
      };
  factory ShippingQuote.fromJson(Map<String, dynamic> json) => ShippingQuote(
        deliveryRegion: json['deliveryRegion'] as String,
        totalActualWeightKg: (json['totalActualWeightKg'] as num?)?.toDouble() ??
            (json['totalChargeableWeightKg'] as num).toDouble(),
        totalVolumetricWeightKg:
            (json['totalVolumetricWeightKg'] as num?)?.toDouble(),
        usedVolumetricWeight: json['usedVolumetricWeight'] as bool? ?? false,
        totalChargeableWeightKg: (json['totalChargeableWeightKg'] as num).toDouble(),
        shippingUnits: (json['shippingUnits'] as num).toInt(),
        locationRate: (json['locationRate'] as num).toInt(),
        shippingFee: (json['shippingFee'] as num).toInt(),
      );
}
