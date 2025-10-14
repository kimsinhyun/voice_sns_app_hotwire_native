# Android Activity vs Fragment 구조

## 개요

Android 앱은 **Activity**와 **Fragment**의 계층 구조로 이루어져 있습니다. Hotwire Native Android에서 이 구조를 이해하는 것이 중요합니다.

## Activity vs Fragment

### Activity (활동)
- **역할**: 앱의 최상위 컨테이너 (화면 전체)
- **생명주기**: 앱이 실행되는 동안 유지
- **예시**: MainActivity
- **레이아웃**: `activity_main.xml`

### Fragment (프래그먼트)
- **역할**: Activity 안의 재사용 가능한 UI 컴포넌트 (화면의 일부)
- **생명주기**: Activity 안에서 생성/제거 가능
- **예시**: WebFragment, WebFragmentWithoutToolbar
- **레이아웃**: `fragment_web.xml`

## 구조 다이어그램

```
MainActivity (activity_main.xml)
├─ BottomNavigationView (탭 바)
└─ FragmentContainerView
     └─ WebFragment (fragment_web.xml) ← 탭 선택 시 여기에 삽입
          ├─ AppBarLayout (Toolbar)
          │    └─ MaterialToolbar (← 제목, 뒤로가기 버튼)
          └─ WebView (Rails 앱 렌더링)
```

## 실제 예시

### activity_main.xml (Activity 레벨)

```xml
<ConstraintLayout>
    <!-- Fragment가 들어갈 빈 공간들 -->
    <FragmentContainerView android:id="@+id/feed_nav_host" />
    <FragmentContainerView android:id="@+id/messages_nav_host" />
    <FragmentContainerView android:id="@+id/settings_nav_host" />
    
    <!-- 하단 탭 바 -->
    <BottomNavigationView android:id="@+id/bottom_nav" />
</ConstraintLayout>
```

**포함 내용**:
- `FragmentContainerView`: Fragment가 삽입될 빈 컨테이너
- `BottomNavigationView`: Feed, Messages, Settings 탭

### fragment_web.xml (Fragment 레벨)

```xml
<ConstraintLayout>
    <!-- 상단 Toolbar -->
    <AppBarLayout android:id="@+id/app_bar">
        <MaterialToolbar android:id="@+id/toolbar" />
    </AppBarLayout>
    
    <!-- Rails 앱이 렌더링되는 WebView -->
    <include layout="@layout/hotwire_view" />
</ConstraintLayout>
```

**포함 내용**:
- `AppBarLayout` + `MaterialToolbar`: 상단 네비게이션 바
- `hotwire_view`: WebView가 포함된 레이아웃

## 왜 Fragment 레이아웃이 필요한가?

### 문제
기본 Hotwire Native 라이브러리는 자체 Fragment 레이아웃을 사용합니다. 우리는 이 레이아웃의 View ID를 알 수 없어서 toolbar를 직접 제어할 수 없습니다.

### 해결책
커스텀 `fragment_web.xml`을 만들어:
1. `app_bar`라는 명확한 ID 부여
2. `findViewById(R.id.app_bar)`로 직접 접근
3. `visibility = View.GONE/VISIBLE`로 제어

## WebFragment 구현

### 기본 방식 (Hotwire Native 기본 레이아웃 사용)

```kotlin
@HotwireDestinationDeepLink(uri = "hotwire://fragment/web")
open class WebFragment : HotwireWebFragment() {
    // 레이아웃을 지정하지 않으면 기본 레이아웃 사용
}
```

### 커스텀 방식 (우리가 원하는 방식)

```kotlin
@HotwireDestinationDeepLink(uri = "hotwire://fragment/web")
open class WebFragment : HotwireWebFragment() {
    
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        // 커스텀 레이아웃 사용
        return inflater.inflate(R.layout.fragment_web, container, false)
    }
}
```

## Bridge Component에서 View 접근

### HotwireWebFragment 방식 (추상적)

```kotlin
val fragment = delegate.destination.fragment as? HotwireWebFragment
fragment.toolbarForNavigation()?.visibility = View.GONE
```

**문제**: `toolbarForNavigation()`이 null을 반환하거나 실제 toolbar를 찾지 못할 수 있음

### findViewById 방식 (직접 접근) ✅

```kotlin
val fragment = delegate.destination.fragment
val appBar = fragment.view?.findViewById<AppBarLayout>(R.id.app_bar)
appBar?.visibility = View.GONE
```

**장점**: View 계층에 직접 접근하여 확실하게 제어

## 정리

| 구분 | Activity | Fragment |
|------|----------|----------|
| 레벨 | 최상위 | Activity 내부 |
| 레이아웃 | activity_main.xml | fragment_web.xml |
| 역할 | 앱 전체 구조 (탭바, 컨테이너) | 개별 화면 내용 (툴바, 웹뷰) |
| 생명주기 | 앱 실행 중 유지 | 화면 전환 시 생성/제거 |
| 제어 대상 | 탭 네비게이션 | Toolbar, WebView |

## 비유

- **Activity**: 집 전체 (방 구조, 거실, 현관)
- **Fragment**: 방 안의 가구 배치 (침대, 책상, 옷장)
- **Bridge Component**: 가구를 치우거나 배치하는 사람

우리는 "Feed 방의 책상(toolbar)"을 치우고 싶습니다. 
집 전체 도면(activity_main.xml)이 아닌, 
방 내부 배치도(fragment_web.xml)가 필요한 이유입니다!

---

**참고**: 
- [Hotwire Native Android 공식 문서](https://native.hotwired.dev/android)
- [William Kennedy 블로그 - Custom Android Keyboard Extension](https://williamkennedy.ninja/hotwire-native/2025/05/23/up-and-running-with-hotwire-native-android-custom-android-keyboard-extension/)

