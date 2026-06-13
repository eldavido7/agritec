import 'dart:async';
import 'dart:math' as math;

import 'package:agritec_mobile/features/checkout/application/checkout_providers.dart';
import 'package:agritec_mobile/features/checkout/presentation/payment_callback_page.dart';
import 'package:agritec_mobile/features/home/application/home_providers.dart';
import 'package:agritec_mobile/features/home/presentation/main_shell_page.dart';
import 'package:agritec_mobile/features/onboarding/presentation/onboarding_page.dart';
import 'package:agritec_mobile/features/startup/application/startup_controller.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

class SplashPage extends ConsumerStatefulWidget {
  const SplashPage({super.key});

  static const routeName = 'splash';
  static const routePath = '/';

  @override
  ConsumerState<SplashPage> createState() => _SplashPageState();
}

class _SplashPageState extends ConsumerState<SplashPage>
    with SingleTickerProviderStateMixin {
  static const _minimumSplashDuration = Duration(seconds: 3);

  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1800),
    )..repeat(reverse: true);
    _resolveStartup();
  }

  Future<void> _resolveStartup() async {
    final start = DateTime.now();
    final startup = await ref.read(startupControllerProvider.future);
    final repository = await ref.read(homeRepositoryProvider.future);

    try {
      await repository.getSnapshot();
    } catch (_) {
      // Keep the current splash flow resilient. The home providers will still
      // attempt their own refresh and can surface any downstream issues.
    }

    final elapsed = DateTime.now().difference(start);
    if (elapsed < _minimumSplashDuration) {
      await Future<void>.delayed(_minimumSplashDuration - elapsed);
    }
    if (!mounted) return;

    if (!startup.hasOnboarded) {
      context.go(OnboardingPage.routePath);
      return;
    }

    if (startup.isAuthenticated) {
      final pendingSession = await ref.read(checkoutProvider.notifier).getPendingPaymentSession();
      if (!mounted) return;
      if (pendingSession != null) {
        context.goNamed(
          PaymentCallbackPage.routeName,
          queryParameters: {
            'reference': pendingSession.reference,
            'orderId': pendingSession.orderId,
          },
        );
        return;
      }
    }

    context.go(MainShellPage.routePath);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0D3D1E),
      body: SizedBox.expand(
        child: AnimatedBuilder(
          animation: _controller,
          builder: (context, _) {
            return CustomPaint(
              painter: _SplashScenePainter(_controller.value),
              child: const SizedBox.expand(),
            );
          },
        ),
      ),
    );
  }
}

class _SplashScenePainter extends CustomPainter {
  const _SplashScenePainter(this.t);

  final double t;

  @override
  void paint(Canvas canvas, Size size) {
    final scale = math.min(size.width / 320, size.height / 620);
    final dx = (size.width - 320 * scale) / 2;
    final dy = (size.height - 620 * scale) / 2;
    canvas.save();
    canvas.translate(dx, dy);
    canvas.scale(scale, scale);
    final pulse = math.sin(t * math.pi);

    final paint = Paint();
    paint.shader = const LinearGradient(
      begin: Alignment.topCenter,
      end: Alignment.bottomCenter,
      colors: [Color(0xFF0D3D1E), Color(0xFF1A6B42), Color(0xFF2D9660)],
      stops: [0, 0.55, 1],
    ).createShader(const Rect.fromLTWH(0, 0, 320, 620));
    canvas.drawRect(const Rect.fromLTWH(0, 0, 320, 620), paint);

    paint
      ..shader = null
      ..color = const Color(0xFF13562E).withValues(alpha: 0.25);
    canvas.drawRect(const Rect.fromLTWH(0, 180, 320, 180), paint);
    paint.color = const Color(0xFF1E7A48).withValues(alpha: 0.15);
    canvas.drawPath(
      Path()
        ..moveTo(320, 0)
        ..lineTo(320, 300)
        ..lineTo(160, 0)
        ..close(),
      paint,
    );

    final sunAlpha = 0.88 + pulse * 0.08;
    for (final ring in const [
      (120.0, 0.06),
      (80.0, 0.09),
      (52.0, 0.18),
    ]) {
      paint.color = const Color(0xFFF5C842).withValues(alpha: ring.$2);
      canvas.drawCircle(const Offset(160, 245), ring.$1 + pulse * 4, paint);
    }
    paint.color = const Color(0xFFFFE37A).withValues(alpha: 0.7 * sunAlpha);
    canvas.drawCircle(const Offset(160, 245), 32 + pulse * 2, paint);
    paint.color = const Color(0xFFFFF4A0).withValues(alpha: sunAlpha);
    canvas.drawCircle(const Offset(160, 245), 20 + pulse, paint);

    final rayPaint = Paint()
      ..color = const Color(0xFFFFE37A).withValues(alpha: 0.65)
      ..strokeWidth = 2.4
      ..strokeCap = StrokeCap.round;
    for (var i = 0; i < 8; i++) {
      final angle = (math.pi * 2 / 8) * i;
      final start = Offset(160 + math.cos(angle) * 45, 245 + math.sin(angle) * 45);
      final end = Offset(160 + math.cos(angle) * 60, 245 + math.sin(angle) * 60);
      canvas.drawLine(start, end, rayPaint);
    }

    paint.color = const Color(0xFFA8E6C0).withValues(alpha: 0.4);
    for (final dot in const [
      Offset(70, 30),
      Offset(240, 45),
      Offset(290, 130),
      Offset(20, 140),
      Offset(305, 60),
      Offset(15, 80),
    ]) {
      canvas.drawCircle(dot, 1.6, paint);
    }

    paint.shader = const LinearGradient(
      begin: Alignment.topCenter,
      end: Alignment.bottomCenter,
      colors: [Color(0xFF0A2E15), Color(0xFF051508)],
    ).createShader(const Rect.fromLTWH(0, 340, 320, 280));
    canvas.drawRect(const Rect.fromLTWH(0, 340, 320, 280), paint);
    paint.shader = null;
    paint.color = const Color(0xFF0D4A22).withValues(alpha: 0.9);
    canvas.drawOval(Rect.fromCenter(center: const Offset(160, 342), width: 400, height: 36), paint);

    for (final x in [30.0, 46.0, 18.0, 295.0, 311.0, 282.0]) {
      _drawWheat(canvas, Offset(x, 340), 1 - ((x % 3) * 0.08));
    }

    paint.color = const Color(0xFF030C06);
    canvas.drawRect(const Rect.fromLTWH(0, 430, 320, 190), paint);
    paint.color = const Color(0xFF0D2E14).withValues(alpha: 0.62);
    canvas.drawRRect(
      RRect.fromRectAndRadius(const Rect.fromLTWH(55, 450, 210, 130), const Radius.circular(20)),
      paint,
    );

    _drawText(
      canvas,
      'FRESH FROM THE FARM',
      const Offset(160, 496),
      fontSize: 11,
      color: const Color(0xFF7BC99A),
      weight: FontWeight.w400,
      align: TextAlign.center,
      letterSpacing: 2.2,
    );
    _drawText(
      canvas,
      'Agritec',
      const Offset(160, 538),
      fontSize: 42,
      color: Colors.white,
      weight: FontWeight.w800,
      align: TextAlign.center,
      fontFamily: 'Georgia',
    );
    paint.color = const Color(0xFFF5C842).withValues(alpha: 0.72);
    canvas.drawRRect(
      RRect.fromRectAndRadius(const Rect.fromLTWH(110, 550, 100, 2), const Radius.circular(1)),
      paint,
    );
    for (final item in const [(152.0, Color(0xFF1A8C55)), (160.0, Color(0xFFF5C842)), (168.0, Color(0xFF1A8C55))]) {
      paint.color = item.$2.withValues(alpha: item.$1 == 160 ? 1 : 0.6);
      canvas.drawCircle(Offset(item.$1, 570), 3, paint);
    }

    _drawText(
      canvas,
      'LOADING',
      const Offset(160, 594),
      fontSize: 11,
      color: const Color(0xFF5A9A70),
      align: TextAlign.center,
      letterSpacing: 2,
    );
    paint.color = const Color(0xFF0D3D1E);
    canvas.drawRRect(
      RRect.fromRectAndRadius(const Rect.fromLTWH(100, 602, 120, 3), const Radius.circular(1.5)),
      paint,
    );
    paint.color = const Color(0xFF1A8C55).withValues(alpha: 0.9);
    canvas.drawRRect(
      RRect.fromRectAndRadius(Rect.fromLTWH(100, 602, 44 + pulse * 46, 3), const Radius.circular(1.5)),
      paint,
    );
    canvas.restore();
  }

  void _drawWheat(Canvas canvas, Offset base, double scale) {
    final paint = Paint()
      ..color = const Color(0xFFC8A030)
      ..strokeWidth = 2
      ..strokeCap = StrokeCap.round;
    canvas.drawLine(base, base.translate(0, -70 * scale), paint);
    final grainPaint = Paint()..color = const Color(0xFFC8A030);
    for (var i = 0; i < 4; i++) {
      final y = base.dy - (75 - i * 12) * scale;
      canvas.drawOval(Rect.fromCenter(center: Offset(base.dx, y), width: 9 * scale, height: 16 * scale), grainPaint);
      canvas.save();
      canvas.translate(base.dx - 6 * scale, y + 8 * scale);
      canvas.rotate(-0.35);
      canvas.drawOval(Rect.fromCenter(center: Offset.zero, width: 8 * scale, height: 14 * scale), grainPaint);
      canvas.restore();
      canvas.save();
      canvas.translate(base.dx + 6 * scale, y + 8 * scale);
      canvas.rotate(0.35);
      canvas.drawOval(Rect.fromCenter(center: Offset.zero, width: 8 * scale, height: 14 * scale), grainPaint);
      canvas.restore();
    }
  }

  void _drawText(
    Canvas canvas,
    String text,
    Offset center, {
    required double fontSize,
    required Color color,
    FontWeight weight = FontWeight.w500,
    TextAlign align = TextAlign.left,
    double letterSpacing = 0,
    String? fontFamily,
  }) {
    final painter = TextPainter(
      text: TextSpan(
        text: text,
        style: TextStyle(
          color: color,
          fontSize: fontSize,
          fontWeight: weight,
          letterSpacing: letterSpacing,
          fontFamily: fontFamily,
        ),
      ),
      textAlign: align,
      textDirection: TextDirection.ltr,
    )..layout(maxWidth: 320);
    painter.paint(canvas, Offset(center.dx - painter.width / 2, center.dy - painter.height));
  }

  @override
  bool shouldRepaint(covariant _SplashScenePainter oldDelegate) => oldDelegate.t != t;
}

