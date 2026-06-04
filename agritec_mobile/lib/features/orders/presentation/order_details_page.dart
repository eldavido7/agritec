import 'dart:ui' as ui;

import 'package:agritec_mobile/features/auth/application/auth_prompt.dart';
import 'package:agritec_mobile/core/localization/app_localizations.dart';
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

class OrderDetailsPage extends ConsumerWidget {
  const OrderDetailsPage({super.key, required this.orderId});

  static const routeName = 'order-details';
  static const routePath = '/orders/:orderId';
  final String orderId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (!isBuyerAuthenticated(ref)) {
      return AuthRequiredPage(
        title: ref.tr('orderDetails.title'),
        message: ref.tr('auth.required.orders'),
        onBack: () {
          if (Navigator.of(context).canPop()) {
            Navigator.of(context).pop();
          } else {
            ref.read(shellTabProvider.notifier).setTab(0);
            context.goNamed('home-shell');
          }
        },
      );
    }
    final order = ref.watch(orderByIdProvider(orderId));
    if (order == null) {
      return Scaffold(body: Center(child: Text(ref.tr('orderDetails.notFound'))));
    }
    final hasBuyerCoords = order.buyerAddress.latitude != null && order.buyerAddress.longitude != null;
    final buyerPoint = hasBuyerCoords ? LatLng(order.buyerAddress.latitude!, order.buyerAddress.longitude!) : null;
    final money = NumberFormat.currency(locale: 'en_NG', symbol: 'NGN ', decimalDigits: 0);

    return Scaffold(
      backgroundColor: const Color(0xFFEAF1ED),
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () {
            final nav = Navigator.of(context);
            if (nav.canPop()) {
              nav.pop();
              return;
            }
            ref.read(shellTabProvider.notifier).setTab(4);
            context.go(OrdersPage.routePath);
          },
        ),
        title: Text('Order ${order.id}'),
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
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('${ref.tr('orderDetails.paymentReference')}: ${order.paymentReference}', style: const TextStyle(fontWeight: FontWeight.w700)),
                  const SizedBox(height: 6),
                  Text(order.buyerAddress.fullAddress, style: const TextStyle(color: Color(0xFF65706B))),
                  const SizedBox(height: 10),
                  _line(ref.tr('orderDetails.productSubtotal'), money.format(order.productSubtotal)),
                  _line(ref.tr('orderDetails.totalShippingFee'), money.format(order.totalShippingFee)),
                  _line(ref.tr('orderDetails.discountTotal'), '- ${money.format(order.discountTotal)}'),
                  const Divider(),
                  _line(ref.tr('orderDetails.grandTotal'), money.format(order.grandTotal), bold: true),
                ],
              ),
            ),
          ),
          const SizedBox(height: 10),
          for (final group in order.sellerGroups) ...[
            if (buyerPoint != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(14),
                  child: SizedBox(
                    height: 220,
                    child: _RouteMap(
                      sellerPoint: LatLng(group.sellerLatitude, group.sellerLongitude),
                      buyerPoint: buyerPoint,
                      riderPoint: LatLng(
                        (group.sellerLatitude + buyerPoint.latitude) / 2,
                        (group.sellerLongitude + buyerPoint.longitude) / 2,
                      ),
                      farmName: group.farmName,
                      sellerAddress: ref.watch(homeSellerByIdProvider(group.sellerId)).location,
                      buyerAddress: order.buyerAddress.fullAddress,
                    ),
                  ),
                ),
              ),
            if (!hasBuyerCoords)
              Card(
                elevation: 0,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
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
    );
  }

  Widget _line(String label, String value, {bool bold = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        children: [
          Expanded(child: Text(label, style: TextStyle(fontWeight: bold ? FontWeight.w700 : FontWeight.w400))),
          const SizedBox(width: 8),
          Text(value, style: TextStyle(fontWeight: bold ? FontWeight.w700 : FontWeight.w400)),
        ],
      ),
    );
  }
}

class _SellerGroupCard extends ConsumerWidget {
  const _SellerGroupCard({required this.group, required this.currency});

  final SellerOrderGroup group;
  final NumberFormat currency;

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
                      Text(group.farmName, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                      Text('${ref.tr('orderDetails.sellerLabel')}: ${group.sellerName}', style: const TextStyle(color: Color(0xFF65706B))),
                    ],
                  ),
                ),
                Chip(label: Text(group.status)),
              ],
            ),
            const SizedBox(height: 10),
            for (var i = 0; i < group.timeline.length; i++)
              _TimelineRow(
                label: group.timeline[i],
                isDone: i <= group.currentTimelineStep,
                showConnector: i < group.timeline.length - 1,
              ),
            const SizedBox(height: 10),
            Text(ref.tr('orderDetails.itemsLabel'), style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
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
                    Text(currency.format(line.lineTotal), style: const TextStyle(fontWeight: FontWeight.w600)),
                  ],
                ),
              ),
            const Divider(),
            _infoLine(ref.tr('orderDetails.productSubtotal'), currency.format(group.productSubtotal)),
            _infoLine('Shipping (${group.shippingQuote.deliveryRegion})', currency.format(group.shippingFee)),
            _infoLine(ref.tr('orderDetails.actualWeight'), '${group.shippingQuote.totalActualWeightKg.toStringAsFixed(1)} kg'),
            if (group.shippingQuote.usedVolumetricWeight && group.shippingQuote.totalVolumetricWeightKg != null)
              _infoLine(ref.tr('orderDetails.volumetricWeight'), '${group.shippingQuote.totalVolumetricWeightKg!.toStringAsFixed(1)} kg'),
            if (!group.shippingQuote.usedVolumetricWeight)
              Padding(
                padding: const EdgeInsets.only(top: 2, bottom: 4),
                child: Text(
                  ref.tr('orderDetails.actualWeightOnly'),
                  style: TextStyle(color: Color(0xFF65706B), fontSize: 12),
                ),
              ),
            _infoLine(ref.tr('orderDetails.chargeableWeight'), '${group.shippingQuote.totalChargeableWeightKg.toStringAsFixed(1)} kg'),
            _infoLine(ref.tr('orderDetails.shippingUnits'), '${group.shippingQuote.shippingUnits} x ${currency.format(group.shippingQuote.locationRate)}'),
            _infoLine(ref.tr('orderDetails.discount'), '- ${currency.format(group.discountTotal)}'),
            const Divider(),
            _infoLine(ref.tr('orderDetails.groupTotal'), currency.format(group.groupTotal), bold: true),
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
          Expanded(child: Text(label, style: TextStyle(fontWeight: bold ? FontWeight.w700 : FontWeight.w400))),
          const SizedBox(width: 8),
          Text(value, style: TextStyle(fontWeight: bold ? FontWeight.w700 : FontWeight.w400)),
        ],
      ),
    );
  }
}

class _RouteMap extends StatefulWidget {
  const _RouteMap({
    required this.sellerPoint,
    required this.buyerPoint,
    required this.riderPoint,
    required this.farmName,
    required this.sellerAddress,
    required this.buyerAddress,
  });

  final LatLng sellerPoint;
  final LatLng buyerPoint;
  final LatLng riderPoint;
  final String farmName;
  final String sellerAddress;
  final String buyerAddress;

  @override
  State<_RouteMap> createState() => _RouteMapState();
}

class _RouteMapState extends State<_RouteMap> {
  GoogleMapController? _controller;
  BitmapDescriptor? _riderIcon;

  @override
  void initState() {
    super.initState();
    _loadRiderIcon();
  }

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
          icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueGreen),
          infoWindow: InfoWindow(title: widget.farmName, snippet: widget.sellerAddress),
        ),
        Marker(
          markerId: const MarkerId('buyer'),
          position: widget.buyerPoint,
          infoWindow: InfoWindow(title: 'Delivery Address', snippet: widget.buyerAddress),
        ),
        Marker(
          markerId: const MarkerId('rider'),
          position: widget.riderPoint,
          anchor: const Offset(0.5, 0.5),
          icon: _riderIcon ?? BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueOrange),
          infoWindow: const InfoWindow(title: 'Rider'),
        ),
      },
      polylines: {
        Polyline(
          polylineId: const PolylineId('route-line'),
          points: [widget.sellerPoint, widget.buyerPoint],
          color: const Color(0xFF0D8A66),
          width: 5,
        ),
      },
    );
  }

  Future<void> _fitBounds() async {
    final controller = _controller;
    if (controller == null) return;
    final south = widget.sellerPoint.latitude < widget.buyerPoint.latitude ? widget.sellerPoint.latitude : widget.buyerPoint.latitude;
    final north = widget.sellerPoint.latitude > widget.buyerPoint.latitude ? widget.sellerPoint.latitude : widget.buyerPoint.latitude;
    final west = widget.sellerPoint.longitude < widget.buyerPoint.longitude ? widget.sellerPoint.longitude : widget.buyerPoint.longitude;
    final east = widget.sellerPoint.longitude > widget.buyerPoint.longitude ? widget.sellerPoint.longitude : widget.buyerPoint.longitude;
    await controller.animateCamera(
      CameraUpdate.newLatLngBounds(
        LatLngBounds(southwest: LatLng(south, west), northeast: LatLng(north, east)),
        56,
      ),
    );
    await controller.animateCamera(CameraUpdate.zoomBy(0.5));
  }

  Future<void> _loadRiderIcon() async {
    final marker = await _createMarkerFromIcon(
      icon: Icons.delivery_dining_rounded,
      color: const Color(0xFFB15F00),
      background: const Color(0xFFFFF1DE),
    );
    if (!mounted) return;
    setState(() => _riderIcon = marker);
  }

  Future<BitmapDescriptor> _createMarkerFromIcon({
    required IconData icon,
    required Color color,
    required Color background,
  }) async {
    const size = 60.0;
    final recorder = ui.PictureRecorder();
    final canvas = Canvas(recorder);
    final center = const Offset(size / 2, size / 2);
    final paint = Paint()..color = background;
    canvas.drawCircle(center, size / 2, paint);
    canvas.drawCircle(
      center,
      size / 2,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 4
        ..color = const Color(0xFFD8C8A9),
    );

    final painter = TextPainter(textDirection: ui.TextDirection.ltr);
    painter.text = TextSpan(
      text: String.fromCharCode(icon.codePoint),
      style: TextStyle(
        fontSize: 28,
        fontFamily: icon.fontFamily,
        package: icon.fontPackage,
        color: color,
      ),
    );
    painter.layout();
    painter.paint(canvas, Offset((size - painter.width) / 2, (size - painter.height) / 2));

    final image = await recorder.endRecording().toImage(size.toInt(), size.toInt());
    final data = await image.toByteData(format: ui.ImageByteFormat.png);
    return BitmapDescriptor.bytes(data!.buffer.asUint8List());
  }
}

class _TimelineRow extends StatelessWidget {
  const _TimelineRow({
    required this.label,
    required this.isDone,
    required this.showConnector,
  });

  final String label;
  final bool isDone;
  final bool showConnector;

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
                isDone ? Icons.check_circle_rounded : Icons.radio_button_unchecked_rounded,
                size: 18,
                color: isDone ? activeColor : mutedColor,
              ),
              if (showConnector)
                Container(
                  width: 2,
                  height: 22,
                  color: isDone ? activeColor.withValues(alpha: 0.45) : mutedColor.withValues(alpha: 0.4),
                ),
            ],
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Padding(
            padding: const EdgeInsets.only(top: 1),
            child: Text(
              label,
              style: TextStyle(
                color: isDone ? const Color(0xFF1F2D27) : const Color(0xFF6C7872),
                fontWeight: isDone ? FontWeight.w600 : FontWeight.w400,
              ),
            ),
          ),
        ),
      ],
    );
  }
}



