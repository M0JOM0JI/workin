# Workin — 로컬 개발 환경 기동 가이드

## 사전 준비
- Docker Desktop 설치 및 실행 (**반드시 데몬이 켜져 있어야 함**)
- Node.js 18+ 설치
- 루트에서 `npm install` 1회 실행

---

## 1단계 — 네이티브 PostgreSQL / Redis 중지 (기존 설치가 있는 경우)

Docker와 포트 충돌을 막으려면 winget 등으로 설치한 네이티브 서비스를 먼저 종료합니다.

```powershell
# PostgreSQL 서비스 중지
Stop-Service postgresql-x64-16 -ErrorAction SilentlyContinue

# Redis 서비스 중지
Stop-Service Redis -ErrorAction SilentlyContinue
```

---

## 2단계 — Docker로 DB / Redis 기동

```bash
# 프로젝트 루트에서
docker compose up -d
```

컨테이너 상태 확인:
```bash
docker compose ps
# NAME              STATUS
# workin-postgres   running (healthy)
# workin-redis      running (healthy)
```

> **처음 실행 시** 이미지 다운로드로 수십 초 걸릴 수 있습니다.

---

## 3단계 — 환경 변수

```bash
cp apps/api/.env.example apps/api/.env   # 이미 있으면 생략
```

`apps/api/.env` 기본값 (변경 불필요):
```
DATABASE_URL="postgresql://workin:workin1234@localhost:5432/workin_db"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="change-me-in-production"
JWT_REFRESH_SECRET="change-me-refresh-in-production"
PORT=3000
```

---

## 4단계 — DB 마이그레이션 & 시드

```bash
cd apps/api
npx prisma migrate dev   # 마이그레이션 적용
npx prisma db seed       # 테스트 데이터 삽입 (선택)
```

시드 계정:

| 이메일 | 비밀번호 | 역할 |
|--------|----------|------|
| owner@test.com | test1234! | 오너 (홍길동) |
| manager@test.com | test1234! | 매니저 (이지은) |
| staff1@test.com | test1234! | 알바생 (김민수) |
| staff2@test.com | test1234! | 알바생 (박준혁) |
| staff3@test.com | test1234! | 알바생 (최유진) |

---

## 5단계 — 개발 서버 실행

### 웹 + API 동시 실행 (루트에서)
```bash
npm run dev
```
- 웹 대시보드: http://localhost:3001
- API 서버:    http://localhost:3000
- Swagger:     http://localhost:3000/api/docs

### 개별 실행
```bash
cd apps/api && npm run dev       # API만
cd apps/web && npm run dev       # 웹만
cd apps/mobile && npx expo start # 모바일
```

---

## Docker 관리 명령어

```bash
docker compose up -d       # 백그라운드 기동
docker compose down        # 컨테이너 종료 (데이터 유지)
docker compose down -v     # 컨테이너 + 볼륨 전체 삭제 (데이터 초기화)
docker compose logs -f     # 로그 스트리밍
docker compose ps          # 상태 확인
```

---

## 트러블슈팅

| 증상 | 원인 | 해결 |
|------|------|------|
| `failed to connect to docker API` | Docker Desktop 미실행 | Docker Desktop 앱 실행 후 재시도 |
| 포트 5432 / 6379 충돌 | 네이티브 PG·Redis 실행 중 | 1단계 참고하여 네이티브 서비스 중지 |
| `DATABASE_URL` 연결 실패 | Docker 컨테이너 미기동 | `docker compose up -d` |
| `Redis 연결 오류` 경고 | Redis 미기동 | `docker compose up -d` (초대 코드 외 기능은 정상 동작) |
| 포트 3000 충돌 | 다른 프로세스 점유 | `netstat -ano \| findstr :3000` 으로 PID 확인 후 종료 |
| Prisma 스키마 오류 | 마이그레이션 미실행 | `npx prisma migrate dev` |
| `next: command not found` | 패키지 미설치 | 루트에서 `npm install` |
