# Workin 기술 스펙 문서

> 작성일: 2026-04-20 | 버전: v0.1

---

## 1. 기술 스택

### 전체 구성도

```
┌──────────────────────────────────────────────┐
│                   클라이언트                  │
│  ┌─────────────┐      ┌─────────────────┐    │
│  │  웹 (PC)    │      │  모바일 앱      │    │
│  │  Next.js 14 │      │  React Native   │    │
│  │  (App Router│      │  (Expo)         │    │
│  └──────┬──────┘      └────────┬────────┘    │
└─────────┼───────────────────────┼────────────┘
          │         HTTPS         │
┌─────────▼───────────────────────▼────────────┐
│                  백엔드 API                   │
│              NestJS (REST API)                │
│              JWT 인증                         │
└──────────────────────┬───────────────────────┘
                       │
          ┌────────────┼────────────┐
          │            │            │
     ┌────▼───┐  ┌─────▼──┐  ┌────▼────┐
     │Postgres│  │ Redis  │  │Firebase │
     │  (DB)  │  │(Cache) │  │ (Push)  │
     └────────┘  └────────┘  └─────────┘
```

### 상세 스택

| 영역 | 기술 | 버전 | 용도 |
|------|------|------|------|
| 웹 프론트 | Next.js | 14 (App Router) | 사장 전용 웹 대시보드 |
| 모바일 | React Native + Expo | SDK 51 | iOS/Android 앱 |
| 공유 UI | shadcn/ui + Tailwind | - | 웹 컴포넌트 |
| 모바일 UI | React Native Paper | - | 모바일 컴포넌트 |
| 상태관리 | Zustand | - | 클라이언트 상태 |
| 서버 상태 | TanStack Query | v5 | API 캐싱/동기화 |
| 백엔드 | NestJS | 10 | REST API 서버 |
| ORM | Prisma | 5 | DB 스키마/쿼리 |
| DB | PostgreSQL | 16 | 주 데이터베이스 |
| 캐시 | Redis | 7 | 세션, 인증코드 |
| 인증 | JWT (Access+Refresh) | - | 토큰 기반 인증 |
| 파일 | AWS S3 | - | 프로필 이미지 |
| 푸시 | Firebase FCM | - | 모바일 푸시 알림 |
| 언어 | TypeScript | 5 | 전체 공통 |

---

## 2. 프로젝트 구조

```
workin/
├── apps/
│   ├── web/          # Next.js 웹 (사장용)
│   ├── mobile/       # React Native (알바생용)
│   └── api/          # NestJS 백엔드
├── packages/
│   ├── ui/           # 공유 UI 컴포넌트
│   ├── types/        # 공유 TypeScript 타입
│   └── utils/        # 공유 유틸리티
├── docs/             # 기획/설계 문서
└── package.json      # Turborepo 모노레포 루트
```

> **모노레포** 구조로 웹/앱/API 코드를 한 저장소에서 관리 (Turborepo 사용)

---

## 3. API 설계

### Base URL
```
개발: http://localhost:3000/api/v1
운영: https://api.workin.kr/v1
```

### 인증
- Access Token: 15분 만료, Authorization 헤더로 전달
- Refresh Token: 7일 만료, HttpOnly 쿠키로 전달

### 주요 엔드포인트

#### 인증
```
POST   /auth/signup          # 회원가입
POST   /auth/login           # 로그인
POST   /auth/logout          # 로그아웃
POST   /auth/refresh         # 토큰 갱신
POST   /auth/social/kakao    # 카카오 로그인
```

#### 매장
```
GET    /stores               # 내 매장 목록
POST   /stores               # 매장 생성
GET    /stores/:id           # 매장 상세
PATCH  /stores/:id           # 매장 수정
DELETE /stores/:id           # 매장 삭제
POST   /stores/:id/invite    # 초대 코드 발급
POST   /stores/join          # 초대 코드로 합류
```

#### 직원
```
GET    /stores/:id/staffs           # 알바생 목록
GET    /stores/:id/staffs/:staffId  # 알바생 상세
PATCH  /stores/:id/staffs/:staffId  # 시급/역할 수정
DELETE /stores/:id/staffs/:staffId  # 퇴직 처리
```

#### 스케줄
```
GET    /stores/:id/schedules        # 스케줄 목록 (날짜 범위)
POST   /stores/:id/schedules        # 스케줄 생성
PATCH  /stores/:id/schedules/:sid   # 스케줄 수정
DELETE /stores/:id/schedules/:sid   # 스케줄 삭제
```

#### 출퇴근
```
GET    /stores/:id/attendance        # 출퇴근 목록
POST   /stores/:id/attendance/clock-in   # 출근
POST   /stores/:id/attendance/clock-out  # 퇴근
GET    /me/attendance                # 내 출퇴근 이력
```

#### 급여
```
GET    /stores/:id/payroll           # 월별 급여 요약
GET    /stores/:id/payroll/:staffId  # 직원별 급여 명세
GET    /me/payroll                   # 내 급여 확인
```

---

## 4. DB 스키마 (Prisma)

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String
  phone     String?
  password  String?
  createdAt DateTime @default(now())

  storeStaffs StoreStaff[]
  attendances Attendance[]
}

model Store {
  id        String   @id @default(cuid())
  name      String
  address   String?
  ownerId   String
  createdAt DateTime @default(now())

  staffs    StoreStaff[]
  schedules Schedule[]
}

model StoreStaff {
  id         String   @id @default(cuid())
  storeId    String
  userId     String
  role       Role     @default(STAFF)  // OWNER | MANAGER | STAFF
  hourlyWage Int
  joinedAt   DateTime @default(now())
  leftAt     DateTime?

  store    Store @relation(fields: [storeId], references: [id])
  user     User  @relation(fields: [userId], references: [id])
}

model Schedule {
  id        String   @id @default(cuid())
  storeId   String
  staffId   String
  startAt   DateTime
  endAt     DateTime
  memo      String?

  store      Store       @relation(fields: [storeId], references: [id])
  attendance Attendance?
}

model Attendance {
  id         String    @id @default(cuid())
  storeId    String
  staffId    String
  scheduleId String?   @unique
  clockIn    DateTime
  clockOut   DateTime?
  lat        Float?
  lng        Float?

  schedule Schedule? @relation(fields: [scheduleId], references: [id])
}

enum Role {
  OWNER
  MANAGER
  STAFF
}
```

---

## 5. 환경 변수

```env
# API 서버 (apps/api/.env)
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_SECRET=
JWT_REFRESH_SECRET=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=
FIREBASE_SERVICE_ACCOUNT=
KAKAO_CLIENT_ID=

# 웹 (apps/web/.env.local)
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1

# 모바일 (apps/mobile/.env)
EXPO_PUBLIC_API_URL=http://localhost:3000/api/v1
```

---

## 6. 개발 환경 세팅 순서

```bash
# 1. 저장소 클론 후
npm install          # 전체 의존성 설치 (Turborepo)

# 2. DB 실행 (Docker)
docker-compose up -d

# 3. DB 마이그레이션
cd apps/api
npx prisma migrate dev

# 4. 전체 개발 서버 실행
npm run dev          # 웹(3001) + API(3000) 동시 실행

# 5. 모바일 앱
cd apps/mobile
npx expo start
```

---

## 7. 배포 환경

| 환경 | 웹 | API | DB |
|------|-----|-----|-----|
| 개발 | localhost:3001 | localhost:3000 | Docker |
| 스테이징 | Vercel Preview | Railway | Railway Postgres |
| 운영 | Vercel | Railway | AWS RDS |
