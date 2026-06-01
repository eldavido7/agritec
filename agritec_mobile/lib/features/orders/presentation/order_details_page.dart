import 'dart:ui' as ui;

import 'package:agritec_mobile/features/home/application/home_providers.dart';
import 'package:agritec_mobile/features/auth/application/auth_prompt.dart';
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
        title: 'Order Details',
        message: 'Sign in to view your order history.',
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
      return const Scaffold(body: Center(child: Text('Order not found.')));
    }
    final sellerPoint = LatLng(order.sellerLatitude, order.sellerLongitude);
    final hasBuyerCoords = order.buyerAddress.latitude != null &&
        order.buyerAddress.longitude != null;
    final buyerPoint = hasBuyerCoords
        ? LatLng(order.buyerAddress.latitude!, order.buyerAddress.longitude!)
        : null;
    final riderPoint = buyerPoint == null
        ? null
        : LatLng(
            (sellerPoint.latitude + buyerPoint.latitude) / 2,
            (sellerPoint.longitude + buyerPoint.longitude) / 2,
          );
    final seller = ref.watch(homeSellerByIdProvider(order.sellerId));
    final money = NumberFormat.currency(
      locale: 'en_NG',
      symbol: 'NGN ',
      decimalDigits: 0,
    );

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
          if (buyerPoint != null && riderPoint != null)
            ClipRRect(
              borderRadius: BorderRadius.circular(14),
              child: SizedBox(
                height: 240,
                child: _RouteMap(
                  sellerPoint: sellerPoint,
                  buyerPoint: buyerPoint,
                  riderPoint: riderPoint,
                  farmName: order.farmName,
                  sellerAddress: seller.location,
                  buyerAddress: order.buyerAddress.fullAddress,
                ),
              ),
            ),
          if (!hasBuyerCoords)
            Card(
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
              ),
              child: ListTile(
                title: const Text('Map location unavailable'),
                subtitle: const Text('Edit this address to add map location.'),
                trailing: TextButton(
                  onPressed: () => context.goNamed('addresses'),
                  child: const Text('Edit Address'),
                ),
              ),
            ),
          const SizedBox(height: 12),
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
                    order.farmName,
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'Seller: ${order.sellerName}',
                    style: const TextStyle(color: Color(0xFF65706B)),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    order.buyerAddress.fullAddress,
                    style: const TextStyle(color: Color(0xFF65706B)),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 10),
          Card(
            elevation: 0,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
            ),
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                children: [
                  for (var i = 0; i < order.timeline.length; i++)
                    _TimelineRow(
                      label: order.timeline[i],
                      isDone: i <= order.currentTimelineStep,
                      showConnector: i < order.timeline.length - 1,
                    ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 10),
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
                  const Text(
                    'Items',
                    style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
                  ),
                  const SizedBox(height: 8),
                  for (final line in order.items)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Row(
                        children: [
                          Expanded(
                            child: Text(
                              '${line.product.name} x${line.quantity}',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            money.format(line.lineTotal),
                            style: const TextStyle(fontWeight: FontWeight.w600),
                          ),
                        ],
                      ),
                    ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 10),
          Card(
            elevation: 0,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
            ),
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                children: [
                  _line('Subtotal', money.format(order.subtotal)),
                  _line(
                    'Shipping (${order.shippingOption.name})',
                    money.format(order.shippingOption.price),
                  ),
                  _line(
                    'Discount${order.discountCode != null ? ' (${order.discountCode})' : ''}',
                    '- ${money.format(order.discountAmount)}',
                  ),
                  const Divider(),
                  _line('Order Total', money.format(order.total), bold: true),
                ],
              ),
            ),
          ),
        ],
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
            title: 'Delivery Address',
            snippet: widget.buyerAddress,
          ),
        ),
        Marker(
          markerId: const MarkerId('rider'),
          position: widget.riderPoint,
          anchor: const Offset(0.5, 0.5),
          icon:
              _riderIcon ??
              BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueOrange),
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
    painter.paint(
      canvas,
      Offset((size - painter.width) / 2, (size - painter.height) / 2),
    );

    final image = await recorder.endRecording().toImage(
      size.toInt(),
      size.toInt(),
    );
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
            child: Text(
              label,
              style: TextStyle(
                color: isDone
                    ? const Color(0xFF1F2D27)
                    : const Color(0xFF6C7872),
                fontWeight: isDone ? FontWeight.w600 : FontWeight.w400,
              ),
            ),
          ),
        ),
      ],
    );
  }
}
