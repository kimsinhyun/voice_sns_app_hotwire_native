package com.example.voice_talk_android

import android.app.Application
import com.example.voice_talk_android.bridge.AudioRecorderComponent
import com.masilotti.bridgecomponents.shared.Bridgework
import dev.hotwire.core.bridge.BridgeComponentFactory
import dev.hotwire.core.bridge.KotlinXJsonConverter
import dev.hotwire.core.config.Hotwire
import dev.hotwire.core.turbo.config.PathConfiguration
import dev.hotwire.navigation.config.registerBridgeComponents

class MainApplication : Application() {
    override fun onCreate() {
        super.onCreate()

        // Path Configuration 로드
        configurePathConfiguration()
        
        // Bridge Components 등록
        configureBridgeComponents()
        
        // Hotwire 디버그 설정 활성화
        Hotwire.config.debugLoggingEnabled = true
        Hotwire.config.webViewDebuggingEnabled = true
    }
    
    private fun configurePathConfiguration() {
        Hotwire.loadPathConfiguration(
            context = this,
            location = PathConfiguration.Location(
                assetFilePath = "json/configuration.json"
            )
        )
        
        android.util.Log.d("MainApplication", "✅ Path configuration loaded")
    }
    
    private fun configureBridgeComponents() {
        // JSON Converter 설정 (필수)
        Hotwire.config.jsonConverter = KotlinXJsonConverter()
        
        // 라이브러리에서 제공하는 Bridge Components 등록
        Hotwire.registerBridgeComponents(*Bridgework.coreComponents)
        
        // 커스텀 AudioRecorderComponent 추가 등록
        Hotwire.registerBridgeComponents(
            BridgeComponentFactory("audio-recorder", ::AudioRecorderComponent)
        )
        
        android.util.Log.d("MainApplication", "✅ Bridge components registered (library + audio-recorder)")
    }
}

