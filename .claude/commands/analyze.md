웹사이트 종합 분석을 수행하고 마크다운 리포트를 생성합니다.

분석 대상 URL: $ARGUMENTS

---

## 실행 절차

아래 6개의 Phase를 순서대로 수행하세요. 각 Phase에서 에러가 발생하면 해당 섹션을 스킵하고 다음으로 진행합니다.

### Phase 1: Setup — 브라우저에서 URL 열기

1. `$ARGUMENTS`에서 URL을 파싱합니다. `http://` 또는 `https://`가 없으면 `https://`를 자동으로 추가합니다.
2. `tabs_context_mcp`로 현재 탭 정보를 가져옵니다.
3. `tabs_create_mcp`로 새 탭을 생성합니다.
4. `navigate`로 URL로 이동합니다.
5. 페이지 로딩을 위해 3초 대기합니다 (`computer` action: `wait`, duration: 3).
6. `screenshot`을 찍어 페이지가 정상 로드되었는지 확인합니다.

### Phase 2: Browser Analysis — javascript_tool로 6개 분석 스크립트 실행

각 분석 스크립트를 `Read` 도구로 읽은 후 `javascript_tool`로 실행합니다. 결과는 JSON 문자열로 반환됩니다. `JSON.parse()`하여 변수에 저장합니다.

**중요**: `javascript_tool`의 `text` 파라미터에 스크립트 내용을 그대로 전달합니다. 각 스크립트는 IIFE 형태로 `JSON.stringify(result)`를 반환합니다.

실행 순서 (가능하면 병렬로 Read 후 순차 실행):

1. **techStack**: `analyzers/tech-detector.js` 읽기 → `javascript_tool` 실행
2. **cssData**: `analyzers/css-analyzer.js` 읽기 → `javascript_tool` 실행
3. **seoData**: `analyzers/seo-analyzer.js` 읽기 → `javascript_tool` 실행
4. **a11yData**: `analyzers/accessibility-analyzer.js` 읽기 → `javascript_tool` 실행
5. **tokenData**: `analyzers/design-token-analyzer.js` 읽기 → `javascript_tool` 실행
6. **perfData**: `analyzers/performance-analyzer.js` 읽기 → `javascript_tool` 실행

각 실행 결과를 JSON.parse하여 변수명으로 기억합니다. `javascript_tool` 실패 시 해당 데이터를 `null`로 처리하고 계속 진행합니다.

### Phase 3: Server-side Analysis — curl로 보안 헤더 분석

Bash 도구로 다음 명령을 실행합니다:
```
curl -sI -L "<url>"
```

응답 헤더에서 다음 항목을 파싱합니다:
- `strict-transport-security` → hsts
- `content-security-policy` → csp
- `access-control-allow-origin` → cors
- `x-frame-options` → xFrameOptions
- `x-content-type-options` → xContentTypeOptions
- `x-xss-protection` → xXssProtection
- `referrer-policy` → referrerPolicy
- `permissions-policy` → permissionsPolicy
- `server` → server 정보
- `set-cookie` → 쿠키 정보 (name, secure, httponly, samesite)
- URL이 https://로 시작하면 https: true

**CORS 차단된 CSS 처리**: cssData에 `corsBlockedUrls`가 있으면, 각 URL에 대해:
```
curl -sL "<css-url>"
```
으로 CSS 텍스트를 가져와서 추가 분석합니다. CSS 텍스트에서:
- `@media` 쿼리 추출
- `@keyframes` 추출
- `:root` 블록의 커스텀 프로퍼티 추출
- 규칙 수 카운트
결과를 cssData에 병합합니다.

### Phase 4: Design System 분석

tokenData를 기반으로 다음을 분석합니다:

1. **색상 팔레트 분류**:
   - primary: 채도가 높고 사용 빈도가 높은 색상
   - neutral: 회색 계열 (채도 낮음)
   - semantic: 성공(green), 경고(yellow/orange), 에러(red), 정보(blue) 색상

2. **일관성 점수** (high/medium/low):
   - 고유 색상 수, 폰트 패밀리 수, 고유 간격 수를 기반으로 판단
   - 색상 20개 이하 + 폰트 3개 이하 + 간격 15개 이하 = high
   - 색상 40개 이하 + 폰트 5개 이하 + 간격 25개 이하 = medium
   - 그 외 = low

3. **타이포그래피 스케일**: 폰트 사이즈를 정렬하여 스케일 추출
4. **간격 스케일**: 간격 값을 정렬하여 스케일 추출

### Phase 5: Report 생성 — Write 도구로 마크다운 파일 작성

리포트 디렉토리: `reports/<domain>/<timestamp>/`
- domain: URL의 호스트명 (예: `www.daum.net`)
- timestamp: `YYYYMMDD-HHmmss` 형식 (로컬 시간 기준)

먼저 Bash로 디렉토리를 생성합니다:
```
mkdir -p reports/<domain>/<timestamp>
```

#### 헬퍼 함수 (리포트 작성 시 사용)

**formatBytes(bytes)**:
```
0 → "0 B"
1024 → "1 KB"
1048576 → "1 MB"
계산: sizes = ['B', 'KB', 'MB', 'GB'], i = floor(log(bytes)/log(1024)), 결과 = (bytes/1024^i).toFixed(2) + sizes[i]
```

**createProgressBar(value, max, length=20)**:
```
filled = round((value/max) * length)
결과: "█" × filled + "░" × (length-filled) + " " + round(value/max*100) + "%"
예: ████████████░░░░░░░░ 60%
```

**createMarkdownTable(headers, rows)**:
```
| header1 | header2 |
| --- | --- |
| val1 | val2 |
```

**statusEmoji(value)**:
```
true 또는 비어있지 않은 문자열 → "✅"
false 또는 null → "❌"
```

#### 파일 1: `00-종합요약.md`

당신(Claude)이 모든 분석 데이터를 종합하여 직접 작성하는 AI 분석 리포트입니다.

```markdown
# 🔍 웹사이트 종합 분석: <url>

> 분석 일시: <날짜>
> 생성 도구: Claude Chrome Skills (Claude Code Skill)

## 한줄 요약
(사이트의 기술적 특성과 전반적인 상태를 1-2문장으로)

## 주요 발견사항
(가장 중요한 발견 3-5개를 bullet point로)

## 기술스택 요약
(프레임워크, 라이브러리, 빌드도구 등을 간결하게)

## 성능 평가
(리소스 현황, 최적화 수준, 개선 포인트)

## 보안 상태
(보안 헤더 설정 상태, 위험 요소)

## SEO 상태
(메타태그, 구조화 데이터, 개선 포인트)

## 접근성 평가
(시맨틱 마크업, ARIA, 이미지 alt 등)

## 디자인 시스템 평가
(일관성 점수, 색상/타이포그래피 체계)

## 개선 권장사항
(우선순위별로 정리)
```

#### 파일 2: `01-기술스택.md`

```markdown
# 웹사이트 분석 리포트

- **URL**: <url>
- **분석 일시**: <날짜 (YYYY. MM. DD. HH:mm:ss 형식)>
- **생성 도구**: Claude Chrome Skills

## 기술스택 분석

### 프레임워크
(techStack.frameworks를 bullet point로)

### 라이브러리
(techStack.libraries를 bullet point로)

### 인프라 정보
| 항목 | 값 |
| --- | --- |
| CMS | (techStack.cms 또는 없음) |
| 서버 | (server 정보 또는 없음) |
| CDN | (techStack.cdn을 쉼표로) |
| 애널리틱스 | (techStack.analytics를 쉼표로) |

### 메타 정보
| 메타 태그 | 값 |
| --- | --- |
(techStack.meta의 각 항목)
```

#### 파일 3: `02-CSS분석.md`

```markdown
## CSS 분석

### 개요
| 항목 | 값 |
| --- | --- |
| CSS 프레임워크 | (cssData.framework 또는 "없음") |
| 총 스타일시트 | (cssData.totalStylesheets)개 |
| 총 규칙 수 | (cssData.totalRules)개 |
| 커스텀 프로퍼티 | (cssData.customProperties.length)개 |
| 애니메이션 | (cssData.animations.length)개 |

### 레이아웃 사용 현황
(cssData.layouts를 테이블로)

### 미디어 쿼리 (상위 10개)
(cssData.mediaQueries를 backtick으로 감싸서 bullet point로)

### 커스텀 프로퍼티 (상위 15개)
| 이름 | 값 |
| --- | --- |
(cssData.customProperties를 backtick으로 감싸서)

### 애니메이션 (상위 10개)
| 이름 | 유형 |
| --- | --- |

### 외부 스타일시트
(URL을 bullet point로)
```

#### 파일 4: `03-성능분석.md`

```markdown
## 성능 분석

### 리소스 총계
- 총 리소스: **<count>개**
- 총 크기: **<formatBytes(size)>**

### 리소스 유형별
| 유형 | 개수 | 크기 |
| --- | --- | --- |
(perfData.resources.byType의 각 항목. 크기는 formatBytes로 변환)

### 이미지 최적화
- 총 이미지: <totalImages>개
- 레이지 로딩: <lazyLoadedImages>개
- 레이지 로딩 비율: <createProgressBar(lazy, total)>

### Preload 리소스
(bullet point로)

### Preconnect 도메인
(bullet point로)

### 타이밍
| 지표 | 시간 |
| --- | --- |
| DOMContentLoaded | <ms>ms |
| Load | <ms>ms |
| First Paint | <ms>ms |
| First Contentful Paint | <ms>ms |
```

#### 파일 5: `04-SEO분석.md`

```markdown
## SEO 분석

### 기본 메타 정보
| 항목 | 상태 | 값 |
| --- | --- | --- |
| 타이틀 | (statusEmoji) | (값 또는 "없음") |
| 설명 | (statusEmoji) | (값 또는 "없음") |
| 키워드 | (statusEmoji) | (값 또는 "없음") |
| Canonical | (statusEmoji) | (값 또는 "없음") |
| Robots | (statusEmoji) | (값 또는 "없음") |
| 언어 | (statusEmoji) | (값 또는 "미설정") |

### Open Graph 태그 (n개)
| 속성 | 값 |
| --- | --- |

### Twitter 카드 태그 (n개)
| 속성 | 값 |
| --- | --- |

### 헤딩 구조
| 레벨 | 개수 |
| --- | --- |
(h1~h6 개수)

### 구조화 데이터
- 총 n개의 구조화 데이터 발견
```

#### 파일 6: `05-보안분석.md`

```markdown
## 보안 분석

### 보안 헤더
| 헤더 | 상태 | 값 |
| --- | --- | --- |
| HTTPS | (statusEmoji) | 활성/비활성 |
| HSTS | (statusEmoji) | (값 또는 "미설정") |
| CSP | (statusEmoji) | 설정됨/미설정 |
| CORS | (statusEmoji) | (값 또는 "미설정") |
| X-Frame-Options | (statusEmoji) | (값 또는 "미설정") |
| X-Content-Type-Options | (statusEmoji) | (값 또는 "미설정") |
| X-XSS-Protection | (statusEmoji) | (값 또는 "미설정") |
| Referrer-Policy | (statusEmoji) | (값 또는 "미설정") |
| Permissions-Policy | (statusEmoji) | (값 또는 "미설정") |

### 보안 점수
<createProgressBar(설정된 헤더 수, 9)> (n/9)

### 쿠키 (n개)
| 이름 | Secure | HttpOnly | SameSite |
| --- | --- | --- | --- |
(각 쿠키 정보)
```

#### 파일 7: `06-접근성분석.md`

```markdown
## 접근성 분석

### 시맨틱 요소
| 요소 | 사용 횟수 |
| --- | --- |
(a11yData.semanticElements)

### ARIA 속성
| 속성 | 사용 횟수 |
| --- | --- |
(a11yData.ariaAttributes)

### 이미지 대체 텍스트
- alt 있음: n개
- alt 없음: n개
- 비율: <createProgressBar>

### 폼 라벨
- 라벨 있음: n개
- 라벨 없음: n개
- 비율: <createProgressBar>

### 기타
| 항목 | 값 |
| --- | --- |
| TabIndex 요소 | n개 |
| Skip Links | 있음/없음 |

### Landmarks
(bullet point로)
```

#### 파일 8: `07-디자인토큰.md`

```markdown
## 디자인 토큰 & 디자인 시스템

### 디자인 일관성 점수
<createProgressBar(scoreValue, 3)> **높음/보통/낮음**
(scoreValue: high=3, medium=2, low=1)

### 개요
| 항목 | 값 |
| --- | --- |
| 고유 색상 수 | n개 |
| 폰트 패밀리 수 | n개 |
| 고유 간격 수 | n개 |
| 그림자 종류 | n개 |
| 보더 라디우스 종류 | n개 |
| 트랜지션 종류 | n개 |

### 색상 팔레트
- **Primary**: `색상1` `색상2` ...
- **Neutral**: `색상1` `색상2` ...
- **Semantic**: `색상1` `색상2` ...

### 색상 사용 빈도 (상위 15개)
| 색상값 | 사용 횟수 | 출처 |
| --- | --- | --- |
(variable이면 "변수 (`--이름`)", 아니면 "계산됨")

### 타이포그래피: <fontFamily>
(상위 3개 폰트 패밀리에 대해)
- **Weights**: 400, 700, ...
| Font Size | 사용 횟수 |
| --- | --- |

### 타이포그래피 스케일
`12px` → `14px` → `16px` → `18px` → ...

### 간격 스케일
`4px` → `8px` → `12px` → `16px` → ...

### 간격 사용 빈도 (상위 10개)
| 값 | 속성 | 사용 횟수 |
| --- | --- | --- |

### 그림자
(backtick으로 감싸서 bullet point로, 상위 10개)

### 보더 라디우스
`값1` | `값2` | `값3` ...

### 트랜지션
(backtick으로 감싸서 bullet point로, 상위 10개)
```

### Phase 6: 사용자에게 요약 출력

모든 리포트 파일이 생성되면 사용자에게 다음을 출력합니다:

1. 분석 완료 메시지와 리포트 경로
2. 생성된 파일 목록
3. 주요 발견사항 요약 (3-5개)
4. 전체 분석에서 가장 주목할 만한 점

---

## 에러 처리 & Playwright 폴백

### Chrome MCP 실패 시 → Playwright로 재시도

Phase 1 또는 Phase 2에서 Chrome MCP가 실패하면 (확장 프로그램 미연결, javascript_tool 오류 등), **Playwright 폴백**을 실행합니다:

```
node playwright-runner.mjs "<url>"
```

이 스크립트는:
1. Playwright headless 브라우저를 실행합니다
2. 6개 분석 스크립트를 `page.evaluate()`로 실행합니다
3. 결과를 JSON으로 stdout에 출력합니다 (진행 로그는 stderr)

**출력 형식:**
```json
{
  "techStack": { ... },
  "css": { ... },
  "seo": { ... },
  "accessibility": { ... },
  "designTokens": { ... },
  "performance": { ... }
}
```

Playwright 결과를 받은 후 Phase 3 (curl 보안 헤더)부터 동일하게 진행합니다.

**Playwright가 설치되지 않은 경우:**
```
cd <project-root> && pnpm install && npx playwright install chromium
```

### 기타 에러 처리

- `javascript_tool` 실행 실패 시: 해당 분석 섹션을 "분석 실패 (브라우저 스크립트 오류)" 로 표시하고 계속 진행
- `curl` 실패 시: 보안 분석 섹션을 "분석 실패 (서버 응답 없음)" 으로 표시
- 네비게이션 실패 시: Playwright 폴백 시도
- 모든 분석이 실패한 경우: 스크린샷만으로 기본 정보를 제공
