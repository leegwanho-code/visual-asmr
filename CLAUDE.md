# Visual ASMR & Geometry Toy — CLAUDE.md

## Project Overview
텍스트 없는 순수 인터랙티브 비주얼 웹 경험.
마우스/터치 입력에 반응하는 다각형 분열, 슬라임, 물리 파괴 시뮬레이션.
전 세계 누구나 언어 장벽 없이 즐길 수 있으며 Google AdSense로 수익화한다.
외부 라이브러리 없이 Canvas 2D API + 순수 JS만 사용한다.

## Tech Stack
- **렌더링**: HTML5 Canvas 2D API (WebGL 금지 — 접근성 우선)
- **언어**: Vanilla JS (ES2020+), HTML, CSS
- **빌드**: 없음 (순수 정적 파일)
- **테스트**: Jest + jsdom
- **호스팅**: Vercel
- **광고**: Google AdSense — `__ADSENSE_CLIENT__` 플레이스홀더로 관리

## Directory Structure
```
visual-asmr/
├── CLAUDE.md                        ← 이 파일 (항상 먼저 읽을 것)
├── .claude/
│   ├── settings.json                ← 권한 허용/거부 목록
│   ├── agents/
│   │   ├── orchestrator.md          ← 루프 조율 / 판정
│   │   ├── designer.md              ← 비주얼/UX + 리뷰
│   │   ├── coder.md                 ← 엔진 구현/테스트 + 리뷰
│   │   ├── security.md              ← 보안 + BLOCK 권한
│   │   └── marketing.md             ← SEO/AdSense/바이럴 + 리뷰
│   └── skills/
│       ├── implement.md             ← Canvas 구현 가이드
│       ├── physics.md               ← 물리 엔진 레퍼런스
│       ├── voronoi.md               ← 보로노이 알고리즘 레퍼런스
│       ├── test.md                  ← 테스트 작성 가이드
│       └── seo.md                   ← SEO/바이럴 가이드
├── src/
│   ├── engines/
│   │   ├── voronoi.js               ← 보로노이 다이어그램 생성 엔진
│   │   ├── physics.js               ← 강체/충돌/중력 물리 엔진
│   │   ├── slime.js                 ← 점탄성 메쉬 (슬라임) 엔진
│   │   └── wave.js                  ← 파동/리플 엔진
│   ├── modes/
│   │   ├── fracture.js              ← 모드1: 다각형 분열 (클릭 → 분열)
│   │   ├── slime-mode.js            ← 모드2: 슬라임 드래그
│   │   ├── destroy.js               ← 모드3: 물리 파괴 (부수기)
│   │   └── ripple.js                ← 모드4: 파동 연못
│   ├── utils/
│   │   ├── color.js                 ← 색상 팔레트 + 보간 유틸
│   │   ├── math.js                  ← 벡터/기하학 순수 함수
│   │   ├── input.js                 ← 마우스/터치 통합 이벤트
│   │   └── fps.js                   ← FPS 제한 + 성능 모니터
│   ├── audio/
│   │   └── synth.js                 ← Web Audio API 음향 피드백
│   └── ads/
│       ├── ad-timer.js              ← 인터스티셜 쿨다운 타이머
│       └── easter-egg.js            ← 이스터에그 트리거 + 이펙트
├── public/
│   ├── index.html                   ← 진입점 (SEO 메타 포함)
│   └── style.css                    ← 전역 스타일 (다크배경 중심)
├── tests/
│   ├── engines/
│   │   ├── voronoi.test.js
│   │   ├── physics.test.js
│   │   └── wave.test.js
│   └── utils/
│       ├── math.test.js
│       └── color.test.js
├── tasks/
│   ├── progress.md
│   └── reviews/
│       └── TEMPLATE.md
├── package.json
└── vercel.json
```

## Core Rules (반드시 준수)

### DO
- 모든 계산 함수는 **순수 함수** — Canvas 의존성 없이 단독 테스트 가능
- 60fps 목표 — `requestAnimationFrame` + `performance.now()` 델타타임 기반 업데이트
- 모바일 터치 지원 — 모든 인터랙션은 `PointerEvent`로 통합 처리
- Canvas 크기는 `window.resize` 시 자동 재조정
- 각 모드는 독립 클래스로 분리 — `mount()` / `update(dt)` / `unmount()` 인터페이스 통일

### CHARM (이 프로젝트 특수 원칙)
- 모든 인터랙션은 **즉각적** (1프레임 내 시각+음향 동시 반응)
- 매 클릭이 **예측 불가능하게 아름다워야** 한다 (동일 입력 ≠ 동일 결과)
- 음향 on/off 토글 반드시 구현 — 소리 없이도 완전히 즐길 수 있어야 함
- 이스터에그는 숨겨야 하지만 **발견될 수 있을 만큼** 배치

### DON'T
- WebGL, Three.js, p5.js 등 외부 캔버스 라이브러리 금지
- DOM 조작으로 시각 요소 생성 금지 — 모든 그래픽은 Canvas에만 렌더링
- `alert()`, `confirm()`, `prompt()` 금지 — UI는 Canvas 오버레이로
- `document.write()` 금지
- AdSense ID 하드코딩 금지 — `__ADSENSE_CLIENT__` 플레이스홀더 유지
- 인라인 스타일 직접 작성 금지 (AdSense `<ins style="display:block">` 예외)
- 사운드 자동재생 금지 — 반드시 사용자 첫 인터랙션 이후에만 활성화
- 음향 스킬: `.claude/skills/audio.md` — 모드별 소리 설계 필수 참조
- 시각↔음향 동기화 필수 — 이벤트 후 16ms 이상 지연 금지

## Key Features (구현 목표)

### 모드 1 — 다각형 분열 (Fracture)
- 화면 클릭 시 보로노이 다이어그램으로 무한 분열
- 분열된 조각이 물리적으로 퍼져나감
- 색상은 분열 깊이에 따라 그라디언트 변화

### 모드 2 — 슬라임 (Slime)
- 마우스 드래그로 점탄성 메쉬 변형
- 놓으면 천천히 원래 형태로 복원
- 터치 멀티핑거 지원

### 모드 3 — 파괴 (Destroy)
- 클릭/드래그로 블록을 부수거나 쌓기
- 중력 + 충돌 물리 적용
- 화면 밖으로 떨어진 블록 자동 제거

### 모드 4 — 파동 연못 (Ripple)
- 클릭 지점에서 리플 파동 발생
- 파동이 겹치면 간섭 패턴 생성
- 배경 색상이 파동 에너지에 따라 변화

### 모드 전환
- 화면 하단 아이콘 4개 (텍스트 없음, 이모지/SVG 아이콘만)
- 전환 시 부드러운 fade 애니메이션

### 광고 슬롯 (`.claude/skills/ad.md` 참조)
- **상단 배너** (728×90 / 320×50 모바일) — Canvas 위 고정, CLS 방지 고정 높이 필수
- **모드 전환 인터스티셜** — 15초 쿨다운, 5초 후 자동 닫힘, 스킵 버튼 필수
- **5분 체류 보너스 배너** — 자발적 추가 노출
- Canvas 높이 = `100vh - 배너높이(90px) - nav높이(60px)` 로 정확히 계산

## Performance Contract
- 목표 FPS: 60 (최소 30 보장)
- 보로노이 분열: 화면당 최대 500개 셀
- 물리 오브젝트: 화면당 최대 200개 (초과 시 오래된 것부터 제거)
- 슬라임 메쉬: 최대 32×32 그리드

## Verification Contract
모든 커밋 전:
- [ ] `npm test` 전체 통과
- [ ] Chrome/Safari/Firefox 60fps 확인
- [ ] 모바일(375px) 터치 동작 확인
- [ ] 키보드 Tab으로 모드 전환 가능 (접근성)

## Agent Team Structure
```
                    ┌──────────────────┐
                    │   ORCHESTRATOR   │
                    └────────┬─────────┘
          ┌─────────┬────────┴─────────┬─────────┐
          ▼         ▼                  ▼         ▼
    ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐
    │ DESIGNER │ │  CODER   │ │SECURITY  │ │  MARKETING   │
    │비주얼/UX │ │엔진/테스트│ │XSS/CSP   │ │SEO/바이럴    │
    └────┬─────┘ └────┬─────┘ └────┬─────┘ └──────┬───────┘
         └────────────┴────────────┴───────────────┘
                      Cross-Review (동등 피어)
```

### Cross-Review 매트릭스
|            | Designer | Coder | Security | Marketing |
|------------|:---:|:---:|:---:|:---:|
| **Designer**   | —  | ✅  | ⬜  | ✅  |
| **Coder**      | ✅  | —  | ✅  | ⬜  |
| **Security**   | ⬜  | ✅  | —  | ✅  |
| **Marketing**  | ✅  | ⬜  | ⬜  | —  |

- BLOCK 권한: Security만
- 이터레이션 제한: 동일 태스크 최대 3회

## Context Loading Order
1. `CLAUDE.md` (이 파일) — 항상
2. `.claude/agents/orchestrator.md`
3. 담당 에이전트 파일
4. 해당 skill 파일 (음향 관련이면 `audio.md`, 광고 관련이면 `ad.md` 추가)
5. 수정 대상 소스 파일
6. 관련 테스트 파일

## Session Handoff
`tasks/progress.md`에 기록:
- 완료 모드 / 현재 작업 파일 / 다음 할 일 / 미해결 버그 / FPS 측정값
