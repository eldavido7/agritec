import 'dart:async';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

final connectivityStatusProvider = StreamProvider<bool>((ref) async* {
  final connectivity = Connectivity();
  final initial = await connectivity.checkConnectivity();
  yield !initial.contains(ConnectivityResult.none);

  final controller = StreamController<bool>();
  final sub = connectivity.onConnectivityChanged.listen((results) {
    controller.add(!results.contains(ConnectivityResult.none));
  });

  ref.onDispose(() async {
    await sub.cancel();
    await controller.close();
  });

  yield* controller.stream;
});
