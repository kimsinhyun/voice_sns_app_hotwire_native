package com.example.voice_talk_android

import android.app.Application
import com.example.voice_talk_android.bridge.AudioRecorderComponent
import com.example.voice_talk_android.fragments.WebBottomSheetFragment
import com.example.voice_talk_android.fragments.WebFragment
import com.example.voice_talk_android.fragments.WebFragmentWithoutToolbar
import com.masilotti.bridgecomponents.shared.Bridgework
import dev.hotwire.core.BuildConfig
import dev.hotwire.core.bridge.BridgeComponentFactory
import dev.hotwire.core.bridge.KotlinXJsonConverter
import dev.hotwire.core.config.Hotwire
import dev.hotwire.core.turbo.config.PathConfiguration
import dev.hotwire.navigation.config.defaultFragmentDestination
import dev.hotwire.navigation.config.registerBridgeComponents
import dev.hotwire.navigation.config.registerFragmentDestinations

class MainApplication : Application() {
    override fun onCreate() {
        super.onCreate()

        // Path Configuration 로드
        Hotwire.loadPathConfiguration(
            context = this,
            location = PathConfiguration.Location(
                assetFilePath = "json/path-configuration.json",
                remoteFileUrl = "${Main.current.url}/configurations/android_v1.json"
            )
        )

        // Set default Fragment destination
        Hotwire.defaultFragmentDestination = WebFragment::class
        
        // Custom Fragments 등록
        Hotwire.registerFragmentDestinations(
            WebFragment::class,
            WebBottomSheetFragment::class,
            WebFragmentWithoutToolbar::class
        )

        // Register bridge components
        Hotwire.registerBridgeComponents(*Bridgework.coreComponents)

        // 커스텀 AudioRecorderComponent 추가 등록
        Hotwire.registerBridgeComponents(
            BridgeComponentFactory("audio-recorder", ::AudioRecorderComponent)
        )

        // Set Configuration options
        Hotwire.config.debugLoggingEnabled = BuildConfig.DEBUG
        Hotwire.config.webViewDebuggingEnabled = BuildConfig.DEBUG
        Hotwire.config.jsonConverter = KotlinXJsonConverter()
        Hotwire.config.applicationUserAgentPrefix = "Hotwire VoiceTalk;"
    }
}

