import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ─── 타임존 독립적 날짜 헬퍼 ─────────────────────────────────
// KST(UTC+9) 날짜·시간 → UTC Date (환경 타임존 무관)
function kstUTC(year: number, month: number, day: number, kstHour: number, kstMin = 0): Date {
  // KST = UTC+9 이므로 UTC 시간 = KST 시간 - 9
  let utcHour = kstHour - 9;
  let utcDay  = day;
  let utcMonth = month;
  let utcYear  = year;
  if (utcHour < 0) { utcHour += 24; utcDay -= 1; }
  const d = new Date(Date.UTC(utcYear, utcMonth - 1, utcDay, utcHour, kstMin, 0, 0));
  return d;
}

// KST 날짜에 N일 더하기
function addKSTDays(year: number, month: number, day: number, delta: number) {
  const d = new Date(Date.UTC(year, month - 1, day + delta));
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate() };
}

// ─────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Seeding database...');

  // 기존 시드 데이터 정리 (schedules, attendances 먼저)
  await prisma.attendance.deleteMany({});
  await prisma.schedule.deleteMany({});
  console.log('✅ Cleaned old seed data');

  // ──────────────────────────────────────────
  // 1. 오너 유저 upsert
  // ──────────────────────────────────────────
  const ownerPassword = await bcrypt.hash('test1234!', 10);
  const owner = await prisma.user.upsert({
    where: { email: 'owner@test.com' },
    update: { name: '홍길동', phone: '010-0000-0001' },
    create: { email: 'owner@test.com', name: '홍길동', phone: '010-0000-0001', password: ownerPassword },
  });
  console.log('✅ Owner:', owner.email);

  // ──────────────────────────────────────────
  // 2. 매장 upsert
  // ──────────────────────────────────────────
  let store = await prisma.store.findFirst({ where: { ownerId: owner.id } });
  if (!store) {
    store = await prisma.store.create({
      data: { name: '스타벅스 강남점', address: '서울 강남구 테헤란로 123', category: '카페', ownerId: owner.id },
    });
  }
  console.log('✅ Store:', store.name, '/', store.id);

  // 오너 StoreStaff
  await prisma.storeStaff.upsert({
    where: { storeId_userId: { storeId: store.id, userId: owner.id } },
    update: {},
    create: { storeId: store.id, userId: owner.id, role: Role.OWNER, hourlyWage: 0 },
  });

  // ──────────────────────────────────────────
  // 3. 알바생 / 매니저
  // ──────────────────────────────────────────
  const staffPassword = await bcrypt.hash('test1234!', 10);
  const staffDefs = [
    { email: 'manager@test.com', name: '이지은', phone: '010-2222-3333', role: Role.MANAGER, hourlyWage: 12000 },
    { email: 'staff1@test.com',  name: '김민수', phone: '010-1111-2222', role: Role.STAFF,   hourlyWage: 10030 },
    { email: 'staff2@test.com',  name: '박준혁', phone: '010-3333-4444', role: Role.STAFF,   hourlyWage: 10030 },
    { email: 'staff3@test.com',  name: '최유진', phone: '010-4444-5555', role: Role.STAFF,   hourlyWage: 10500 },
  ];

  const staffRecords: { user: any; ss: any }[] = [];
  for (const s of staffDefs) {
    const user = await prisma.user.upsert({
      where: { email: s.email },
      update: { name: s.name, phone: s.phone },
      create: { email: s.email, name: s.name, phone: s.phone, password: staffPassword },
    });
    const ss = await prisma.storeStaff.upsert({
      where: { storeId_userId: { storeId: store.id, userId: user.id } },
      update: { role: s.role, hourlyWage: s.hourlyWage },
      create: { storeId: store.id, userId: user.id, role: s.role, hourlyWage: s.hourlyWage },
    });
    staffRecords.push({ user, ss });
    console.log(`✅ Staff: ${user.name} (${s.role})`);
  }

  // ──────────────────────────────────────────
  // 4. 스케줄 & 출퇴근
  //    KST 기준 이번 주 월요일: 2026-04-20
  // ──────────────────────────────────────────
  // weekMons[0] = 이번 주, weekMons[-1..] = 지난 주
  // KST 월요일 날짜 목록 (이번 주 포함 4주)
  const baseMonKST = { y: 2026, m: 4, d: 20 }; // 이번 주 월요일 KST

  // 시프트 패턴: staffIdx(0=이지은,1=김민수,2=박준혁,3=최유진), dayOffset, kstStartH, kstEndH
  type Shift = { si: number; day: number; sh: number; eh: number };
  const pattern: Shift[] = [
    // 이지은(매니저) 월·수·금
    { si: 0, day: 0, sh: 10, eh: 18 },
    { si: 0, day: 2, sh: 10, eh: 18 },
    { si: 0, day: 4, sh: 10, eh: 18 },
    // 김민수(알바) 월~금 오전
    { si: 1, day: 0, sh: 9,  eh: 14 },
    { si: 1, day: 1, sh: 9,  eh: 14 },
    { si: 1, day: 2, sh: 9,  eh: 14 },
    { si: 1, day: 3, sh: 9,  eh: 14 },
    { si: 1, day: 4, sh: 9,  eh: 14 },
    // 박준혁(알바) 월~금 오후
    { si: 2, day: 0, sh: 14, eh: 20 },
    { si: 2, day: 1, sh: 14, eh: 20 },
    { si: 2, day: 2, sh: 14, eh: 20 },
    { si: 2, day: 3, sh: 14, eh: 20 },
    { si: 2, day: 4, sh: 14, eh: 20 },
    // 최유진(알바) 주말
    { si: 3, day: 5, sh: 10, eh: 18 },
    { si: 3, day: 6, sh: 10, eh: 18 },
  ];

  // 오늘 KST: 2026-04-22 (수요일 = baseMonKST + 2일)
  const todayKST = addKSTDays(baseMonKST.y, baseMonKST.m, baseMonKST.d, 2);
  const todayStartUTC = new Date(Date.UTC(todayKST.y, todayKST.m - 1, todayKST.d, 0, 0, 0));  // 오늘 KST 00:00 = UTC 전날 15:00
  const todayEndUTC   = new Date(Date.UTC(todayKST.y, todayKST.m - 1, todayKST.d + 1, 0, 0, 0)); // 내일 KST 00:00

  let schedCount = 0;
  let attCount   = 0;

  for (let weekOffset = -3; weekOffset <= 0; weekOffset++) {
    const mon = addKSTDays(baseMonKST.y, baseMonKST.m, baseMonKST.d, weekOffset * 7);
    const isCurrentWeek = weekOffset === 0;

    for (const shift of pattern) {
      const kstDate = addKSTDays(mon.y, mon.m, mon.d, shift.day);
      const startAt = kstUTC(kstDate.y, kstDate.m, kstDate.d, shift.sh);
      const endAt   = kstUTC(kstDate.y, kstDate.m, kstDate.d, shift.eh);
      const ssId    = staffRecords[shift.si].ss.id;

      // 현재 주: 오늘(수요일) 이후 스케줄 skip
      if (isCurrentWeek && startAt >= todayEndUTC) continue;

      // 스케줄 생성 (중복 방지)
      let sched = await prisma.schedule.findFirst({ where: { staffId: ssId, startAt } });
      if (!sched) {
        sched = await prisma.schedule.create({
          data: { storeId: store.id, staffId: ssId, startAt, endAt },
        });
      }
      schedCount++;

      // 출퇴근 생성: 과거는 완료, 오늘은 clock-in만
      const existing = await prisma.attendance.findFirst({ where: { staffId: ssId, clockIn: { gte: startAt, lt: endAt } } });
      if (existing) continue;

      // ±5분 jitter
      const jitter = Math.round((Math.random() * 10 - 5)) * 60 * 1000;
      const clockIn  = new Date(startAt.getTime() + jitter);
      const clockOut = (isCurrentWeek && startAt >= todayStartUTC)
        ? null
        : new Date(endAt.getTime() + Math.round((Math.random() * 20 - 10)) * 60 * 1000);

      await prisma.attendance.create({
        data: { storeId: store.id, staffId: ssId, scheduleId: sched.id, clockIn, clockOut },
      });
      attCount++;
    }
  }

  console.log(`✅ Schedules: ${schedCount}, Attendances: ${attCount}`);

  // ──────────────────────────────────────────
  // 검증
  // ──────────────────────────────────────────
  const [users, staffs, scheds, atts] = await Promise.all([
    prisma.user.count(),
    prisma.storeStaff.count(),
    prisma.schedule.count(),
    prisma.attendance.count(),
  ]);
  console.log(`\n📊 DB 현황: Users=${users} StoreStaffs=${staffs} Schedules=${scheds} Attendances=${atts}`);

  // 오늘 스케줄 검증
  const todayScheds = await prisma.schedule.findMany({
    where: { startAt: { gte: todayStartUTC, lt: todayEndUTC } },
    include: { staff: { include: { user: true } } },
    orderBy: { startAt: 'asc' },
  });
  console.log('\n📅 오늘(KST 2026-04-22) 스케줄:');
  todayScheds.forEach(s =>
    console.log(`  ${s.staff.user.name}: ${s.startAt.toISOString()} ~ ${s.endAt.toISOString()} (KST ${s.startAt.getUTCHours()+9}:00~${s.endAt.getUTCHours()+9}:00)`)
  );

  console.log('\n🎉 Seed complete!');
  console.log('  owner@test.com   / test1234!');
  console.log('  manager@test.com / test1234!');
  console.log('  staff1@test.com  / test1234!  (김민수)');
  console.log('  staff2@test.com  / test1234!  (박준혁)');
  console.log('  staff3@test.com  / test1234!  (최유진)');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
