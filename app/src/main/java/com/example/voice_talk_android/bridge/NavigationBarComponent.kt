package com.example.voice_talk_android.bridge

import android.util.Log
import android.view.View
import com.google.android.material.appbar.AppBarLayout
import dev.hotwire.core.bridge.BridgeComponent
import dev.hotwire.core.bridge.BridgeDelegate
import dev.hotwire.core.bridge.Message
import dev.hotwire.navigation.destinations.HotwireDestination
import kotlinx.serialization.Serializable

class NavigationBarComponent(
    name: String,
    private val delegate: BridgeDelegate<HotwireDestination>
) : BridgeComponent<HotwireDestination>(name, delegate) {

    companion object {
        private const val TAG = "NavigationBar"
    }

    override fun onReceive(message: Message) {
        Log.d(TAG, "📱 NavigationBarComponent received: ${message.event}")

        when (message.event) {
            "hide" -> handleHide(message)
            "show" -> handleShow(message)
            else -> Log.w(TAG, "❌ Unknown event: ${message.event}")
        }
    }

    // MARK: - Toolbar 숨기기

    private fun handleHide(message: Message) {
        Log.d(TAG, "📱 Hiding toolbar...")

        try {
            val fragment = delegate.destination.fragment
            Log.d(TAG, "  - Fragment: ${fragment::class.simpleName}")
            Log.d(TAG, "  - Fragment.view: ${fragment.view}")
            
            val appBar = fragment.view?.findViewById<AppBarLayout>(com.example.voice_talk_android.R.id.app_bar)
            Log.d(TAG, "  - AppBar found: ${appBar != null}")
            
            if (appBar != null) {
                Log.d(TAG, "  - AppBar current visibility: ${appBar.visibility}")
                appBar.visibility = View.GONE
                Log.d(TAG, "  - AppBar new visibility: ${appBar.visibility}")
                Log.d(TAG, "✅ Toolbar hidden via findViewById")
                replyTo(message.event, SuccessResponse(true))
            } else {
                Log.w(TAG, "⚠️ AppBar not found - fragment.view might be null or layout doesn't have app_bar")
                Log.w(TAG, "  - Trying to find all views in fragment...")
                fragment.view?.let { v ->
                    Log.w(TAG, "  - Fragment view ID: ${v.id}")
                    Log.w(TAG, "  - Fragment view class: ${v::class.simpleName}")
                }
                replyTo(message.event, SuccessResponse(false))
            }
        } catch (e: Exception) {
            Log.e(TAG, "❌ Failed to hide toolbar: ${e.message}")
            e.printStackTrace()
            replyTo(message.event, SuccessResponse(false))
        }
    }

    // MARK: - Toolbar 표시

    private fun handleShow(message: Message) {
        Log.d(TAG, "📱 Showing toolbar...")

        try {
            val fragment = delegate.destination.fragment
            val appBar = fragment.view?.findViewById<AppBarLayout>(com.example.voice_talk_android.R.id.app_bar)
            
            if (appBar != null) {
                appBar.visibility = View.VISIBLE
                Log.d(TAG, "✅ Toolbar shown via findViewById")
                replyTo(message.event, SuccessResponse(true))
            } else {
                Log.w(TAG, "⚠️ AppBar not found")
                replyTo(message.event, SuccessResponse(false))
            }
        } catch (e: Exception) {
            Log.e(TAG, "❌ Failed to show toolbar: ${e.message}")
            replyTo(message.event, SuccessResponse(false))
        }
    }

    // MARK: - Response Data Classes

    @Serializable
    data class SuccessResponse(val success: Boolean)
}

