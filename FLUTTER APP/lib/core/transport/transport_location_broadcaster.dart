import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';

import '../api/api_client.dart';

class TransportLocationException implements Exception {
  const TransportLocationException(this.message);

  final String message;

  @override
  String toString() => message;
}

class TransportLocationBroadcaster {
  TransportLocationBroadcaster(this._apiClient);

  final ApiClient _apiClient;
  StreamSubscription<Position>? _subscription;
  bool _sendInFlight = false;

  bool get isRunning => _subscription != null;

  Future<void> start(String routeId) async {
    if (isRunning) return;
    if (!await Geolocator.isLocationServiceEnabled()) {
      throw const TransportLocationException(
        'Turn on device location services before starting route tracking.',
      );
    }
    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    if (permission == LocationPermission.denied ||
        permission == LocationPermission.deniedForever) {
      throw const TransportLocationException(
        'Location permission is required to broadcast the active route.',
      );
    }
    final settings = defaultTargetPlatform == TargetPlatform.android
        ? AndroidSettings(
            accuracy: LocationAccuracy.medium,
            distanceFilter: 50,
            intervalDuration: const Duration(seconds: 30),
            foregroundNotificationConfig: const ForegroundNotificationConfig(
              notificationTitle: 'School ERP route tracking',
              notificationText: 'The active bus route location is being shared.',
              notificationChannelName: 'Route tracking',
              setOngoing: true,
              enableWakeLock: false,
              enableWifiLock: false,
            ),
          )
        : const LocationSettings(
            accuracy: LocationAccuracy.medium,
            distanceFilter: 50,
          );
    _subscription = Geolocator.getPositionStream(
      locationSettings: settings,
    ).listen(
      (position) => unawaited(_send(routeId, position)),
      onError: (_) {},
      cancelOnError: false,
    );
  }

  Future<void> stop() async {
    await _subscription?.cancel();
    _subscription = null;
  }

  Future<void> _send(String routeId, Position position) async {
    if (_sendInFlight) return;
    _sendInFlight = true;
    try {
      await _apiClient.recordTransportLocation(
        routeId: routeId,
        latitude: position.latitude,
        longitude: position.longitude,
        accuracyMeters: position.accuracy,
        recordedAt: position.timestamp,
      );
    } on Object {
      // The next location fix retries naturally; route tracking stays active.
    } finally {
      _sendInFlight = false;
    }
  }
}
