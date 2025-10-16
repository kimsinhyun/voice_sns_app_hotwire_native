package com.example.voice_talk_android.fragments

import dev.hotwire.navigation.destinations.HotwireDestinationDeepLink
import dev.hotwire.navigation.fragments.HotwireWebBottomSheetFragment

/**
 * 모달 Bottom Sheet Fragment - 로그인, 회원가입 등
 */
@HotwireDestinationDeepLink(uri = "hotwire://fragment/web/modal/sheet")
class WebBottomSheetFragment : HotwireWebBottomSheetFragment()

