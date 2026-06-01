import 'package:agritec_mobile/features/startup/application/startup_state.dart';
import 'package:agritec_mobile/core/state/session_refresh.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

const _onboardingKey = 'buyer_has_onboarded';
const _sessionKey = 'buyer_mock_session';
const _guestPromptLastShownKey = 'buyer_guest_prompt_last_shown';
const _guestPromptInterval = Duration(hours: 12);

final startupControllerProvider =
    AsyncNotifierProvider<StartupController, StartupState>(
      StartupController.new,
    );

class StartupController extends AsyncNotifier<StartupState> {
  @override
  Future<StartupState> build() async {
    final prefs = await SharedPreferences.getInstance();
    return StartupState(
      hasOnboarded: prefs.getBool(_onboardingKey) ?? false,
      isAuthenticated: prefs.getBool(_sessionKey) ?? false,
    );
  }

  Future<void> completeOnboarding() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_onboardingKey, true);
    final current = state.asData?.value;
    if (current == null) return;
    state = AsyncData(
      StartupState(
        hasOnboarded: true,
        isAuthenticated: current.isAuthenticated,
      ),
    );
  }

  Future<void> signIn() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_sessionKey, true);
    final current = state.asData?.value;
    if (current == null) return;
    state = AsyncData(
      StartupState(hasOnboarded: current.hasOnboarded, isAuthenticated: true),
    );
    refreshBuyerScopedState(ref);
  }

  Future<void> signOut() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_sessionKey, false);
    final current = state.asData?.value;
    if (current == null) return;
    state = AsyncData(
      StartupState(hasOnboarded: current.hasOnboarded, isAuthenticated: false),
    );
    refreshBuyerScopedState(ref);
  }

  Future<bool> shouldShowGuestPrompt() async {
    final current = state.asData?.value;
    if (current == null || current.isAuthenticated) return false;
    final prefs = await SharedPreferences.getInstance();
    final lastShown = prefs.getInt(_guestPromptLastShownKey);
    if (lastShown == null) return true;
    final elapsed = DateTime.now().difference(
      DateTime.fromMillisecondsSinceEpoch(lastShown),
    );
    return elapsed >= _guestPromptInterval;
  }

  Future<void> markGuestPromptShown() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(
      _guestPromptLastShownKey,
      DateTime.now().millisecondsSinceEpoch,
    );
  }
}
