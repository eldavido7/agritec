class StartupState {
  const StartupState({
    required this.hasOnboarded,
    required this.isAuthenticated,
  });

  final bool hasOnboarded;
  final bool isAuthenticated;
}
