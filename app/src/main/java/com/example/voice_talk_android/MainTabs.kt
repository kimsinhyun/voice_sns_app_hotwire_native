package com.example.voice_talk_android
import com.example.voice_talk_android.Main
import com.example.voice_talk_android.R
import dev.hotwire.navigation.navigator.NavigatorConfiguration
import dev.hotwire.navigation.tabs.HotwireBottomTab

private val feedTab = HotwireBottomTab(
    title = "",
    iconResId = R.drawable.ic_tab_feed,
    configuration = NavigatorConfiguration(
        name = "",
        navigatorHostId = R.id.feed_nav_host,
        startLocation = "${Main.current.url}/feed"
    )
)

private val messagesTab = HotwireBottomTab(
    title = "",
    iconResId = R.drawable.ic_tab_messages,
    configuration = NavigatorConfiguration(
        name = "",
        navigatorHostId = R.id.messages_nav_host,
        startLocation = "${Main.current.url}/messages",

    )
)

private val settingsTab = HotwireBottomTab(
    title = "",
    iconResId = R.drawable.ic_tab_settings,
    configuration = NavigatorConfiguration(
        name = "",
        navigatorHostId = R.id.settings_nav_host,
        startLocation = "${Main.current.url}/settings"
    )
)

val mainTabs = listOf(
    feedTab,
    messagesTab,
    settingsTab
)

