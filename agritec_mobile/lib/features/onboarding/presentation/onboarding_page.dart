import 'dart:math' as math;

import 'package:agritec_mobile/features/home/presentation/main_shell_page.dart';
import 'package:agritec_mobile/features/startup/application/startup_controller.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

class OnboardingPage extends ConsumerStatefulWidget {
  const OnboardingPage({super.key});

  static const routeName = 'onboarding';
  static const routePath = '/onboarding';

  @override
  ConsumerState<OnboardingPage> createState() => _OnboardingPageState();
}

class _OnboardingPageState extends ConsumerState<OnboardingPage>
    with SingleTickerProviderStateMixin {
  final _pageController = PageController();
  late final AnimationController _sceneController;
  int _index = 0;

  static const _slides = [
    _SlideData(
      titleLine1: 'Buy From',
      titleLine2: 'Verified Sellers',
      subtitleLine1: 'Find trusted multivendor farm products',
      subtitleLine2: 'across grains, dairy, vegetables & poultry.',
      primary: Color(0xFF1A6B4A),
      secondary: Color(0xFF0D4A31),
      bottom: Color(0xFF071F14),
      accent: Color(0xFFF5C842),
      muted: Color(0xFF7BC99A),
      scene: _SceneKind.market,
    ),
    _SlideData(
      titleLine1: 'Shop Smarter',
      titleLine2: 'By Seller',
      subtitleLine1: 'Compare shipping, discounts, and',
      subtitleLine2: 'variants before adding to cart.',
      primary: Color(0xFF1A4A7A),
      secondary: Color(0xFF0D2D52),
      bottom: Color(0xFF071428),
      accent: Color(0xFFF5C842),
      muted: Color(0xFF7AAFE0),
      scene: _SceneKind.compare,
    ),
    _SlideData(
      titleLine1: 'Track Every',
      titleLine2: 'Order Smoothly',
      subtitleLine1: 'Stay informed with timelines, chat',
      subtitleLine2: 'with sellers & receive live notifications.',
      primary: Color(0xFFC47A15),
      secondary: Color(0xFF7A4200),
      bottom: Color(0xFF3A1800),
      accent: Color(0xFFF5C842),
      muted: Color(0xFFF0C080),
      scene: _SceneKind.tracking,
    ),
  ];

  @override
  void initState() {
    super.initState();
    _sceneController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2400),
    )..repeat(reverse: true);
  }

  Future<void> _finishOnboarding() async {
    await ref.read(startupControllerProvider.notifier).completeOnboarding();
    if (!mounted) return;
    context.go(MainShellPage.routePath);
  }

  Future<void> _next() async {
    if (_index == _slides.length - 1) {
      await _finishOnboarding();
      return;
    }
    await _pageController.nextPage(
      duration: const Duration(milliseconds: 420),
      curve: Curves.easeOutCubic,
    );
  }

  @override
  void dispose() {
    _sceneController.dispose();
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isLast = _index == _slides.length - 1;
    return Scaffold(
      backgroundColor: const Color(0xFFF0EDE8),
      body: SafeArea(
        child: Column(
          children: [
            Align(
              alignment: Alignment.centerRight,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 10, 20, 0),
                child: TextButton(
                  onPressed: _finishOnboarding,
                  child: const Text('Skip'),
                ),
              ),
            ),
            Expanded(
              child: PageView.builder(
                controller: _pageController,
                onPageChanged: (value) => setState(() => _index = value),
                itemCount: _slides.length,
                itemBuilder: (context, i) {
                  return _OnboardingCard(
                    slide: _slides[i],
                    index: i,
                    animation: _sceneController,
                  );
                },
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(22, 12, 22, 24),
              child: Row(
                children: [
                  Row(
                    children: List.generate(_slides.length, (i) {
                      final active = i == _index;
                      return AnimatedContainer(
                        duration: const Duration(milliseconds: 260),
                        curve: Curves.easeOut,
                        margin: const EdgeInsets.only(right: 7),
                        width: active ? 24 : 8,
                        height: 8,
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(99),
                          color: active
                              ? const Color(0xFF0D8A66)
                              : const Color(0xFFC9D2CC),
                        ),
                      );
                    }),
                  ),
                  const Spacer(),
                  ElevatedButton(
                    onPressed: _next,
                    style: ElevatedButton.styleFrom(
                      minimumSize: const Size(148, 52),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                    ),
                    child: Text(isLast ? 'Start Shopping' : 'Next'),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _OnboardingCard extends StatelessWidget {
  const _OnboardingCard({
    required this.slide,
    required this.index,
    required this.animation,
  });

  final _SlideData slide;
  final int index;
  final Animation<double> animation;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(18, 6, 18, 6),
        child: LayoutBuilder(
          builder: (context, constraints) {
            final width = math.min(constraints.maxWidth, 390.0);
            final height = math.min(constraints.maxHeight, width * 580 / 320);
            return SizedBox(
              width: width,
              height: height,
              child: DecoratedBox(
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(32),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.18),
                      blurRadius: 60,
                      offset: const Offset(0, 20),
                    ),
                  ],
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(32),
                  child: AnimatedBuilder(
                    animation: animation,
                    builder: (context, _) {
                      return CustomPaint(
                        painter: _OnboardingScenePainter(
                          slide: slide,
                          index: index,
                          t: animation.value,
                        ),
                        child: const SizedBox.expand(),
                      );
                    },
                  ),
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}

class _OnboardingScenePainter extends CustomPainter {
  const _OnboardingScenePainter({
    required this.slide,
    required this.index,
    required this.t,
  });

  final _SlideData slide;
  final int index;
  final double t;

  @override
  void paint(Canvas canvas, Size size) {
    canvas.scale(size.width / 320, size.height / 580);
    final pulse = math.sin(t * math.pi);
    final paint = Paint();

    paint.shader = LinearGradient(
      begin: Alignment.topCenter,
      end: Alignment.bottomCenter,
      colors: [slide.primary, slide.secondary],
    ).createShader(const Rect.fromLTWH(0, 0, 320, 580));
    canvas.drawRect(const Rect.fromLTWH(0, 0, 320, 580), paint);
    paint.shader = null;

    switch (slide.scene) {
      case _SceneKind.market:
        _drawMarket(canvas, paint, pulse);
      case _SceneKind.compare:
        _drawCompare(canvas, paint, pulse);
      case _SceneKind.tracking:
        _drawTracking(canvas, paint, pulse);
    }

    paint.color = slide.bottom;
    canvas.drawRect(const Rect.fromLTWH(0, 400, 320, 180), paint);
    _drawText(canvas, slide.titleLine1, const Offset(24, 445), 26, Colors.white, FontWeight.w800);
    _drawText(canvas, slide.titleLine2, const Offset(24, 478), 26, Colors.white, FontWeight.w800);
    _drawText(canvas, slide.subtitleLine1, const Offset(24, 510), 13, slide.muted, FontWeight.w500);
    _drawText(canvas, slide.subtitleLine2, const Offset(24, 528), 13, slide.muted, FontWeight.w500);

    for (var i = 0; i < 3; i++) {
      paint.color = i == index ? const Color(0xFF1A8C55) : Colors.white.withValues(alpha: 0.3);
      canvas.drawCircle(Offset(140 + i * 20, 558), i == index ? 5 : 4, paint);
    }
  }

  void _drawMarket(Canvas canvas, Paint paint, double pulse) {
    paint.color = const Color(0xFF2D8F62).withValues(alpha: 0.5);
    canvas.drawPath(
      Path()
        ..moveTo(0, 0)
        ..lineTo(320, 0)
        ..lineTo(320, 180)
        ..lineTo(0, 320)
        ..close(),
      paint,
    );
    _drawSparkles(canvas, paint, const Color(0xFFA8E6C8));

    paint.color = const Color(0xFF0A3D26);
    canvas.drawRect(const Rect.fromLTWH(0, 330, 320, 100), paint);
    paint.color = const Color(0xFF071F14);
    canvas.drawRect(const Rect.fromLTWH(0, 380, 320, 20), paint);

    paint.color = const Color(0xFFF5C842);
    canvas.drawPath(
      Path()
        ..moveTo(20, 200)
        ..lineTo(300, 200)
        ..lineTo(310, 230)
        ..lineTo(10, 230)
        ..close(),
      paint,
    );
    paint.color = const Color(0xFFE8A800);
    canvas.drawRect(const Rect.fromLTWH(10, 228, 300, 8), paint);
    for (var x = 10.0; x < 290; x += 36) {
      paint.color = const Color(0xFFE8A800).withValues(alpha: 0.6);
      canvas.drawRect(Rect.fromLTWH(x, 200, 18, 38), paint);
      paint.color = const Color(0xFFF5C842);
      canvas.drawPath(Path()..moveTo(x, 236)..lineTo(x + 15, 256)..lineTo(x + 30, 236)..close(), paint);
    }

    paint.color = const Color(0xFF8B4513);
    canvas.drawRRect(RRect.fromRectAndRadius(const Rect.fromLTWH(15, 290, 290, 45), const Radius.circular(4)), paint);
    paint.color = const Color(0xFFA0522D);
    canvas.drawRRect(RRect.fromRectAndRadius(const Rect.fromLTWH(15, 290, 290, 8), const Radius.circular(2)), paint);

    paint.color = const Color(0xFFC8A96E);
    canvas.drawOval(Rect.fromCenter(center: Offset(60, 290 - pulse * 3), width: 60, height: 36), paint);
    paint.color = const Color(0xFFE63A2A);
    for (final point in const [Offset(120, 288), Offset(138, 291), Offset(127, 278)]) {
      canvas.drawCircle(point.translate(0, -pulse * 2), 10, paint);
    }
    paint.color = const Color(0xFFC8A070);
    canvas.drawOval(Rect.fromCenter(center: const Offset(185, 296), width: 50, height: 24), paint);
    paint.color = const Color(0xFFF5F0E0);
    for (final point in const [Offset(175, 292), Offset(190, 290), Offset(185, 300)]) {
      canvas.drawOval(Rect.fromCenter(center: point, width: 15, height: 11), paint);
    }
    paint.color = const Color(0xFFF0E0B0);
    canvas.drawOval(Rect.fromCenter(center: Offset(260, 293 + pulse), width: 36, height: 24), paint);
    canvas.drawCircle(Offset(270, 285 + pulse), 8, paint);
    paint.color = const Color(0xFFF5C060);
    canvas.drawPath(Path()..moveTo(278, 283)..lineTo(285, 285)..lineTo(278, 287)..close(), paint);

    paint.color = const Color(0xFF0D4A31).withValues(alpha: 0.86);
    canvas.drawRRect(RRect.fromRectAndRadius(Rect.fromLTWH(195, 110 - pulse * 5, 105, 50), const Radius.circular(10)), paint);
    paint.color = const Color(0xFF1A8C55);
    canvas.drawCircle(Offset(215, 135 - pulse * 5), 12, paint);
    _drawCheck(canvas, Offset(215, 135 - pulse * 5), 1.0);
    _drawText(canvas, 'Verified', Offset(232, 131 - pulse * 5), 11, Colors.white, FontWeight.w800);
    _drawText(canvas, 'Trusted Seller', Offset(232, 146 - pulse * 5), 10, const Color(0xFF7BC99A), FontWeight.w500);

    _drawWheat(canvas, const Offset(45, 180), 0.75);
    _drawWheat(canvas, const Offset(80, 185), 0.72);
    _drawSun(canvas, Offset(270, 55), 1 + pulse * 0.04);
  }

  void _drawCompare(Canvas canvas, Paint paint, double pulse) {
    paint.color = const Color(0xFF2060A0).withValues(alpha: 0.3);
    canvas.drawPath(Path()..moveTo(320, 0)..lineTo(320, 250)..lineTo(60, 0)..close(), paint);

    paint.color = const Color(0xFF0A1F3A);
    canvas.drawRRect(RRect.fromRectAndRadius(Rect.fromLTWH(80, 60 + pulse * 3, 160, 290), const Radius.circular(18)), paint);
    paint.color = const Color(0xFF1A3A66);
    canvas.drawRRect(RRect.fromRectAndRadius(Rect.fromLTWH(87, 67 + pulse * 3, 146, 275), const Radius.circular(12)), paint);
    paint.color = const Color(0xFF0E2240);
    canvas.drawRRect(RRect.fromRectAndRadius(Rect.fromLTWH(87, 67 + pulse * 3, 146, 38), const Radius.circular(12)), paint);
    _drawText(canvas, 'Agritec', Offset(160, 91 + pulse * 3), 10, const Color(0xFF8AB4E0), FontWeight.w700, center: true);

    _sellerCard(canvas, paint, Rect.fromLTWH(95, 115 + pulse * 3, 126, 55), 'JF', 'Johnson Farm', 'NGN 2,400/bag', true);
    _sellerCard(canvas, paint, Rect.fromLTWH(95, 178 + pulse * 3, 126, 45), 'AV', 'Adeola Vegs', 'NGN 1,900/bag', false);
    _sellerCard(canvas, paint, Rect.fromLTWH(95, 231 + pulse * 3, 126, 45), 'BG', 'Bello Grains', '2 variants', false);
    paint.color = const Color(0xFF1A8C55);
    canvas.drawRRect(RRect.fromRectAndRadius(Rect.fromLTWH(100, 284 + pulse * 3, 116, 24), const Radius.circular(10)), paint);
    _drawText(canvas, 'Add to Cart', Offset(158, 300 + pulse * 3), 9, Colors.white, FontWeight.w800, center: true);

    paint.color = const Color(0xFFF5C842);
    canvas.drawRRect(RRect.fromRectAndRadius(Rect.fromLTWH(210, 80 - pulse * 5, 82, 44), const Radius.circular(10)), paint);
    _drawText(canvas, 'BEST PRICE', Offset(251, 96 - pulse * 5), 9, const Color(0xFF5A3A00), FontWeight.w800, center: true);
    _drawText(canvas, '-10%', Offset(251, 112 - pulse * 5), 18, const Color(0xFF3A2400), FontWeight.w900, center: true);

    _drawTruck(canvas, Offset(15 + pulse * 10, 230));
    _drawSparkles(canvas, paint, const Color(0xFF8AB4E0));
  }

  void _drawTracking(Canvas canvas, Paint paint, double pulse) {
    paint.color = const Color(0xFFD48A20).withValues(alpha: 0.3);
    canvas.drawPath(Path()..moveTo(0, 0)..lineTo(200, 0)..lineTo(0, 250)..close(), paint);

    final road = Paint()
      ..color = const Color(0xFFF0C060).withValues(alpha: 0.42)
      ..strokeWidth = 4
      ..strokeCap = StrokeCap.round
      ..style = PaintingStyle.stroke;
    canvas.drawPath(Path()..moveTo(160, 380)..quadraticBezierTo(60, 320, 100, 240)..quadraticBezierTo(140, 160, 200, 120)..quadraticBezierTo(250, 85, 280, 60), road);

    final line = Paint()
      ..color = const Color(0xFFF0C060).withValues(alpha: 0.5)
      ..strokeWidth = 2
      ..strokeCap = StrokeCap.round;
    canvas.drawLine(const Offset(75, 90), const Offset(75, 370), line);
    _timelineStep(canvas, paint, const Offset(75, 100), 'Order Placed', true);
    _timelineStep(canvas, paint, const Offset(75, 170), 'Seller Confirmed', true);
    _activeTransit(canvas, paint, Offset(75, 240), pulse);
    _pendingStep(canvas, paint, const Offset(75, 315));

    paint.color = const Color(0xFF5A3000).withValues(alpha: 0.86);
    canvas.drawRRect(RRect.fromRectAndRadius(Rect.fromLTWH(190, 165 - pulse * 4, 110, 60), const Radius.circular(12)), paint);
    _drawText(canvas, 'Farmer Musa', Offset(245, 187 - pulse * 4), 9, const Color(0xFFF5D890), FontWeight.w500, center: true);
    _drawText(canvas, '"Your grains are', Offset(245, 202 - pulse * 4), 10, Colors.white, FontWeight.w500, center: true);
    _drawText(canvas, 'packed & ready"', Offset(245, 216 - pulse * 4), 10, Colors.white, FontWeight.w500, center: true);

    paint.color = const Color(0xFF1A3A1A).withValues(alpha: 0.86);
    canvas.drawRRect(RRect.fromRectAndRadius(Rect.fromLTWH(20, 330 + pulse * 4, 130, 40), const Radius.circular(10)), paint);
    paint.color = const Color(0xFF1A8C55);
    canvas.drawCircle(Offset(38, 350 + pulse * 4), 8, paint);
    _drawText(canvas, 'Live Update', Offset(55, 347 + pulse * 4), 9, const Color(0xFF7BC99A), FontWeight.w700);
    _drawText(canvas, 'Driver 10min away', Offset(55, 360 + pulse * 4), 8, const Color(0xFFC0E0C0), FontWeight.w500);
  }

  void _drawSparkles(Canvas canvas, Paint paint, Color color) {
    paint.color = color.withValues(alpha: 0.55);
    for (final point in const [Offset(260, 40), Offset(285, 70), Offset(40, 55), Offset(70, 30), Offset(200, 25), Offset(30, 180), Offset(280, 220)]) {
      canvas.drawCircle(point, 1.6, paint);
    }
  }

  void _drawSun(Canvas canvas, Offset center, double scale) {
    final paint = Paint()..color = const Color(0xFFF5C842).withValues(alpha: 0.18);
    canvas.drawCircle(center, 30 * scale, paint);
    paint.color = const Color(0xFFF5C842).withValues(alpha: 0.8);
    canvas.drawCircle(center, 12 * scale, paint);
  }

  void _drawWheat(Canvas canvas, Offset base, double scale) {
    final paint = Paint()
      ..color = const Color(0xFFF5C842)
      ..strokeWidth = 2
      ..strokeCap = StrokeCap.round;
    canvas.drawLine(base, base.translate(0, -50 * scale), paint);
    final fill = Paint()..color = const Color(0xFFF5C842);
    for (var i = 0; i < 3; i++) {
      final y = base.dy - (53 - i * 12) * scale;
      canvas.drawOval(Rect.fromCenter(center: Offset(base.dx, y), width: 10 * scale, height: 16 * scale), fill);
      canvas.drawOval(Rect.fromCenter(center: Offset(base.dx - 5 * scale, y + 8), width: 8 * scale, height: 14 * scale), fill);
      canvas.drawOval(Rect.fromCenter(center: Offset(base.dx + 5 * scale, y + 8), width: 8 * scale, height: 14 * scale), fill);
    }
  }

  void _sellerCard(Canvas canvas, Paint paint, Rect rect, String initials, String name, String meta, bool active) {
    paint.color = active ? const Color(0xFF1E4A80) : const Color(0xFF152D52);
    canvas.drawRRect(RRect.fromRectAndRadius(rect, const Radius.circular(8)), paint);
    paint.color = active ? const Color(0xFF2D6A3A) : const Color(0xFF3A5A7A);
    canvas.drawCircle(Offset(rect.left + 17, rect.top + 15), 9, paint);
    _drawText(canvas, initials, Offset(rect.left + 17, rect.top + 19), 8, Colors.white, FontWeight.w700, center: true);
    _drawText(canvas, name, Offset(rect.left + 32, rect.top + 14), 9, Colors.white, FontWeight.w800);
    _drawText(canvas, meta, Offset(rect.left + 7, rect.bottom - 9), 8, active ? const Color(0xFFF5C842) : const Color(0xFF8AB4E0), FontWeight.w500);
  }

  void _drawTruck(Canvas canvas, Offset origin) {
    final paint = Paint()..color = const Color(0xFF1E4A80);
    canvas.drawRRect(RRect.fromRectAndRadius(Rect.fromLTWH(origin.dx, origin.dy + 10, 55, 28), const Radius.circular(4)), paint);
    paint.color = const Color(0xFF1A3A72);
    canvas.drawRRect(RRect.fromRectAndRadius(Rect.fromLTWH(origin.dx + 40, origin.dy + 5, 28, 33), const Radius.circular(3)), paint);
    paint.color = const Color(0xFF0A1F3A);
    canvas.drawCircle(Offset(origin.dx + 12, origin.dy + 40), 7, paint);
    canvas.drawCircle(Offset(origin.dx + 55, origin.dy + 40), 7, paint);
  }

  void _timelineStep(Canvas canvas, Paint paint, Offset center, String label, bool done) {
    paint.color = done ? const Color(0xFF1A8C55) : const Color(0xFF7A4200);
    canvas.drawCircle(center, 18, paint);
    _drawCheck(canvas, center, 1.2);
    paint.color = const Color(0xFF7A4200).withValues(alpha: 0.6);
    canvas.drawRRect(RRect.fromRectAndRadius(Rect.fromLTWH(100, center.dy - 15, 170, 30), const Radius.circular(8)), paint);
    _drawText(canvas, label, Offset(115, center.dy + 5), 12, const Color(0xFFF5E0B0), FontWeight.w800);
  }

  void _activeTransit(Canvas canvas, Paint paint, Offset center, double pulse) {
    paint.color = const Color(0xFFF5C842).withValues(alpha: 0.18);
    canvas.drawCircle(center, 24 + pulse * 8, paint);
    paint.color = const Color(0xFFF5C842);
    canvas.drawCircle(center, 18, paint);
    paint.color = const Color(0xFF7A4200);
    canvas.drawRRect(RRect.fromRectAndRadius(Rect.fromCenter(center: center.translate(-2, 0), width: 20, height: 10), const Radius.circular(2)), paint);
    paint.color = const Color(0xFFF5C842).withValues(alpha: 0.2);
    canvas.drawRRect(RRect.fromRectAndRadius(const Rect.fromLTWH(100, 225, 160, 30), const Radius.circular(8)), paint);
    _drawText(canvas, 'In Transit', const Offset(115, 244), 12, Colors.white, FontWeight.w800);
    _drawText(canvas, 'On the way - ETA 2hrs', const Offset(115, 257), 9, const Color(0xFFF5D890), FontWeight.w500);
  }

  void _pendingStep(Canvas canvas, Paint paint, Offset center) {
    paint.color = const Color(0xFF7A4200).withValues(alpha: 0.8);
    canvas.drawCircle(center, 18, paint);
    _drawText(canvas, '4', center.translate(0, 5), 16, const Color(0xFFF0C060), FontWeight.w700, center: true);
    paint.color = const Color(0xFF5A3000).withValues(alpha: 0.45);
    canvas.drawRRect(RRect.fromRectAndRadius(const Rect.fromLTWH(100, 300, 160, 30), const Radius.circular(8)), paint);
    _drawText(canvas, 'Delivered', const Offset(115, 319), 12, const Color(0xFFC08040), FontWeight.w800);
  }

  void _drawCheck(Canvas canvas, Offset center, double scale) {
    final paint = Paint()
      ..color = Colors.white
      ..strokeWidth = 2 * scale
      ..strokeCap = StrokeCap.round
      ..style = PaintingStyle.stroke;
    canvas.drawPath(
      Path()
        ..moveTo(center.dx - 6 * scale, center.dy)
        ..lineTo(center.dx - 2 * scale, center.dy + 5 * scale)
        ..lineTo(center.dx + 8 * scale, center.dy - 6 * scale),
      paint,
    );
  }

  void _drawText(
    Canvas canvas,
    String text,
    Offset offset,
    double size,
    Color color,
    FontWeight weight, {
    bool center = false,
  }) {
    final textPainter = TextPainter(
      text: TextSpan(
        text: text,
        style: TextStyle(
          color: color,
          fontSize: size,
          fontWeight: weight,
          fontFamily: size >= 20 ? 'Georgia' : null,
        ),
      ),
      textDirection: TextDirection.ltr,
    )..layout(maxWidth: 280);
    textPainter.paint(
      canvas,
      center ? Offset(offset.dx - textPainter.width / 2, offset.dy - textPainter.height) : Offset(offset.dx, offset.dy - textPainter.height),
    );
  }

  @override
  bool shouldRepaint(covariant _OnboardingScenePainter oldDelegate) =>
      oldDelegate.t != t || oldDelegate.index != index || oldDelegate.slide != slide;
}

enum _SceneKind { market, compare, tracking }

class _SlideData {
  const _SlideData({
    required this.titleLine1,
    required this.titleLine2,
    required this.subtitleLine1,
    required this.subtitleLine2,
    required this.primary,
    required this.secondary,
    required this.bottom,
    required this.accent,
    required this.muted,
    required this.scene,
  });

  final String titleLine1;
  final String titleLine2;
  final String subtitleLine1;
  final String subtitleLine2;
  final Color primary;
  final Color secondary;
  final Color bottom;
  final Color accent;
  final Color muted;
  final _SceneKind scene;
}
