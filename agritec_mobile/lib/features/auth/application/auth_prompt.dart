import 'package:agritec_mobile/features/auth/presentation/sign_in_page.dart';
import 'package:agritec_mobile/features/auth/presentation/sign_up_page.dart';
import 'package:agritec_mobile/features/auth/application/local_auth_provider.dart';
import 'package:agritec_mobile/features/startup/application/startup_controller.dart';
import 'package:agritec_mobile/core/localization/app_localizations.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

bool isBuyerAuthenticated(WidgetRef ref) {
  final startupAuth = ref.watch(startupControllerProvider).maybeWhen(
        data: (state) => state.isAuthenticated,
        orElse: () => false,
      );
  return startupAuth && ref.watch(currentBuyerUserProvider) != null;
}

Future<void> showBuyerAuthPrompt(
  BuildContext context,
  WidgetRef ref, {
  required String message,
  String? title,
}) async {
  await ref.read(startupControllerProvider.notifier).markGuestPromptShown();
  if (!context.mounted) return;

  await showDialog<void>(
    context: context,
    builder: (dialogContext) => Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(18, 18, 18, 14),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const CircleAvatar(
              radius: 25,
              backgroundColor: Color(0xFFE4F4EC),
              child: Icon(
                Icons.storefront_rounded,
                size: 29,
                color: Color(0xFF136A43),
              ),
            ),
            const SizedBox(height: 12),
            Text(
              title ?? ref.tr('auth.welcomeTitle'),
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 19, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 6),
            Text(
              message,
              textAlign: TextAlign.center,
              style: const TextStyle(color: Color(0xFF65706B), height: 1.35),
            ),
            const SizedBox(height: 14),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () {
                  Navigator.of(dialogContext).pop();
                  context.push(SignInPage.routePath);
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF136A43),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: Text(ref.tr('auth.signIn')),
              ),
            ),
            const SizedBox(height: 8),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: () {
                  Navigator.of(dialogContext).pop();
                  context.push(SignUpPage.routePath);
                },
                child: Text(ref.tr('auth.createAccount')),
              ),
            ),
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(),
              child: Text(ref.tr('auth.continueGuest')),
            ),
          ],
        ),
      ),
    ),
  );
}

Future<void> showWelcomeGuestPromptIfNeeded(
  BuildContext context,
  WidgetRef ref,
) async {
  final shouldShow = await ref
      .read(startupControllerProvider.notifier)
      .shouldShowGuestPrompt();
  if (!shouldShow || !context.mounted) return;
  await showBuyerAuthPrompt(
    context,
    ref,
    title: ref.tr('auth.welcomeTitle'),
    message: ref.tr('auth.guestWelcomeMessage'),
  );
}

class AuthRequiredPage extends ConsumerWidget {
  const AuthRequiredPage({
    super.key,
    required this.title,
    required this.message,
    this.onBack,
  });

  final String title;
  final String message;
  final VoidCallback? onBack;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      backgroundColor: const Color(0xFFEAF1ED),
      appBar: AppBar(
        leading: onBack == null
            ? null
            : IconButton(
                icon: const Icon(Icons.arrow_back_rounded),
                onPressed: onBack,
              ),
        title: Text(title),
      ),
      body: Center(
        child: Container(
          margin: const EdgeInsets.all(18),
          padding: const EdgeInsets.fromLTRB(18, 18, 18, 14),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(18),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const CircleAvatar(
                radius: 25,
                backgroundColor: Color(0xFFE4F4EC),
                child: Icon(
                  Icons.lock_outline_rounded,
                  size: 28,
                  color: Color(0xFF136A43),
                ),
              ),
              const SizedBox(height: 12),
              Text(
                message,
                textAlign: TextAlign.center,
                style: const TextStyle(color: Color(0xFF65706B), height: 1.35),
              ),
              const SizedBox(height: 14),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () => context.push(SignInPage.routePath),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF136A43),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: Text(ref.tr('auth.signIn')),
                ),
              ),
              TextButton(
                onPressed: () => context.push(SignUpPage.routePath),
                child: Text(ref.tr('auth.createAccount')),
              ),
            ],
          ),
        ),
      ),
    );
  }
}



