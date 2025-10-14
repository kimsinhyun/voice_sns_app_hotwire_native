package com.example.voice_talk_android

import android.net.Uri
import dev.hotwire.navigation.config.HotwireNavigation
import dev.hotwire.navigation.routing.RouteDecisionHandler

/**
 * 앱 내부 URL (자체 도메인)을 앱 내에서 처리하는 Handler
 */
class AppNavigationRouteDecisionHandler : RouteDecisionHandler {
    
    override fun shouldNavigate(url: String): Boolean {
        val uri = Uri.parse(url)
        val host = uri.host ?: return false
        
        // 자체 도메인인지 확인 (localhost, 개발 서버, 프로덕션 서버 등)
        return host == "localhost" || 
               host == "10.0.2.2" || 
               host.contains("voice-talk") ||
               host.contains("192.168.")  // 개발 중 로컬 네트워크
    }
}

