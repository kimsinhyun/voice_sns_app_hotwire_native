package com.example.voice_talk_android

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.browser.customtabs.CustomTabsIntent
import dev.hotwire.navigation.routing.RouteDecisionHandler

/**
 * 외부 URL을 Chrome Custom Tabs로 여는 Handler
 */
class BrowserTabRouteDecisionHandler : RouteDecisionHandler {
    
    override fun shouldNavigate(url: String): Boolean {
        // false를 반환하면 이 Handler가 URL을 처리
        // 다른 Handler에서 처리하지 않은 URL만 여기로 옴
        return false
    }
    
    override fun navigate(url: String, context: Context) {
        // Chrome Custom Tabs로 외부 URL 열기
        try {
            val customTabsIntent = CustomTabsIntent.Builder()
                .setShowTitle(true)
                .build()
            
            customTabsIntent.launchUrl(context, Uri.parse(url))
            android.util.Log.d("BrowserTab", "🌐 Opening external URL: $url")
        } catch (e: Exception) {
            android.util.Log.e("BrowserTab", "❌ Failed to open URL: $url", e)
            
            // Fallback: 일반 브라우저로 열기
            try {
                val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                context.startActivity(intent)
            } catch (fallbackException: Exception) {
                android.util.Log.e("BrowserTab", "❌ Fallback also failed", fallbackException)
            }
        }
    }
}

