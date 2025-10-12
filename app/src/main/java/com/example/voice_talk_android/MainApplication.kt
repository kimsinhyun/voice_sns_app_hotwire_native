package com.example.voice_talk_android

import android.app.Application
import dev.hotwire.core.config.Hotwire

class MainApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        
        // Hotwire 디버그 설정 활성화
        Hotwire.config.debugLoggingEnabled = true
        Hotwire.config.webViewDebuggingEnabled = true
    }
}

