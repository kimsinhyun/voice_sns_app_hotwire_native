package com.example.voice_talk_android.fragments

import android.os.Bundle
import android.view.View
import androidx.core.content.ContextCompat
import com.example.voice_talk_android.R
import dev.hotwire.navigation.destinations.HotwireDestinationDeepLink
import dev.hotwire.navigation.fragments.HotwireWebFragment

@HotwireDestinationDeepLink(uri = "hotwire://fragment/web")
open class WebFragment : HotwireWebFragment(){
    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        
        // Toolbar 스타일 커스터마이징
        toolbarForNavigation()?.apply {
            // 배경색을 Rails의 bg-[#FDEBD0]와 동일하게 설정
            setBackgroundColor(ContextCompat.getColor(requireContext(), R.color.bg_cream))
            // Elevation 제거 (그림자/border 제거)
            elevation = 0f
        }
    }
}

