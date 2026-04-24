# Workin — 구현 현황 체크리스트

> 마지막 갱신: 2026-04-23 (출퇴근 수동 수정 구현)

---

## 범례
- ✅ 완료
- 🚧 진행 중
- ⬜ 미구현
- ⚠️ 구현됐으나 TODO/결함 있음

---

## 1. 인프라 / 공통

| 항목 | 상태 | 비고 |
|------|------|------|
| Turborepo 모노레포 구성 | ✅ | apps/*, packages/* 워크스페이스 |
| docker-compose (PostgreSQL + Redis) | ✅ | PG:5432, Redis:6379, C locale 옵션 포함 |
| Docker 기동 가이드 | ✅ | docs/STARTUP.md (Docker Desktop 기반으로 업데이트) |
| Docker Desktop 설치 | ✅ | v29.4.0, Compose v5.1.2 확인 |
| PostgreSQL 16 (Docker) | ✅ | workin-postgres 컨테이너, port 5432 |
| Redis 7 (Docker) | ✅ | workin-redis 컨테이너, port 6379 |
| workin_db 생성 (UTF-8 C locale) | ✅ | POSTGRES_INITDB_ARGS로 docker-compose에 명시 |
| Prisma 마이그레이션 실행 | ✅ | `20260421_init` 적용 완료 |
| 시드 데이터 (`prisma db seed`) | ✅ | 5명·53스케줄·53출퇴근, KST 시간 수정 포함 |
| @workin/types 패키지 | ✅ | User, Store, Schedule, Attendance, Payroll |
| @workin/utils 패키지 | ✅ | formatKRW, formatMinutes, calcPayroll, calcWeeklyAllowance, formatTime, getKSTHour, getKSTDateStr |

---

## 2. API 서버 (NestJS · port 3000)

### 2-1. 공통 인프라
| 항목 | 상태 | 비고 |
|------|------|------|
| main.ts (Swagger, CORS, ValidationPipe) | ✅ | `/api/docs` |
| PrismaModule (Global) | ✅ | |
| RedisModule (Global, ioredis) | ✅ | 연결 실패 시 경고만 출력 (graceful) |
| JwtAuthGuard | ✅ | |
| RolesGuard | ✅ | |
| @CurrentUser 데코레이터 | ✅ | JWT에서 userId 추출 |
| API 서버 기동 확인 | ✅ | port 3000, 전체 라우트 정상 등록 |

### 2-2. Auth 모듈
| 항목 | 상태 | 비고 |
|------|------|------|
| POST /auth/signup | ✅ | bcrypt 해싱, user+토큰 반환 |
| POST /auth/login | ✅ | user + accessToken + refreshToken 반환 |
| POST /auth/refresh | ✅ | Refresh 토큰 갱신 |
| GET /auth/me | ✅ | 내 정보 조회 |
| JWT Strategy (passport-jwt) | ✅ | |
| PATCH /auth/me (프로필 수정) | ⬜ | 이름·전화번호 변경 |

### 2-3. Stores 모듈
| 항목 | 상태 | 비고 |
|------|------|------|
| GET /stores | ✅ | 내 매장 목록 (store 정보 포함) |
| POST /stores | ✅ | 매장 생성 + OWNER 자동 등록 |
| Store 모델 필드 확장 (DB 마이그레이션) | ✅ | businessOwner, businessNumber, phone, mobilePhone 컬럼 추가 |
| CreateStoreDto 필드 확장 | ✅ | 사업자명, 사업자번호, 매장전화번호, 휴대폰번호 추가 |
| GET /stores/:id | ✅ | |
| GET /stores/:id/staffs | ✅ | 직원 목록 (user 정보 포함) |
| PATCH /stores/:id | ✅ | OWNER만 |
| DELETE /stores/:id | ✅ | OWNER만 |
| POST /stores/:id/invite | ✅ | Redis TTL 24h 초대 코드 발급 |
| POST /stores/join | ✅ | 코드 검증 → 멤버 등록 → 코드 삭제 |
| assertRole / assertMember 헬퍼 | ✅ | |
| PATCH /stores/:id/staffs/:staffId (시급·퇴직 처리) | ✅ | hourlyWage 수정, leftAt 업데이트 |

### 2-4. Schedules 모듈
| 항목 | 상태 | 비고 |
|------|------|------|
| GET /stores/:id/schedules | ✅ | from/to 날짜 범위 쿼리 |
| POST /stores/:id/schedules | ✅ | |
| PATCH /stores/:id/schedules/:sid | ✅ | |
| DELETE /stores/:id/schedules/:sid | ✅ | |

### 2-5. Attendance 모듈
| 항목 | 상태 | 비고 |
|------|------|------|
| POST /stores/:id/attendance/clock-in | ✅ | 중복 출근 방지 |
| POST /stores/:id/attendance/clock-out | ✅ | |
| GET /stores/:id/attendance | ✅ | date 쿼리 파라미터 지원 |
| GET /me/attendance | ✅ | |
| PATCH /stores/:id/attendance/:id (수동 수정) | ✅ | 오너/매니저가 clockIn·clockOut 직접 수정 |

### 2-6. Payroll 모듈
| 항목 | 상태 | 비고 |
|------|------|------|
| GET /stores/:id/payroll | ✅ | year/month 또는 yearMonth 파라미터 지원, summary 형태 반환 |
| GET /stores/:id/payroll/:staffId | ✅ | |
| GET /me/payroll | ✅ | |

---

## 3. 웹 대시보드 (Next.js · port 3001)

### 3-1. 공통 인프라
| 항목 | 상태 | 비고 |
|------|------|------|
| App Router 기본 구조 | ✅ | (dashboard) 라우트 그룹 |
| Tailwind + PostCSS 설정 | ✅ | |
| CSS 디자인 토큰 (globals.css) | ✅ | |
| Axios 인스턴스 + 401 자동 갱신 | ✅ | src/lib/api.ts |
| Zustand 인증 스토어 | ✅ | user + accessToken + stores + currentStoreId persist |
| TanStack Query Provider | ✅ | providers.tsx |
| 다중 매장 전환 | ⚠️ | 사이드바 select 존재하나 전환 시 데이터 리로드 검증 필요 |
| 온보딩 리다이렉트 (매장 0개 → /onboarding/store) | ✅ | 로그인·가입 후 stores.length === 0 감지 → 강제 이동 |
| 사이드바 `+ 매장 추가` 버튼 (OWNER만) | ✅ | 클릭 시 매장 추가 모달 오픈, OWNER만 노출 |

### 3-2. API 훅 (src/hooks/)
| 훅 | 상태 | 비고 |
|----|------|------|
| useDashboard (출근현황, 스케줄, 급여요약) | ✅ | |
| useStaffs | ✅ | |
| useSchedules + useCreateSchedule + useDeleteSchedule | ✅ | |
| useAttendance (30초 자동 갱신) | ✅ | |
| usePayroll | ✅ | |
| useCreateStore | ✅ | 사이드바 내 useMutation으로 구현 |

### 3-3. UI 컴포넌트
| 항목 | 상태 | 비고 |
|------|------|------|
| Button / Input / Card / Badge / Avatar / Spinner / Empty | ✅ | |
| Shell / Sidebar (실제 매장 목록 + 로그아웃) / Header | ✅ | |
| ScheduleBlock / StaffCard / AttendanceBadge / PayrollRow | ✅ | |
| Modal (공용) | ✅ | ESC 닫기, 백드롭 클릭 닫기, size prop |
| StoreForm (매장 생성·수정 공용 폼 컴포넌트) | ⬜ | 매장명·사업자명·사업자번호·주소·전화·업종 입력 |

### 3-4. 페이지
| 페이지 | UI | API 연동 | 비고 |
|--------|-----|---------|------|
| /auth/login | ✅ | ✅ | 로그인 후 user + stores 세팅 |
| /auth/signup | ✅ | ✅ | 이름·이메일·비밀번호·전화번호, 유효성 검사, 자동 로그인 |
| /onboarding/store (첫 매장 생성) | ✅ | ✅ | stores=0 시 강제 진입, 전체 필드, 뒤로가기 차단 |
| 사이드바 — 매장 추가 모달 | ✅ | ✅ | OWNER만 노출, 전체 필드 입력, WIREFRAME B-11 |
| /dashboard | ✅ | ✅ | 실시간 출근현황, 스케줄, 급여, 결근 감지 |
| /schedules | ✅ | ✅ | 주간 그리드 (실제 API) |
| /schedules — 시프트 추가 모달 | ✅ | ✅ | 직원 선택·날짜·KST 시간 입력 → POST |
| /schedules — 블록 삭제 | ✅ | ✅ | 블록 클릭 → 삭제 확인 모달 → DELETE |
| /staffs | ✅ | ✅ | 재직/퇴직 필터 |
| /staffs — 초대 코드 발급 UI | ✅ | ✅ | 코드 발급 모달, 클립보드 복사, 새 코드 발급 |
| /staffs — 직원 상세·시급 수정 | ✅ | ✅ | 카드 클릭 → 상세 모달, 시급 수정, 퇴직 처리 |
| /attendance | ✅ | ✅ | 30초 자동 갱신 |
| /attendance — 수동 수정 | ✅ | ✅ | 오너/매니저가 출퇴근 시간 직접 수정 |
| /payroll | ✅ | ✅ | 월 선택, summary 형태 |
| /payroll — 직원별 상세 | ✅ | ✅ | 행 클릭 → 급여 요약 + 출퇴근 내역 모달 |
| /settings | ✅ | ✅ | 매장 수정/삭제, 확장 필드(사업자명·번호·전화) 포함 |

---

## 4. 모바일 앱 (Expo · port 8081)

### 4-1. 공통 인프라
| 항목 | 상태 | 비고 |
|------|------|------|
| expo-router 파일 라우팅 | ✅ | (auth), (tabs) 그룹 |
| Axios 인스턴스 + 401 갱신 | ✅ | SecureStore 토큰 자동 첨부 |
| expo-secure-store 토큰 저장 | ✅ | setAuth/clearAuth 모두 persist |
| TanStack Query 설정 | ✅ | |
| 인증 가드 (AuthGuard) | ✅ | _layout.tsx — 미인증 시 /login 리다이렉트 |
| 디자인 토큰 (theme.ts) | ✅ | |
| KST 시간 표시 검증 | ✅ | formatTime() 적용 완료 (index/attendance/schedule) |

### 4-2. 화면
| 화면 | UI | API 연동 | 비고 |
|------|-----|---------|------|
| (auth)/login | ✅ | ✅ | SecureStore 저장 + currentStoreId 세팅 |
| (auth)/signup | ✅ | ✅ | 이름·이메일·비밀번호·전화번호, 유효성 검사, KeyboardAvoidingView |
| (tabs)/index (홈·출퇴근) | ✅ | ✅ | 출퇴근 상태 동적, 30초 갱신, KST 시간 표시 |
| (tabs)/attendance | ✅ | ✅ | 월별 출퇴근, 월 변경 네비게이션 추가 |
| (tabs)/schedule | ✅ | ✅ | 주간 스케줄, storeId TODO 해소 |
| (tabs)/payroll | ✅ | ✅ | 월별 급여, 월 변경 네비게이션 추가 |

### 4-3. 실기동 검증
| 항목 | 상태 | 비고 |
|------|------|------|
| Expo 앱 실행 확인 | ⬜ | `npx expo start` 후 전 화면 동작 검증 |
| 출퇴근 실제 흐름 테스트 | ⬜ | 모바일에서 clock-in → clock-out → 급여 반영 확인 |

---

## 5. 테스트

| 항목 | 상태 | 비고 |
|------|------|------|
| API 유닛 테스트 (Jest) | ⬜ | auth, stores, payroll 서비스 우선 |
| API E2E 테스트 | ⬜ | 회원가입 → 매장생성 → 스케줄 → 출퇴근 → 급여 전체 흐름 |
| 웹 컴포넌트 테스트 | ⬜ | |
| 수동 통합 테스트 | 🚧 | 웹(오너) + 모바일(알바생) 동시 시나리오 |

---

## 6. 2차 기능 (선택)

| 항목 | 상태 | 비고 |
|------|------|------|
| 카카오 소셜 로그인 | ⬜ | API .env에 슬롯 있음 |
| 구글 소셜 로그인 | ⬜ | API .env에 슬롯 있음 |
| 프로필 수정 (이름·전화번호) | ⬜ | PATCH /auth/me 필요 |
| 프로필 이미지 (AWS S3) | ⬜ | API .env에 슬롯 있음 |
| 모바일 푸시 알림 | ⬜ | 출근 시간 알림, 급여 확정 알림 |

---

## 7. Android / iOS 하이브리드 앱

> ⚠️ **선행 조건**: 웹 대시보드 전체 기능 완성 후 진행 (웹→WebView 래핑 전략)
> 상세 계획: [`docs/PRD.md`](docs/PRD.md) 모바일 앱 전략 섹션 / [`docs/WIREFRAME.md`](docs/WIREFRAME.md) A-01~A-06

### 7-1. 공통 사전 준비
| 항목 | 상태 | 비고 |
|------|------|------|
| Next.js PWA manifest 설정 | ⬜ | `manifest.json`, 아이콘, 스플래시 색상 |
| 앱 아이콘 디자인 (1024×1024 PNG) | ⬜ | Android / iOS 공용 마스터 소스 |
| 스플래시 스크린 이미지 | ⬜ | 배경색 + 로고, EAS 빌드용 |
| EAS CLI 설치 및 로그인 | ⬜ | `npm install -g eas-cli && eas login` |
| `app.json` / `eas.json` 설정 | ⬜ | bundleIdentifier, package명, 프로필 설정 |

### 7-2. Expo WebView Shell (A-02)
| 항목 | 상태 | 비고 |
|------|------|------|
| `expo-webview` 설치 | ⬜ | `npx expo install react-native-webview` |
| WebView Shell 컴포넌트 구현 | ⬜ | `apps/mobile/app/webview-shell.tsx` |
| JS Bridge — `SET_TOKEN` | ⬜ | 웹→앱 토큰 전달 (SecureStore 저장) |
| JS Bridge — `REQUEST_PUSH_PERMISSION` | ⬜ | 앱이 푸시 권한 요청 트리거 |
| JS Bridge — `CLEAR_AUTH` | ⬜ | 로그아웃 시 SecureStore 초기화 |
| 네이티브 뒤로가기 지원 (Android) | ⬜ | `onAndroidHardwareBackPress` 처리 |
| 네트워크 에러 화면 | ⬜ | 오프라인 시 재시도 안내 |

### 7-3. 푸시 알림 (A-03)
| 항목 | 상태 | 비고 |
|------|------|------|
| `expo-notifications` 설치 | ⬜ | EAS 빌드 필요 (Expo Go 미지원) |
| FCM 프로젝트 설정 (Android) | ⬜ | Firebase Console → `google-services.json` |
| APNs 인증서 설정 (iOS) | ⬜ | Apple Developer → `.p8` 키 → EAS Secret |
| 푸시 권한 요청 로직 | ⬜ | Bridge 연동 또는 앱 시작 시 요청 |
| API — 푸시 토큰 저장 엔드포인트 | ⬜ | `PATCH /auth/me` 또는 별도 엔드포인트 |
| 알림 발송 — 출근 예정 (30분 전) | ⬜ | NestJS 스케줄러 (@nestjs/schedule) |
| 알림 발송 — 급여 확정 | ⬜ | 급여 마감 시 일괄 발송 |

### 7-4. 딥링크 (A-04)
| 항목 | 상태 | 비고 |
|------|------|------|
| 딥링크 스킴 설정 (`workin://`) | ⬜ | `app.json` scheme 추가 |
| Universal Links 설정 (iOS) | ⬜ | `apple-app-site-association` 파일, 도메인 필요 |
| App Links 설정 (Android) | ⬜ | `assetlinks.json` 파일, 도메인 필요 |
| 초대 링크 처리 (`workin://join?code=XXXX`) | ⬜ | 앱 실행 → `/join` 화면 → `POST /stores/join` |
| 딥링크 미설치 시 웹 폴백 | ⬜ | 앱 미설치 → 웹 초대 페이지로 이동 |

### 7-5. Android — Google Play 배포 (A-05)
| 항목 | 상태 | 비고 |
|------|------|------|
| Google Play Console 계정 생성 | ⬜ | 개발자 등록비 $25 (1회) |
| EAS Build — Android 프로파일 설정 | ⬜ | `eas.json` production 프로파일 |
| AAB 빌드 (`eas build --platform android`) | ⬜ | 서명 키는 EAS 관리 또는 자체 keystore |
| 내부 테스트 트랙 업로드 | ⬜ | Play Console → 내부 테스트 → APK/AAB 업로드 |
| 스토어 등록 정보 작성 | ⬜ | 앱 이름·설명·스크린샷·아이콘·카테고리 |
| 개인정보처리방침 URL 등록 | ⬜ | 정책 페이지 필수 |
| 프로덕션 트랙 출시 | ⬜ | 검토 후 출시 (보통 1~3일) |

### 7-6. iOS — App Store 배포 (A-06)
| 항목 | 상태 | 비고 |
|------|------|------|
| Apple Developer Program 가입 | ⬜ | $99/년 |
| App Store Connect 앱 등록 | ⬜ | Bundle ID, 앱 이름 |
| EAS Build — iOS 프로파일 설정 | ⬜ | `eas.json` production 프로파일, AdHoc/AppStore |
| IPA 빌드 (`eas build --platform ios`) | ⬜ | EAS가 인증서·프로파일 자동 관리 가능 |
| TestFlight 업로드 및 내부 테스트 | ⬜ | `eas submit` 또는 Transporter 사용 |
| 스토어 등록 정보 작성 | ⬜ | 스크린샷 (6.5인치·5.5인치), 설명·키워드 |
| App Review 제출 | ⬜ | 검토 1~3일, 거절 시 피드백 대응 |

---

## 8. 다음 작업 우선순위

| 순서 | 작업 | 세부 내용 |
|------|------|----------|
| 1 | ✅ DB / API 기동 | PostgreSQL·Redis 설치, migrate, API·웹 서버 실행 완료 |
| 2 | ✅ 시드 데이터 | 5명(오너+매니저+알바3)·53스케줄·53출퇴근, KST 시간 정확 |
| 3 | ✅ 회원가입 (웹·모바일) | /auth/signup 구현 완료 |
| 4 | ✅ 주요 UI 연결 | 스케줄 추가/삭제, 초대 코드 발급, 급여 상세, 사이드바 매장 추가 |
| 5 | 🔴 매장 생성 — DB 스키마 확장 | businessOwner·businessNumber·phone·mobilePhone 컬럼 추가 마이그레이션 |
| 6 | 🔴 매장 생성 — 온보딩 페이지 | /onboarding/store (stores=0 → 강제 진입) |
| 7 | 🟡 직원 상세·시급 수정 | 웹 /staffs 카드 클릭 → 모달, PATCH /stores/:id/staffs/:staffId |
| 8 | 🟡 출퇴근 수동 수정 | 웹 /attendance 행 클릭 → 시간 수정 모달, PATCH API |
| 9 | 🟡 /settings 확장 필드 반영 | 사업자명·사업자번호·전화번호 편집 UI |
| 10 | ✅ 모바일 월 변경 네비게이션 | 출근기록·급여 탭 월 이동 버튼 |
| 11 | ✅ 모바일 schedule storeId TODO 해소 | /me/schedules 사용, TODO 주석 제거 |
| 12 | 🟢 API 테스트 작성 | Jest 유닛 + E2E (auth, stores, payroll) |
| 13 | 🟢 수동 통합 테스트 | 웹(오너) + 모바일(알바생) 전체 흐름 시나리오 |
| 14 | 🔵 Android/iOS 앱 — 사전 준비 | 아이콘·스플래시·EAS CLI·app.json (웹 완성 후) |
| 15 | 🔵 Android/iOS 앱 — WebView Shell | Bridge 구현, 뒤로가기, 오프라인 처리 |
| 16 | 🔵 Android/iOS 앱 — 푸시 알림 | FCM·APNs 설정, 알림 발송 로직 |
| 17 | 🔵 Android/iOS 앱 — 딥링크 | 초대 링크, Universal/App Links |
| 18 | 🔵 Android/iOS 앱 — Google Play 배포 | EAS Build → AAB → Play Console |
| 19 | 🔵 Android/iOS 앱 — App Store 배포 | EAS Build → IPA → TestFlight → App Store |
