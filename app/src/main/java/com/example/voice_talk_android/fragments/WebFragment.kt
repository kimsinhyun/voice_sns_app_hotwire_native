package com.example.voice_talk_android.fragments

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.core.content.ContextCompat
import com.example.voice_talk_android.R
import dev.hotwire.navigation.destinations.HotwireDestinationDeepLink
import dev.hotwire.navigation.fragments.HotwireWebFragment

@HotwireDestinationDeepLink(uri = "hotwire://fragment/web")
open class WebFragment : HotwireWebFragment(){
    
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        android.util.Log.d("WebFragment", "🔵 onCreateView called")
        val view = inflater.inflate(R.layout.fragment_web, container, false)
        android.util.Log.d("WebFragment", "  - Inflated view: ${view::class.simpleName}")
        return view
    }
    
    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        
        android.util.Log.d("WebFragment", "🔵 onViewCreated called")
        
        // app_bar가 실제로 있는지 확인
        val appBar = view.findViewById<com.google.android.material.appbar.AppBarLayout>(R.id.app_bar)
        android.util.Log.d("WebFragment", "  - AppBar found in onViewCreated: ${appBar != null}")
        
        // Toolbar 스타일 커스터마이징
        toolbarForNavigation()?.apply {
            android.util.Log.d("WebFragment", "  - Customizing toolbar")
            // 배경색을 Rails의 bg-[#FDEBD0]와 동일하게 설정
            setBackgroundColor(ContextCompat.getColor(requireContext(), R.color.bg_cream))
            // Elevation 제거 (그림자/border 제거)
            elevation = 0f
        }
    }
}

