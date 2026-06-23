import 'package:agritec_mobile/core/localization/app_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

String trFormat(WidgetRef ref, String key, Map<String, String> values) {
  var text = ref.tr(key);
  for (final entry in values.entries) {
    text = text.replaceAll('{${entry.key}}', entry.value);
  }
  return text;
}

String trCategory(WidgetRef ref, String slug, String fallback) {
  final key = 'category.$slug';
  final translated = ref.tr(key);
  return translated == key ? fallback : translated;
}

String trOrderStatus(WidgetRef ref, String rawStatus) {
  switch (rawStatus.trim().toUpperCase()) {
    case 'PENDING PAYMENT':
      return ref.tr('orders.status.pendingPayment');
    case 'PARTIALLY DELIVERED':
      return ref.tr('orders.status.partiallyDelivered');
    case 'PARTIALLY SHIPPED':
      return ref.tr('orders.status.partiallyShipped');
    case 'PROCESSING':
      return ref.tr('orders.status.processing');
    case 'DELIVERED':
      return ref.tr('orders.status.delivered');
    case 'SHIPPED':
      return ref.tr('orders.status.shipped');
    case 'CANCELLED':
      return ref.tr('orders.status.cancelled');
    case 'REFUNDED':
      return ref.tr('orders.status.refunded');
    case 'CONFIRMED':
      return ref.tr('orders.status.confirmed');
    case 'PENDING':
      return ref.tr('orders.status.pending');
    default:
      return rawStatus;
  }
}

String trOrderTimeline(WidgetRef ref, String rawLabel) {
  switch (rawLabel.trim().toUpperCase()) {
    case 'ORDER PLACED':
    case 'PENDING':
      return ref.tr('orders.timeline.orderPlaced');
    case 'PAYMENT CONFIRMED':
    case 'CONFIRMED':
      return ref.tr('orders.timeline.paymentConfirmed');
    case 'SELLER PROCESSING':
    case 'PROCESSING':
      return ref.tr('orders.timeline.sellerProcessing');
    case 'OUT FOR DELIVERY':
    case 'SHIPPED':
      return ref.tr('orders.timeline.outForDelivery');
    case 'DELIVERED':
      return ref.tr('orders.timeline.delivered');
    case 'CANCELLED':
      return ref.tr('orders.timeline.cancelled');
    case 'REFUND COMPLETED':
    case 'REFUNDED':
      return ref.tr('orders.timeline.refundCompleted');
    default:
      return rawLabel;
  }
}
