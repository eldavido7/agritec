import 'package:agritec_mobile/features/auth/presentation/forgot_password_page.dart';
import 'package:agritec_mobile/features/auth/presentation/sign_in_page.dart';
import 'package:agritec_mobile/features/auth/presentation/sign_up_page.dart';
import 'package:agritec_mobile/features/account/presentation/addresses_page.dart';
import 'package:agritec_mobile/features/checkout/presentation/checkout_page.dart';
import 'package:agritec_mobile/features/home/presentation/main_shell_page.dart';
import 'package:agritec_mobile/features/onboarding/presentation/onboarding_page.dart';
import 'package:agritec_mobile/features/orders/presentation/order_details_page.dart';
import 'package:agritec_mobile/features/orders/presentation/orders_page.dart';
import 'package:agritec_mobile/features/startup/presentation/splash_page.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

final appRouterProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: SplashPage.routePath,
    routes: [
      GoRoute(
        path: SplashPage.routePath,
        name: SplashPage.routeName,
        builder: (context, state) => const SplashPage(),
      ),
      GoRoute(
        path: OnboardingPage.routePath,
        name: OnboardingPage.routeName,
        builder: (context, state) => const OnboardingPage(),
      ),
      GoRoute(
        path: SignInPage.routePath,
        name: SignInPage.routeName,
        builder: (context, state) => const SignInPage(),
      ),
      GoRoute(
        path: SignUpPage.routePath,
        name: SignUpPage.routeName,
        builder: (context, state) => const SignUpPage(),
      ),
      GoRoute(
        path: ForgotPasswordPage.routePath,
        name: ForgotPasswordPage.routeName,
        builder: (context, state) => const ForgotPasswordPage(),
      ),
      GoRoute(
        path: MainShellPage.routePath,
        name: MainShellPage.routeName,
        builder: (context, state) => const MainShellPage(),
      ),
      GoRoute(
        path: AddressesPage.routePath,
        name: AddressesPage.routeName,
        builder: (context, state) => const AddressesPage(),
      ),
      GoRoute(
        path: OrdersPage.routePath,
        name: OrdersPage.routeName,
        builder: (context, state) => const OrdersPage(),
      ),
      GoRoute(
        path: OrderDetailsPage.routePath,
        name: OrderDetailsPage.routeName,
        builder: (context, state) =>
            OrderDetailsPage(orderId: state.pathParameters['orderId'] ?? ''),
      ),
      GoRoute(
        path: CheckoutPage.routePath,
        name: CheckoutPage.routeName,
        builder: (context, state) =>
            CheckoutPage(sellerId: state.pathParameters['sellerId'] ?? ''),
      ),
    ],
  );
});
