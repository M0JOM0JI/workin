# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

**Workin** - 알바생 관리 서비스 (스케줄 · 출퇴근 · 급여 통합 플랫폼)

- 사장(오너/매니저): 다중 매장 스케줄 작성, 출근 현황, 급여 관리
- 알바생: 출퇴근 체크, 스케줄/급여 확인
- 플랫폼: 웹 (Next.js) + 모바일 앱 (React Native Expo)

## 기술 스택

- **모노레포**: Turborepo + npm workspaces
- **웹**: Next.js 14 (App Router) + Tailwind + shadcn/ui
- **모바일**: React Native + Expo SDK 51 (expo-router)
- **백엔드**: NestJS 10 + Prisma 5 + PostgreSQL 16
- **인증**: JWT (Access 15분 / Refresh 7일), passport-jwt
- **상태관리**: Zustand + TanStack Query v5
- **공통**: TypeScript 5 전체 적용

## 프로젝트 구조

```
workin/
├── apps/
│   ├── web/          # Next.js 웹 - 사장용 대시보드 (port 3001)
│   ├── mobile/       # Expo 앱 - 알바생 출근앱 (port 8081)
│   └── api/          # NestJS REST API (port 3000)
│       └── prisma/   # schema.prisma, migrations
├── packages/
│   ├── types/        # 공유 TypeScript 타입 (@workin/types)
│   └── utils/        # 공유 유틸 - formatKRW, calcPayroll 등 (@workin/utils)
└── docs/             # PRD, WIREFRAME, TECH_SPEC
```

## 개발 명령어

```bash
# 최초 세팅
npm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.local.example apps/web/.env.local
docker-compose up -d                    # PostgreSQL(5432) + Redis(6379)
cd apps/api && npx prisma migrate dev   # DB 마이그레이션

# 개발 서버 (루트에서)
npm run dev          # 웹(3001) + API(3000) 동시 실행

# 모바일 (별도 터미널)
cd apps/mobile && npx expo start

# 개별 실행
cd apps/api && npm run dev
cd apps/web && npm run dev

# 테스트
npm run test                            # 전체
cd apps/api && npm run test             # API 전체
cd apps/api && npm run test -- --testPathPattern=auth  # 특정 파일

# DB
cd apps/api
npx prisma migrate dev --name <이름>   # 마이그레이션 생성
npx prisma studio                      # DB GUI (port 5555)
npx prisma db seed                     # 시드 데이터

# 빌드
npm run build        # 전체 빌드 (Turborepo)
```

## 역할별 권한

| 역할 | 핵심 제한 |
|------|-----------|
| OWNER | 매장 생성/삭제, 매니저 임명 가능. 모든 기능 접근 |
| MANAGER | 알바생 초대(STAFF만), 스케줄 작성, 급여 조회. 매장 설정 수정 불가 |
| STAFF | 출퇴근 체크, 본인 스케줄/급여 조회만 가능 |

## API 규칙

- Base URL: `/api/v1`, Swagger: `http://localhost:3000/api/docs`
- 매장 관련: `/stores/:storeId` prefix 필수
- 알바생 본인 데이터: `/me` prefix (`/me/attendance`, `/me/payroll`)
- 인증: `Authorization: Bearer {accessToken}` 헤더
- 권한 체크: `StoresService.assertRole()` / `assertMember()` 사용

## 아키텍처 핵심 패턴

### API (NestJS)
- `PrismaModule`은 `@Global()`로 선언되어 모든 모듈에서 자동 주입
- 권한 검증은 각 Service에서 `StoresService.assertRole(storeId, userId, [Role.OWNER])` 호출
- `@CurrentUser('id')` 데코레이터로 JWT에서 userId 추출
- DTO는 `class-validator` 데코레이터로 자동 검증 (ValidationPipe 전역 등록)

### 웹 (Next.js)
- `src/lib/api.ts`: axios 인스턴스, 401 시 자동 토큰 갱신 인터셉터 포함
- `src/store/auth.store.ts`: Zustand persist로 인증 상태 관리
- App Router 사용, 서버 컴포넌트 기본, 클라이언트 필요 시 `'use client'`

### 모바일 (Expo)
- `expo-router` 기반 파일 라우팅: `(auth)`, `(tabs)` 그룹
- 토큰은 `expo-secure-store`에 저장 (보안)
- `lib/api.ts`: 웹과 동일한 axios 인터셉터 패턴

### 공유 패키지
- `@workin/types`: API 응답 타입 (User, Store, Schedule, Attendance, Payroll)
- `@workin/utils`: `formatKRW`, `formatMinutes`, `calcPayroll`, `calcWeeklyAllowance`

## 주요 문서

- [PRD (기획서)](docs/PRD.md)
- [화면 설계서](docs/WIREFRAME.md)
- [기술 스펙](docs/TECH_SPEC.md)
