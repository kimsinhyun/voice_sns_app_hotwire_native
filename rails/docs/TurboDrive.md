# Turbo Drive 가이드

## 목차
1. [Turbo Drive란?](#turbo-drive란)
2. [Navigation 메커니즘](#navigation-메커니즘)
3. [이벤트 라이프사이클](#이벤트-라이프사이클)
4. [Form Submissions](#form-submissions)
5. [Page Refreshes와 Morphing](#page-refreshes와-morphing)
6. [Turbo Frames](#turbo-frames)
7. [성능 최적화](#성능-최적화)
8. [Turbo Drive 제어](#turbo-drive-제어)
9. [Hotwire Native 연계](#hotwire-native-연계)
10. [Best Practices](#best-practices)

---

## Turbo Drive란?

**Turbo Drive**는 Hotwire의 핵심 구성 요소로, 페이지 수준의 내비게이션을 향상시킵니다. 링크 클릭과 폼 제출을 백그라운드에서 처리하고 전체 페이지 새로고침 없이 페이지를 업데이트합니다.

### 핵심 개념

- **SPA의 속도 + MPA의 단순함**: 복잡한 클라이언트 사이드 JavaScript 없이 빠른 내비게이션 제공
- **자동 처리**: 모든 링크와 폼이 자동으로 Turbo Drive로 처리됨
- **캐시 활용**: 이전 페이지를 캐시하여 즉시 복원

### Hotwire 스택에서의 위치

```
┌─────────────────────────────────────┐
│         Hotwire Native              │  ← 네이티브 앱 래퍼
│  ┌───────────────────────────────┐  │
│  │      Turbo Drive              │  │  ← 페이지 내비게이션
│  │      Turbo Frames             │  │  ← 페이지 내 독립 영역
│  │      Turbo Streams            │  │  ← 실시간 부분 업데이트
│  └───────────────────────────────┘  │
│  ┌───────────────────────────────┐  │
│  │      Stimulus                 │  │  ← 최소한의 JavaScript
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

**참고**: [Turbo Drive 공식 문서](https://turbo.hotwired.dev/handbook/drive)

---

## Navigation 메커니즘

### Visit의 개념

Turbo Drive는 페이지 내비게이션을 **Visit(방문)**으로 모델링합니다. 각 Visit은 다음을 포함합니다:

- **Location**: 목적지 URL
- **Action**: 방문 유형 (advance, replace, restore)
- **Lifecycle**: 클릭부터 렌더링까지 전체 과정

### Application Visits

사용자가 링크를 클릭하거나 `Turbo.visit()`를 호출하면 Application Visit이 시작됩니다.

#### Advance Action (기본값)

브라우저 히스토리에 새 항목을 추가합니다.

```html
<!-- HTML -->
<a href="/articles">게시글 보기</a>
```

```javascript
// JavaScript
Turbo.visit("/articles", { action: "advance" })
```

**결과**: 뒤로 가기 버튼으로 이전 페이지로 돌아갈 수 있음

#### Replace Action

현재 히스토리 항목을 새 위치로 교체합니다.

```html
<!-- HTML -->
<a href="/edit" data-turbo-action="replace">수정</a>
```

```javascript
// JavaScript
Turbo.visit("/edit", { action: "replace" })
```

**사용 예시**: 편집 화면에서 뒤로 가기 시 바로 목록으로 이동하고 싶을 때

### Restoration Visits

브라우저의 뒤로/앞으로 가기 버튼을 사용할 때 자동으로 시작됩니다.

**특징**:
- 가능하면 캐시에서 페이지를 즉시 복원
- 스크롤 위치 자동 복원
- 네트워크 요청 없이 즉시 표시

**참고**: Restoration Visit은 `turbo:before-visit` 이벤트를 발생시키지 않으며 취소할 수 없습니다.

### 렌더링 과정

1. **요청**: Turbo가 백그라운드에서 새 페이지 요청
2. **캐시 미리보기**: 가능하면 캐시된 버전을 즉시 표시
3. **응답 처리**: 서버 응답 도착
4. **병합**: `<body>` 내용 교체, `<head>` 내용 병합
5. **완료**: 스크롤 위치 조정 및 이벤트 발생

```
캐시 미리보기 → 네트워크 요청 → 렌더링 → 완료
     ↓              ↓             ↓        ↓
  즉시 표시      백그라운드      DOM 업데이트  이벤트
```

---

## 이벤트 라이프사이클

Turbo Drive는 내비게이션 과정에서 다양한 이벤트를 발생시킵니다.

### 주요 이벤트

| 이벤트 | 타이밍 | 취소 가능 | 용도 |
|--------|--------|----------|------|
| `turbo:click` | 링크 클릭 시 | ✅ | 클릭 처리 커스터마이징 |
| `turbo:before-visit` | 방문 시작 전 | ✅ | 방문 취소 또는 조건부 허용 |
| `turbo:visit` | 방문 시작 후 | ❌ | 로딩 표시 시작 |
| `turbo:before-fetch-request` | 요청 전 | ✅ (pause) | 헤더 추가, 토큰 설정 |
| `turbo:before-cache` | 캐시 저장 전 | ❌ | 폼 초기화, UI 정리 |
| `turbo:before-render` | 렌더링 전 | ✅ (pause) | 커스텀 렌더링, 애니메이션 |
| `turbo:render` | 렌더링 후 | ❌ | DOM 업데이트 후 처리 |
| `turbo:load` | 페이지 로드 완료 | ❌ | 초기화 로직 실행 |

### 실전 예제

#### 1. 요청 전 인증 토큰 추가

```javascript
document.addEventListener("turbo:before-fetch-request", async (event) => {
  event.preventDefault()
  
  const token = await getSessionToken()
  event.detail.fetchOptions.headers["Authorization"] = `Bearer ${token}`
  
  event.detail.resume()
})
```

#### 2. 특정 URL 방문 차단

```javascript
document.addEventListener("turbo:before-visit", (event) => {
  if (event.detail.url.includes("/admin") && !isAdmin()) {
    event.preventDefault()
    alert("관리자 권한이 필요합니다")
  }
})
```

#### 3. 캐시 전 폼 초기화

```javascript
document.addEventListener("turbo:before-cache", () => {
  // 폼 리셋
  document.querySelectorAll("form").forEach(form => form.reset())
  
  // 입력 필드 초기화
  document.querySelectorAll("input[type='password']").forEach(input => {
    input.value = ""
  })
})
```

#### 4. 커스텀 렌더링 (Morphing)

```javascript
import { Idiomorph } from "idiomorph"

addEventListener("turbo:before-render", (event) => {
  event.detail.render = (currentElement, newElement) => {
    Idiomorph.morph(currentElement, newElement)
  }
})
```

#### 5. 페이지 로드 완료 후 처리

```javascript
document.addEventListener("turbo:load", () => {
  // 초기 페이지 로드와 모든 Turbo 방문 후 실행
  console.log("페이지 로드 완료")
  
  // 예: 툴팁 초기화
  initializeTooltips()
})
```

---

## Form Submissions

Turbo Drive는 폼 제출도 자동으로 처리합니다.

### 기본 동작

```html
<form action="/articles" method="post">
  <input name="article[title]" type="text">
  <button type="submit">저장</button>
</form>
```

**처리 과정**:
1. 폼 제출 → Turbo가 가로챔
2. 백그라운드에서 POST 요청
3. 서버 응답 처리

### Rails Controller 패턴

#### 성공 시: 303 리다이렉트

```ruby
class ArticlesController < ApplicationController
  def create
    @article = Article.new(article_params)
    
    if @article.save
      # ✅ 303 Redirect - Turbo가 자동으로 따라감
      redirect_to @article, status: :see_other
    else
      # ❌ 422 Unprocessable Entity - 폼을 다시 렌더링
      render :new, status: :unprocessable_entity
    end
  end
end
```

**중요**: `status: :see_other` (303)를 명시해야 Turbo가 올바르게 처리합니다.

#### 에러 처리: 4xx/5xx 상태 코드

```ruby
def update
  if @article.update(article_params)
    redirect_to @article, status: :see_other
  else
    # 유효성 검증 실패 - 폼을 다시 표시
    render :edit, status: :unprocessable_entity
  end
rescue => error
  # 서버 에러
  render :error, status: :internal_server_error
end
```

### Turbo Streams 응답

여러 부분을 동시에 업데이트할 수 있습니다.

```ruby
def create
  @article = Article.new(article_params)
  
  if @article.save
    respond_to do |format|
      format.turbo_stream do
        render turbo_stream: [
          turbo_stream.prepend("articles", @article),
          turbo_stream.update("flash", partial: "shared/flash")
        ]
      end
      format.html { redirect_to @article }
    end
  end
end
```

### Form 이벤트

```javascript
// 폼 제출 시작
addEventListener("turbo:submit-start", ({ target }) => {
  target.querySelector("[type='submit']").disabled = true
})

// 폼 제출 완료
addEventListener("turbo:submit-end", ({ target }) => {
  target.querySelector("[type='submit']").disabled = false
})
```

---

## Page Refreshes와 Morphing

### Morphing 개념

**Morphing**은 페이지 전체를 교체하지 않고 변경된 부분만 업데이트하는 기술입니다.

**사용 시나리오**:
- 폼 제출 후 같은 페이지로 리다이렉트
- 페이지 새로고침이 필요할 때
- 스크롤 위치와 입력 상태를 유지하고 싶을 때

**참고**: [Page Refreshes 공식 문서](https://turbo.hotwired.dev/handbook/page_refreshes)

### 설정 방법

```html
<head>
  <!-- Morphing 활성화 -->
  <meta name="turbo-refresh-method" content="morph">
  
  <!-- 스크롤 위치 유지 -->
  <meta name="turbo-refresh-scroll" content="preserve">
</head>
```

**옵션**:
- `turbo-refresh-method`: `morph` (일부만 변경) 또는 `replace` (전체 교체, 기본값)
- `turbo-refresh-scroll`: `preserve` (유지) 또는 `reset` (맨 위로, 기본값)

### Morphing 제외하기

특정 요소를 Morphing에서 제외할 수 있습니다.

```html
<!-- 팝오버나 모달은 유지 -->
<div data-turbo-permanent id="notification-popup">
  알림 내용
</div>
```

### Turbo Frame과 Morphing

특정 프레임만 Morphing으로 새로고침할 수 있습니다.

```html
<turbo-frame id="comments" refresh="morph" src="/articles/1/comments">
  <!-- 초기 댓글 목록 -->
</turbo-frame>
```

**용도**: 페이지 새로고침 시 추가로 로드된 콘텐츠(페이지네이션 등)를 유지하면서 업데이트

### Broadcasting Page Refreshes

서버에서 페이지 새로고침을 브로드캐스트할 수 있습니다.

```ruby
# Model
class Article < ApplicationRecord
  broadcasts_refreshes
end

# View
<%= turbo_stream_from @article %>
```

```html
<!-- Turbo Stream -->
<turbo-stream action="refresh"></turbo-stream>
```

**결과**: Article이 변경되면 해당 페이지를 보고 있는 모든 사용자의 화면이 Morphing으로 자동 새로고침됩니다.

---

## Turbo Frames

**Turbo Frames**는 페이지 내의 독립적인 영역을 정의하여 부분적인 업데이트를 가능하게 합니다.

**참고**: [Turbo Frames 공식 문서](https://turbo.hotwired.dev/handbook/frames)

### 기본 개념

```html
<body>
  <turbo-frame id="message">
    <h1>메시지 제목</h1>
    <p>메시지 내용</p>
    <a href="/messages/1/edit">수정</a>
  </turbo-frame>
</body>
```

**동작**:
1. "수정" 링크 클릭
2. `/messages/1/edit` 요청
3. 응답에서 `<turbo-frame id="message">` 추출
4. 해당 프레임만 교체

### Eager-Loading Frames

페이지 로드 시 자동으로 콘텐츠를 가져옵니다.

```html
<turbo-frame id="sidebar" src="/sidebar">
  <img src="/spinner.gif">
</turbo-frame>
```

**순서**:
1. 메인 페이지 로드
2. 프레임이 `/sidebar` 요청
3. 응답의 `<turbo-frame id="sidebar">` 내용으로 교체

### Lazy-Loading Frames

화면에 보일 때까지 로딩을 지연합니다.

```html
<turbo-frame id="comments" src="/comments" loading="lazy">
  로딩 중...
</turbo-frame>
```

**용도**: 
- 페이지 하단의 댓글
- 접힌(collapsed) 섹션 내부 콘텐츠
- 탭 안의 내용

### 중첩 Frames

프레임은 중첩될 수 있으며, 각각 독립적으로 동작합니다.

```html
<turbo-frame id="article">
  <h1>게시글</h1>
  
  <turbo-frame id="comments">
    <div>댓글 1</div>
    <div>댓글 2</div>
  </turbo-frame>
</turbo-frame>
```

### Frame Navigation 제어

#### 1. 다른 프레임 타겟팅

```html
<turbo-frame id="frame-a">
  <!-- frame-b를 업데이트 -->
  <a href="/content" data-turbo-frame="frame-b">링크</a>
</turbo-frame>

<turbo-frame id="frame-b">
  <!-- 여기가 업데이트됨 -->
</turbo-frame>
```

#### 2. 전체 페이지 내비게이션

```html
<turbo-frame id="message">
  <!-- 프레임만 업데이트 -->
  <a href="/edit">수정</a>
  
  <!-- 전체 페이지 변경 -->
  <a href="/delete" data-turbo-frame="_top">삭제</a>
</turbo-frame>
```

**특수 타겟**:
- `_top`: 전체 페이지 내비게이션
- `_self`: 현재 프레임 (기본값)

#### 3. Frame Navigation을 브라우저 히스토리에 추가

```html
<turbo-frame id="articles" data-turbo-action="advance">
  <a href="/articles?page=2">다음 페이지</a>
</turbo-frame>
```

**결과**: 프레임 내비게이션이지만 브라우저 URL도 `/articles?page=2`로 변경됩니다.

### Frame Breaking Out

프레임 요청에 대한 응답이 예상과 다를 때 전체 페이지로 처리할 수 있습니다.

**시나리오**: 세션 만료로 로그인 페이지로 리다이렉트

```html
<!-- 로그인 페이지 -->
<head>
  <meta name="turbo-visit-control" content="reload">
</head>
```

**결과**: 프레임 내부가 아닌 전체 페이지로 로그인 화면 표시

### 에러 처리

```javascript
document.addEventListener("turbo:frame-missing", (event) => {
  // 프레임이 응답에 없을 때
  const { detail: { response, visit } } = event
  
  // 전체 페이지로 이동
  event.preventDefault()
  visit(response.url)
})
```

---

## 성능 최적화

### Prefetching (호버 시 미리 로드)

Turbo는 기본적으로 링크에 마우스를 올리면 해당 페이지를 미리 로드합니다.

```html
<!-- 기본: 자동 prefetch -->
<a href="/articles">게시글</a>

<!-- Prefetch 비활성화 -->
<a href="/expensive-page" data-turbo-prefetch="false">무거운 페이지</a>
```

**타이밍**: 마우스 호버 후 100ms 대기

#### 전역 설정

```html
<head>
  <!-- Prefetch 비활성화 -->
  <meta name="turbo-prefetch" content="false">
</head>
```

#### 조건부 Prefetch

```javascript
document.addEventListener("turbo:before-prefetch", (event) => {
  // 느린 네트워크나 데이터 절약 모드에서 비활성화
  if (navigator.connection?.saveData || 
      navigator.connection?.effectiveType === "slow-2g") {
    event.preventDefault()
  }
})
```

### Preloading (캐시에 미리 저장)

중요한 페이지를 미리 캐시에 저장합니다.

```html
<a href="/important-page" data-turbo-preload>중요한 페이지</a>
```

**차이점**:
- **Prefetch**: 호버 시 자동으로 미리 로드
- **Preload**: 페이지 로드 시 즉시 캐시에 저장

**용도**:
- 다음에 갈 가능성이 높은 페이지
- Lazy-Loading Frame과 조합하여 구조만 먼저 로드

**제한사항**: 다음은 preload되지 않습니다.
- 다른 도메인 링크
- `data-turbo-frame` 속성이 있는 링크
- `data-turbo="false"` 속성이 있는 링크
- `data-turbo-method` 속성이 있는 링크

### 캐시 전략

```javascript
// 캐시 저장 전 정리
document.addEventListener("turbo:before-cache", () => {
  // 임시 알림 제거
  document.querySelectorAll(".flash-message").forEach(el => el.remove())
  
  // 입력 필드 초기화
  document.querySelectorAll("input[type='search']").forEach(el => el.value = "")
})
```

---

## Turbo Drive 제어

### 특정 요소에서 비활성화

```html
<!-- 링크에서 비활성화 -->
<a href="/legacy-page" data-turbo="false">레거시 페이지</a>

<!-- 폼에서 비활성화 -->
<form action="/upload" method="post" data-turbo="false">
  <input type="file">
  <button type="submit">업로드</button>
</form>

<!-- 영역 전체에서 비활성화 -->
<div data-turbo="false">
  <a href="/page1">페이지 1</a>
  <a href="/page2">페이지 2</a>
</div>
```

### 다시 활성화

```html
<div data-turbo="false">
  <!-- 부모는 비활성화됐지만 이 링크는 활성화 -->
  <a href="/modern-page" data-turbo="true">모던 페이지</a>
</div>
```

### HTTP 메서드 변경

```html
<a href="/articles/1" data-turbo-method="delete">삭제</a>
<a href="/articles/1/archive" data-turbo-method="patch">보관</a>
```

**참고**: 접근성을 위해 GET이 아닌 작업은 실제 폼과 버튼을 사용하는 것이 좋습니다.

### 확인 메시지

```html
<a href="/articles/1" 
   data-turbo-method="delete"
   data-turbo-confirm="정말 삭제하시겠습니까?">
  삭제
</a>
```

#### 커스텀 Confirm

```javascript
Turbo.config.forms.confirm = (message, element) => {
  return new Promise((resolve) => {
    // 커스텀 모달 표시
    showCustomModal({
      message,
      onConfirm: () => resolve(true),
      onCancel: () => resolve(false)
    })
  })
}
```

### 특정 페이지에서 전체 리로드 강제

```html
<head>
  <meta name="turbo-visit-control" content="reload">
</head>
```

**사용 예시**:
- 복잡한 JavaScript 라이브러리 사용 페이지
- 로그인 페이지 (Frame breaking out)

---

## Hotwire Native 연계

Turbo Drive는 Hotwire Native 앱에서도 동일하게 동작합니다.

### Native에서의 Visit 처리

```swift
// iOS - NavigatorDelegate
extension SceneDelegate: NavigatorDelegate {
    func handle(proposal: VisitProposal, from navigator: Navigator) -> ProposalResult {
        switch proposal.properties["context"] as? String {
        case "modal":
            // 모달로 표시
            return .acceptModal
        case "native":
            // 네이티브 화면으로 전환
            return .acceptCustom(NativeViewController(url: proposal.url))
        default:
            // 일반 push navigation
            return .accept
        }
    }
}
```

### Path Configuration과의 조합

```json
{
  "rules": [
    {
      "patterns": ["/articles$"],
      "properties": {
        "context": "default",
        "pull_to_refresh_enabled": true
      }
    },
    {
      "patterns": ["/login$"],
      "properties": {
        "context": "modal",
        "pull_to_refresh_enabled": false
      }
    }
  ]
}
```

**참고**: [HotwireNative.md](./HotwireNative.md)

### Bridge Component와의 조합

```javascript
// Stimulus Controller
export default class extends BridgeComponent {
  static component = "form"
  
  submit(event) {
    event.preventDefault()
    
    // Native에서 데이터 가져오기
    this.send("getFormData", {}, (result) => {
      const formData = result.data
      
      // Turbo를 통해 제출
      fetch(this.element.action, {
        method: "POST",
        body: JSON.stringify(formData),
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": this.csrfToken
        }
      }).then(response => {
        if (response.redirected) {
          Turbo.visit(response.url)
        }
      })
    })
  }
}
```

---

## Best Practices

### 1. Rails-First 접근

비즈니스 로직과 데이터 처리는 Rails에서 수행합니다.

```ruby
# ✅ 좋은 예: Controller에서 처리
class ArticlesController < ApplicationController
  def publish
    @article.publish!
    redirect_to @article, notice: "게시되었습니다", status: :see_other
  end
end
```

```javascript
// ❌ 나쁜 예: JavaScript에서 비즈니스 로직
async function publish(articleId) {
  const article = await fetchArticle(articleId)
  article.status = "published"
  article.publishedAt = new Date()
  await saveArticle(article)
}
```

### 2. 적절한 HTTP 상태 코드

```ruby
# 성공 후 리다이렉트
redirect_to @article, status: :see_other  # 303

# 유효성 검증 실패
render :edit, status: :unprocessable_entity  # 422

# 권한 없음
render :forbidden, status: :forbidden  # 403

# 서버 에러
render :error, status: :internal_server_error  # 500
```

### 3. Progressive Enhancement

JavaScript 없이도 동작하도록 구현합니다.

```erb
<!-- ✅ 폼은 JavaScript 없이도 동작 -->
<%= form_with model: @article do |f| %>
  <%= f.text_field :title %>
  <%= f.submit "저장" %>
<% end %>
```

### 4. 캐시 관리

```javascript
document.addEventListener("turbo:before-cache", () => {
  // 일시적인 UI 요소 제거
  document.querySelectorAll(".alert, .flash-message").forEach(el => {
    el.remove()
  })
  
  // 폼 초기화
  document.querySelectorAll("form").forEach(form => {
    if (form.dataset.persistCache !== "true") {
      form.reset()
    }
  })
})
```

### 5. Frame vs Drive 선택

**Turbo Frame 사용**:
- 페이지 일부만 업데이트
- 독립적인 내비게이션 컨텍스트
- 무한 스크롤, 탭 등

**Turbo Drive 사용**:
- 전체 페이지 전환
- URL 변경 필요
- 히스토리 관리 중요

### 6. 이벤트 활용

```javascript
// 로딩 표시
document.addEventListener("turbo:visit", () => {
  showLoadingBar()
})

document.addEventListener("turbo:load", () => {
  hideLoadingBar()
})

// 에러 처리
document.addEventListener("turbo:fetch-request-error", (event) => {
  console.error("Request failed", event.detail)
  showErrorMessage("네트워크 오류가 발생했습니다")
})
```

### 7. 성능 모니터링

```javascript
document.addEventListener("turbo:load", () => {
  const navigationTiming = performance.getEntriesByType("navigation")[0]
  
  // Turbo 캐시 히트 확인
  if (navigationTiming.transferSize === 0) {
    console.log("캐시에서 로드됨")
  }
})
```

---

## 참고 자료

### 공식 문서

- [Turbo Drive Handbook](https://turbo.hotwired.dev/handbook/drive)
- [Page Refreshes](https://turbo.hotwired.dev/handbook/page_refreshes)
- [Turbo Frames](https://turbo.hotwired.dev/handbook/frames)
- [Turbo Events Reference](https://turbo.hotwired.dev/reference/events)

### 프로젝트 문서

- [HotwireNative.md](./HotwireNative.md) - Hotwire Native 가이드
- [BridgeComponent.md](./BridgeComponent.md) - Bridge Component 완전 가이드

---

**작성일**: 2025-10-17  
**최종 업데이트**: 2025-10-17  
**상태**: ✅ 완료

