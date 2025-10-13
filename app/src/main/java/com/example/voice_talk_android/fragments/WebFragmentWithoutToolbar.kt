package com.example.voice_talk_android.fragments

import android.os.Bundle
import android.view.View
import dev.hotwire.navigation.destinations.HotwireDestinationDeepLink
import dev.hotwire.navigation.fragments.HotwireWebFragment

/**
 * Toolbar 없는 Web Fragment - Feed 등 전체 화면용
 */
@HotwireDestinationDeepLink(uri = "hotwire://fragment/web/without-toolbar")
class WebFragmentWithoutToolbar : HotwireWebFragment() {

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        // Toolbar 숨기기
        toolbarForNavigation()?.visibility = View.GONE
    }
}

