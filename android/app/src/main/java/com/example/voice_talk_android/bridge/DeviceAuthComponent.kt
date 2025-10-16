package com.example.voice_talk_android.bridge

import android.provider.Settings
import dev.hotwire.core.bridge.BridgeComponent
import dev.hotwire.core.bridge.BridgeDelegate
import dev.hotwire.core.bridge.Message
import dev.hotwire.navigation.destinations.HotwireDestination

class DeviceAuthComponent(
    name: String,
    private val delegate: BridgeDelegate<HotwireDestination>
) : BridgeComponent<HotwireDestination>(name, delegate) {

    override fun onReceive(message: Message) {
        when (message.event) {
            "getDeviceId" -> handleGetDeviceId(message)
        }
    }

    private fun handleGetDeviceId(message: Message) {
        try {
            val context = delegate.destination.fragment.requireContext()
            val androidId = Settings.Secure.getString(
                context.contentResolver,
                Settings.Secure.ANDROID_ID
            )
            android.util.Log.d("DeviceAuthComponent", "✅ Android ID obtained: $androidId")
            replyTo(message.event, mapOf("deviceId" to androidId))
        } catch (e: Exception) {
            android.util.Log.e("DeviceAuthComponent", "❌ Failed to get Android ID: ${e.message}")
            replyTo(message.event, mapOf("error" to e.message))
        }
    }
}

