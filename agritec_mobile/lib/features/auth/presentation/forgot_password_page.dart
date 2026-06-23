import 'package:agritec_mobile/core/api/mobile_api.dart';
import 'package:agritec_mobile/core/constants/app_assets.dart';
import 'package:agritec_mobile/core/localization/app_localizations.dart';
import 'package:agritec_mobile/features/auth/application/local_auth_provider.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

class ForgotPasswordPage extends ConsumerStatefulWidget {
  const ForgotPasswordPage({super.key});

  static const routeName = 'forgot-password';
  static const routePath = '/forgot-password';

  @override
  ConsumerState<ForgotPasswordPage> createState() => _ForgotPasswordPageState();
}

class _ForgotPasswordPageState extends ConsumerState<ForgotPasswordPage> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  bool _submitting = false;
  bool _sent = false;
  String? _successMessage;

  @override
  void dispose() {
    _emailController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _submitting = true;
      _sent = false;
      _successMessage = null;
    });

    try {
      await ref
          .read(localAuthProvider.notifier)
          .forgotPassword(email: _emailController.text.trim());
      if (!mounted) return;
      setState(() {
        _submitting = false;
        _sent = true;
        _successMessage = ref.tr('auth.resetEmailSent');
      });
    } on MobileApiException catch (error) {
      if (!mounted) return;
      setState(() => _submitting = false);
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(error.message)));
    } catch (_) {
      if (!mounted) return;
      setState(() => _submitting = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(ref.tr('auth.unableResetEmail'))),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Color(0xFFEAF8F3), Color(0xFFF6F9F7)],
          ),
        ),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 460),
                child: Card(
                  child: Padding(
                    padding: const EdgeInsets.all(22),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Image.asset(AppAssets.logo, width: 52, height: 52),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Text(
                                ref.tr('auth.resetPassword'),
                                style: TextStyle(
                                  fontSize: 24,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text(
                          ref.tr('auth.resetPasswordSubtitle'),
                          style: TextStyle(color: Color(0xFF5B6661)),
                        ),
                        const SizedBox(height: 18),
                        Form(
                          key: _formKey,
                          child: TextFormField(
                            controller: _emailController,
                            decoration: InputDecoration(
                              labelText: ref.tr('common.emailAddress'),
                            ),
                            keyboardType: TextInputType.emailAddress,
                            validator: (value) {
                              if (value == null || value.trim().isEmpty) {
                                return ref.tr('auth.emailRequired');
                              }
                              if (!value.contains('@')) {
                                return ref.tr('auth.invalidEmail');
                              }
                              return null;
                            },
                          ),
                        ),
                        const SizedBox(height: 16),
                        if (_sent)
                          Container(
                            width: double.infinity,
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: const Color(0xFFE7F7F1),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Text(
                              _successMessage ??
                                  ref.tr('auth.resetEmailSent'),
                              style: const TextStyle(
                                color: Color(0xFF145A46),
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        const SizedBox(height: 16),
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton(
                            onPressed: _submitting ? null : _submit,
                            child: _submitting
                                ? const SizedBox(
                                    height: 20,
                                    width: 20,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                    ),
                                  )
                                : Text(ref.tr('auth.sendResetLink')),
                          ),
                        ),
                        const SizedBox(height: 8),
                        Center(
                          child: TextButton(
                            onPressed: () => context.pop(),
                            child: Text(ref.tr('auth.backToSignIn')),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
