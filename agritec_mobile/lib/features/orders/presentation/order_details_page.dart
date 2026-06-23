import 'package:agritec_mobile/features/auth/application/auth_prompt.dart';
import 'package:agritec_mobile/core/localization/app_localizations.dart';
import 'package:agritec_mobile/core/localization/localized_text.dart';
import 'package:agritec_mobile/features/home/application/home_providers.dart';
import 'package:agritec_mobile/features/home/application/shell_navigation_provider.dart';
import 'package:agritec_mobile/features/home/presentation/main_shell_page.dart';
import 'package:agritec_mobile/features/orders/application/order_providers.dart';
import 'package:agritec_mobile/features/orders/presentation/orders_page.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

class OrderDetailsPage extends ConsumerStatefulWidget {
  const OrderDetailsPage({super.key, required this.orderId});

  static const routeName = 'order-details';
  static const routePath = '/orders/:orderId';
  final String orderId;

  @override
  ConsumerState<OrderDetailsPage> createState() => _OrderDetailsPageState();
}

class _OrderDetailsPageState extends ConsumerState<OrderDetailsPage> {
  bool _requestedRemote = false;

  @override
  Widget build(BuildContext context) {
    void handleBack() {
      final nav = Navigator.of(context);
      if (nav.canPop()) {
        nav.pop();
        return;
      }
      ref.read(shellTabProvider.notifier).setTab(4);
      context.go(OrdersPage.routePath);
    }

    if (!isBuyerAuthenticated(ref)) {
      return AuthRequiredPage(
        title: ref.tr('orderDetails.title'),
        message: ref.tr('auth.required.orders'),
        onBack: handleBack,
      );
    }

    final order = ref.watch(orderByIdProvider(widget.orderId));
    if (order == null && !_requestedRemote) {
      _requestedRemote = true;
      Future.microtask(
        () => ref.read(ordersProvider.notifier).fetchOrderById(widget.orderId),
      );
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    if (order == null) {
      return Scaffold(body: Center(child: Text(ref.tr('orderDetails.notFound'))));
    }

    final hasBuyerCoords =
        order.buyerAddress.latitude != null && order.buyerAddress.longitude != null;
    final buyerPoint = hasBuyerCoords
        ? LatLng(order.buyerAddress.latitude!, order.buyerAddress.longitude!)
        : null;
    final money = NumberFormat.currency(
      locale: 'en_NG',
      symbol: 'NGN ',
      decimalDigits: 0,
    );

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) {
          handleBack();
        }
      },
      child: Scaffold(
        backgroundColor: const Color(0xFFEAF1ED),
        appBar: AppBar(
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_rounded),
            onPressed: handleBack,
          ),
          title: Text(trFormat(ref, 'orderDetails.orderLabel', {'id': order.id})),
          actions: [
            IconButton(
              icon: const Icon(Icons.home_rounded),
              onPressed: () {
                ref.read(shellTabProvider.notifier).setTab(0);
                context.go(MainShellPage.routePath);
              },
            ),
          ],
        ),
        body: ListView(
          padding: const EdgeInsets.fromLTRB(14, 14, 14, 16),
          children: [
            Card(
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
              ),
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '${ref.tr('orderDetails.paymentReference')}: ${order.paymentReference}',
                      style: const TextStyle(fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      order.buyerAddress.fullAddress,
                      style: const TextStyle(color: Color(0xFF65706B)),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      ref.tr('orderDetails.shippingHelper'),
                      style: const TextStyle(color: Color(0xFF65706B)),
                    ),
                    const SizedBox(height: 10),
                    _line(
                      ref.tr('orderDetails.productSubtotal'),
                      money.format(order.productSubtotal),
                    ),
                    _line(
                      ref.tr('orderDetails.totalShippingFee'),
                      money.format(order.totalShippingFee),
                    ),
                    _line(
                      ref.tr('orderDetails.discountTotal'),
                      '- ${money.format(order.discountTotal)}',
                    ),
                    const Divider(),
                    _line(
                      ref.tr('orderDetails.grandTotal'),
                      money.format(order.grandTotal),
                      bold: true,
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 10),
            for (final group in order.sellerGroups) ...[
              if (buyerPoint != null &&
                  _hasValidCoordinates(
                    group.sellerLatitude,
                    group.sellerLongitude,
                  ))
                Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(14),
                    child: SizedBox(
                      height: 220,
                      child: _RouteMap(
                        sellerPoint:
                            LatLng(group.sellerLatitude, group.sellerLongitude),
                        buyerPoint: buyerPoint,
                        farmName: group.farmName,
                        buyerInfoTitle: ref.tr('orderDetails.deliveryAddress'),
                        sellerAddress:
                            ref.watch(homeSellerByIdProvider(group.sellerId)).location,
                        buyerAddress: order.buyerAddress.fullAddress,
                      ),
                    ),
                  ),
                ),
              if (!hasBuyerCoords ||
                  !_hasValidCoordinates(
                    group.sellerLatitude,
                    group.sellerLongitude,
                  ))
                Card(
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: ListTile(
                    title: Text(ref.tr('orderDetails.mapUnavailable')),
                    subtitle: Text(ref.tr('orderDetails.mapUnavailableHint')),
                    trailing: TextButton(
                      onPressed: () => context.goNamed('addresses'),
                      child: Text(ref.tr('orderDetails.editAddress')),
                    ),
                  ),
                ),
              _SellerGroupCard(group: group, currency: money),
              const SizedBox(height: 10),
            ],
          ],
        ),
      ),
    );
  }

  Widget _line(String label, String value, {bool bold = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        children: [
          Expanded(
            child: Text(
              label,
              style: TextStyle(
                fontWeight: bold ? FontWeight.w700 : FontWeight.w400,
              ),
            ),
          ),
          const SizedBox(width: 8),
          Text(
            value,
            style: TextStyle(
              fontWeight: bold ? FontWeight.w700 : FontWeight.w400,
            ),
          ),
        ],
      ),
    );
  }
}

bool _hasValidCoordinates(double? latitude, double? longitude) {
  if (latitude == null || longitude == null) return false;
  if (latitude.abs() < 0.000001 && longitude.abs() < 0.000001) return false;
  return true;
}

class _SellerGroupCard extends ConsumerWidget {
  const _SellerGroupCard({required this.group, required this.currency});

  final SellerOrderGroup group;
  final NumberFormat currency;

  String _formatStatusDate(DateTime value) {
    return DateFormat('d MMM, y • h:mm a', 'en_NG').format(value);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        group.farmName,
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      Text(
                        '${ref.tr('orderDetails.sellerLabel')}: ${group.sellerName}',
                        style: const TextStyle(color: Color(0xFF65706B)),
                      ),
                      if ((group.logisticsCompanyName ?? '').isNotEmpty)
                        Text(
                          '${ref.tr('orderDetails.logisticsCompany')}: ${group.logisticsCompanyName}',
                          style: const TextStyle(color: Color(0xFF65706B)),
                        ),
                    ],
                  ),
                ),
                Chip(label: Text(trOrderStatus(ref, group.status))),
              ],
            ),
            const SizedBox(height: 10),
            Text(
              ref.tr('orderDetails.timeline'),
              style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
            ),
            const SizedBox(height: 8),
            if (group.statusHistory.isNotEmpty)
              for (var i = 0; i < group.statusHistory.length; i++)
                _TimelineRow(
                  label: group.timeline.length > i
                      ? trOrderTimeline(ref, group.timeline[i])
                      : trOrderStatus(ref, group.statusHistory[i].status),
                  caption: [
                    if ((group.statusHistory[i].updatedByUserName ?? '').isNotEmpty)
                      group.statusHistory[i].updatedByUserName!,
                    if ((group.statusHistory[i].description ?? '').isNotEmpty)
                      group.statusHistory[i].description!,
                    _formatStatusDate(group.statusHistory[i].createdAt),
                  ].join(' • '),
                  isDone: true,
                  showConnector: i < group.statusHistory.length - 1,
                )
            else
              for (var i = 0; i < group.timeline.length; i++)
                _TimelineRow(
                  label: trOrderTimeline(ref, group.timeline[i]),
                  isDone: i <= group.currentTimelineStep,
                  showConnector: i < group.timeline.length - 1,
                ),
            const SizedBox(height: 10),
            Text(
              ref.tr('orderDetails.itemsLabel'),
              style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
            ),
            const SizedBox(height: 8),
            for (final line in group.items)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        '${line.product.name} x${line.quantity}',
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      currency.format(line.lineTotal),
                      style: const TextStyle(fontWeight: FontWeight.w600),
                    ),
                  ],
                ),
              ),
            const Divider(),
            _infoLine(
              ref.tr('orderDetails.productSubtotal'),
              currency.format(group.productSubtotal),
            ),
            _infoLine(
              ref.tr('orderDetails.deliveryRegion'),
              group.shippingQuote.deliveryRegion,
            ),
            _infoLine(
              ref.tr('orderDetails.chargeableWeight'),
              '${group.shippingQuote.totalChargeableWeightKg.toStringAsFixed(1)} kg',
            ),
            _infoLine(
              ref.tr('orderDetails.shippingFee'),
              currency.format(group.shippingFee),
            ),
            _infoLine(
              ref.tr('orderDetails.discount'),
              '- ${currency.format(group.discountTotal)}',
            ),
            const Divider(),
            _infoLine(
              ref.tr('orderDetails.groupTotal'),
              currency.format(group.groupTotal),
              bold: true,
            ),
          ],
        ),
      ),
    );
  }

  Widget _infoLine(String label, String value, {bool bold = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Text(
              label,
              style: TextStyle(
                fontWeight: bold ? FontWeight.w700 : FontWeight.w400,
              ),
            ),
          ),
          const SizedBox(width: 8),
          Text(
            value,
            style: TextStyle(
              fontWeight: bold ? FontWeight.w700 : FontWeight.w400,
            ),
          ),
        ],
      ),
    );
  }
}

class _RouteMap extends StatefulWidget {
  const _RouteMap({
    required this.sellerPoint,
    required this.buyerPoint,
    required this.farmName,
    required this.buyerInfoTitle,
    required this.sellerAddress,
    required this.buyerAddress,
  });

  final LatLng sellerPoint;
  final LatLng buyerPoint;
  final String farmName;
  final String buyerInfoTitle;
  final String sellerAddress;
  final String buyerAddress;

  @override
  State<_RouteMap> createState() => _RouteMapState();
}

class _RouteMapState extends State<_RouteMap> {
  GoogleMapController? _controller;

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return GoogleMap(
      initialCameraPosition: CameraPosition(
        target: LatLng(
          (widget.sellerPoint.latitude + widget.buyerPoint.latitude) / 2,
          (widget.sellerPoint.longitude + widget.buyerPoint.longitude) / 2,
        ),
        zoom: 5,
      ),
      onMapCreated: (controller) {
        _controller = controller;
        _fitBounds();
      },
      gestureRecognizers: <Factory<OneSequenceGestureRecognizer>>{
        Factory<PanGestureRecognizer>(() => PanGestureRecognizer()),
        Factory<ScaleGestureRecognizer>(() => ScaleGestureRecognizer()),
      },
      scrollGesturesEnabled: true,
      zoomGesturesEnabled: true,
      rotateGesturesEnabled: true,
      tiltGesturesEnabled: true,
      myLocationButtonEnabled: false,
      zoomControlsEnabled: false,
      markers: {
        Marker(
          markerId: const MarkerId('seller'),
          position: widget.sellerPoint,
          icon: BitmapDescriptor.defaultMarkerWithHue(
            BitmapDescriptor.hueGreen,
          ),
          infoWindow: InfoWindow(
            title: widget.farmName,
            snippet: widget.sellerAddress,
          ),
        ),
        Marker(
          markerId: const MarkerId('buyer'),
          position: widget.buyerPoint,
          infoWindow: InfoWindow(
            title: widget.buyerInfoTitle,
            snippet: widget.buyerAddress,
          ),
        ),
      },
      polylines: {
        Polyline(
          polylineId: const PolylineId('route-line'),
          points: [widget.sellerPoint, widget.buyerPoint],
          color: const Color(0xFF0D8A66),
          width: 5,
          startCap: Cap.roundCap,
          endCap: Cap.roundCap,
        ),
      },
    );
  }

  Future<void> _fitBounds() async {
    final controller = _controller;
    if (controller == null) return;
    final south = widget.sellerPoint.latitude < widget.buyerPoint.latitude
        ? widget.sellerPoint.latitude
        : widget.buyerPoint.latitude;
    final north = widget.sellerPoint.latitude > widget.buyerPoint.latitude
        ? widget.sellerPoint.latitude
        : widget.buyerPoint.latitude;
    final west = widget.sellerPoint.longitude < widget.buyerPoint.longitude
        ? widget.sellerPoint.longitude
        : widget.buyerPoint.longitude;
    final east = widget.sellerPoint.longitude > widget.buyerPoint.longitude
        ? widget.sellerPoint.longitude
        : widget.buyerPoint.longitude;
    await controller.animateCamera(
      CameraUpdate.newLatLngBounds(
        LatLngBounds(
          southwest: LatLng(south, west),
          northeast: LatLng(north, east),
        ),
        56,
      ),
    );
    await controller.animateCamera(CameraUpdate.zoomBy(0.5));
  }
}
class _TimelineRow extends StatelessWidget {
  const _TimelineRow({
    required this.label,
    required this.isDone,
    required this.showConnector,
    this.caption,
  });

  final String label;
  final bool isDone;
  final bool showConnector;
  final String? caption;

  @override
  Widget build(BuildContext context) {
    final activeColor = const Color(0xFF0D8A66);
    final mutedColor = const Color(0xFF9DA9A2);
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 22,
          child: Column(
            children: [
              Icon(
                isDone
                    ? Icons.check_circle_rounded
                    : Icons.radio_button_unchecked_rounded,
                size: 18,
                color: isDone ? activeColor : mutedColor,
              ),
              if (showConnector)
                Container(
                  width: 2,
                  height: 22,
                  color: isDone
                      ? activeColor.withValues(alpha: 0.45)
                      : mutedColor.withValues(alpha: 0.4),
                ),
            ],
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Padding(
            padding: const EdgeInsets.only(top: 1),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    color: isDone
                        ? const Color(0xFF1F2D27)
                        : const Color(0xFF6C7872),
                    fontWeight: isDone ? FontWeight.w600 : FontWeight.w400,
                  ),
                ),
                if ((caption ?? '').isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 2),
                    child: Text(
                      caption!,
                      style: const TextStyle(
                        color: Color(0xFF6C7872),
                        fontSize: 12,
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
