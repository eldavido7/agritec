package com.example.agritec_mobile

import io.flutter.embedding.engine.FlutterEngine
import io.flutter.embedding.android.FlutterActivity
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    companion object {
        private const val CHANNEL = "agritec/config"
        private const val METHOD_GET_GOOGLE_MAPS_KEY = "getGoogleMapsApiKey"
    }

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL)
            .setMethodCallHandler { call, result ->
                when (call.method) {
                    METHOD_GET_GOOGLE_MAPS_KEY -> {
                        result.success(BuildConfig.GOOGLE_MAPS_ANDROID_API_KEY)
                    }

                    else -> result.notImplemented()
                }
            }
    }
}
