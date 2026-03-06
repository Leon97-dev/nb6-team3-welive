const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const path = require('path');
const dotenv = require('dotenv');

// ==============================================
// ⭐️ 시드 데이터 생성 로직 구현을 위한 유틸리티 및 설정
// ==============================================
// 1) .env 파일에서 환경 변수 로드
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// 2) Prisma 클라이언트 인스턴스 생성
const prisma = new PrismaClient();

// 3) 시드 데이터에 사용할 기본 비밀번호 (모든 사용자에게 동일한 비밀번호 사용)
const PASSWORD_PLAIN = 'welive1234@';

// 4) 연락처 생성 함수 (010으로 시작하는 11자리 번호 생성)
function makeContact(index) {
  return `010${String(10000000 + index).slice(-8)}`;
}

// ==============================================
// ⭐️ 시드 데이터 생성 로직 구현을 위한 유틸리티 함수들
// ==============================================
// 1) 입주민과 거주자 명부 데이터를 생성하는 함수
function createResidentSeedRows(apartmentId, approverId, passwordHash) {
  const residents = [];
  const residentRosters = [];

  let contactIndex = 1;
  for (let building = 101; building <= 103; building += 1) {
    for (let floor = 1; floor <= 3; floor += 1) {
      for (let unit = 1; unit <= 2; unit += 1) {
        const unitNumber = `${floor}0${unit}`;
        const email = `user${building}-${unitNumber}@test.com`;
        const username = email;
        const contact = makeContact(contactIndex);
        const isHouseholder = unit === 1 ? 'HOUSEHOLDER' : 'MEMBER';

        const resident = {
          username,
          email,
          passwordHash,
          name: `입주민 ${building}-${unitNumber}`,
          contact,
          role: 'USER',
          approvalStatus: 'APPROVED',
          isRegistered: true,
          isHouseholder,
          building: String(building),
          unitNumber,
          apartmentId,
          approvedById: approverId,
          approvedAt: new Date(),
        };
        residents.push(resident);

        residentRosters.push({
          apartmentId,
          name: resident.name,
          contact,
          building: String(building),
          unitNumber,
          isHouseholder,
          residenceStatus: 'RESIDENCE',
          email,
        });

        contactIndex += 1;
      }
    }
  }

  return { residents, residentRosters };
}

// 2) 시드 데이터 생성 전에 기존 데이터를 모두 삭제하는 함수
async function resetAllData() {
  await prisma.authSession.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.pollVote.deleteMany();
  await prisma.pollOption.deleteMany();
  await prisma.apartmentSchedule.deleteMany();
  await prisma.notice.deleteMany();
  await prisma.complaint.deleteMany();
  await prisma.poll.deleteMany();
  await prisma.board.deleteMany();
  await prisma.residentRoster.deleteMany();
  await prisma.apartment.deleteMany();
  await prisma.user.deleteMany();
}

// ==============================================
// ⭐️ 메인 시드 함수 - 데이터 생성 로직 구현
// ==============================================
async function main() {
  // 1) 모든 사용자에게 동일한 비밀번호를 해시하여 저장
  const passwordHash = await bcrypt.hash(PASSWORD_PLAIN, 10);

  // 2) 기존 데이터 삭제
  await resetAllData();

  // 3) 최고 관리자 계정 생성
  const superAdmin = await prisma.user.create({
    data: {
      username: 'superadmin@test.com',
      email: 'superadmin@test.com',
      passwordHash,
      name: '최고 관리자',
      contact: '01099998888',
      role: 'SUPER_ADMIN',
      approvalStatus: 'APPROVED',
      isRegistered: true,
      approvedAt: new Date(),
    },
  });

  // 4) 아파트 단지 생성
  const apartment = await prisma.apartment.create({
    data: {
      name: '위리브 1단지',
      address: '서울시 강남구 위리브로 1',
      officeNumber: '02-1234-5678',
      description: '위리브 1단지 관리 사무소',
      startComplexNumber: 1,
      endComplexNumber: 1,
      startDongNumber: 101,
      endDongNumber: 103,
      startFloorNumber: 1,
      endFloorNumber: 3,
      startHoNumber: 1,
      endHoNumber: 2,
      apartmentStatus: 'APPROVED',
    },
  });

  // 5) 아파트 단지 관리자 계정 생성 (단지당 1명)
  const admin = await prisma.user.create({
    data: {
      username: 'admin101@test.com',
      email: 'admin101@test.com',
      passwordHash,
      name: '1단지 관리자',
      contact: makeContact(700),
      role: 'ADMIN',
      approvalStatus: 'APPROVED',
      isRegistered: true,
      apartmentId: apartment.id,
      approvedById: superAdmin.id,
      approvedAt: new Date(),
    },
  });

  // 6) 아파트 단지 대표 관리자(adminId) 연결
  await prisma.apartment.update({
    where: { id: apartment.id },
    data: { adminId: admin.id },
  });

  // 7) 입주민과 거주자 명부 데이터 생성 및 저장
  const { residents, residentRosters } = createResidentSeedRows(
    apartment.id,
    admin.id,
    passwordHash
  );

  for (const residentData of residents) {
    await prisma.user.create({ data: residentData });
  }

  const usersByEmail = Object.fromEntries(
    (
      await prisma.user.findMany({
        where: {
          role: 'USER',
          apartmentId: apartment.id,
          deletedAt: null,
        },
        select: { id: true, email: true },
      })
    ).map((u) => [u.email, u])
  );

  for (const rosterData of residentRosters) {
    await prisma.residentRoster.create({
      data: {
        apartmentId: rosterData.apartmentId,
        name: rosterData.name,
        contact: rosterData.contact,
        building: rosterData.building,
        unitNumber: rosterData.unitNumber,
        isHouseholder: rosterData.isHouseholder,
        residenceStatus: rosterData.residenceStatus,
        userId: usersByEmail[rosterData.email]?.id ?? null,
      },
    });
  }

  // 8) 공지사항 게시판 생성
  const noticeBoard = await prisma.board.create({
    data: {
      apartmentId: apartment.id,
      type: 'NOTICE',
      name: '공지사항 게시판',
    },
  });

  // 9) 민원 게시판 생성
  const complaintBoard = await prisma.board.create({
    data: {
      apartmentId: apartment.id,
      type: 'COMPLAINT',
      name: '민원 게시판',
    },
  });

  // 10) 주민투표 게시판 생성
  const pollBoard = await prisma.board.create({
    data: {
      apartmentId: apartment.id,
      type: 'POLL',
      name: '주민투표 게시판',
    },
  });

  // 11) 투표 게시판에 투표 2개 생성 (1개는 진행 중, 1개는 종료)
  const pollInProgress = await prisma.poll.create({
    data: {
      apartmentId: apartment.id,
      boardId: pollBoard.id,
      authorId: admin.id,
      title: '단지 내 헬스장 운영시간 연장 찬반',
      content: '헬스장 운영시간을 1시간 연장하는 안건입니다.',
      status: 'IN_PROGRESS',
      targetType: 'ALL',
      buildingPermission: 0,
      startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    },
  });

  // 12) 종료된 투표는 7일 전에 시작해서 7일 전에 종료되도록 설정
  const pollClosed = await prisma.poll.create({
    data: {
      apartmentId: apartment.id,
      boardId: pollBoard.id,
      authorId: admin.id,
      title: '102동 엘리베이터 교체 일정 동의',
      content: '102동 엘리베이터 교체 공사 일정을 확정합니다.',
      status: 'CLOSED',
      targetType: 'BUILDING',
      buildingPermission: 102,
      startDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    },
  });

  // 13) 각 투표에 2개의 선택지 생성
  const [poll1OptYes, poll1OptNo] = await Promise.all([
    prisma.pollOption.create({
      data: { pollId: pollInProgress.id, title: '찬성', sortOrder: 1 },
    }),
    prisma.pollOption.create({
      data: { pollId: pollInProgress.id, title: '반대', sortOrder: 2 },
    }),
  ]);

  // 14) 종료된 투표는 찬성/반대 대신 일정 동의/연기 선택지로 생성
  const [poll2OptAgree, poll2OptDelay] = await Promise.all([
    prisma.pollOption.create({
      data: { pollId: pollClosed.id, title: '일정 동의', sortOrder: 1 },
    }),
    prisma.pollOption.create({
      data: { pollId: pollClosed.id, title: '일정 연기', sortOrder: 2 },
    }),
  ]);

  // 15) 각 투표에 2명씩 투표 참여 (총 4명, 중복 없이)
  const userSampleA = usersByEmail['user101-101@test.com'];
  const userSampleB = usersByEmail['user102-101@test.com'];
  const userSampleC = usersByEmail['user103-102@test.com'];
  const userSampleD = usersByEmail['user102-201@test.com'];

  await prisma.pollVote.createMany({
    data: [
      {
        pollId: pollInProgress.id,
        optionId: poll1OptYes.id,
        userId: userSampleA.id,
      },
      {
        pollId: pollInProgress.id,
        optionId: poll1OptNo.id,
        userId: userSampleB.id,
      },
      {
        pollId: pollInProgress.id,
        optionId: poll1OptYes.id,
        userId: userSampleC.id,
      },
      {
        pollId: pollClosed.id,
        optionId: poll2OptAgree.id,
        userId: userSampleB.id,
      },
      {
        pollId: pollClosed.id,
        optionId: poll2OptDelay.id,
        userId: userSampleD.id,
      },
    ],
  });

  await prisma.pollOption.update({
    where: { id: poll1OptYes.id },
    data: { voteCount: 2 },
  });
  await prisma.pollOption.update({
    where: { id: poll1OptNo.id },
    data: { voteCount: 1 },
  });
  await prisma.pollOption.update({
    where: { id: poll2OptAgree.id },
    data: { voteCount: 1 },
  });
  await prisma.pollOption.update({
    where: { id: poll2OptDelay.id },
    data: { voteCount: 1 },
  });

  // 16) 일반 공지사항 생성
  const noticeGeneral = await prisma.notice.create({
    data: {
      apartmentId: apartment.id,
      authorId: admin.id,
      title: '소방 안전 점검 안내',
      content: '이번 주 금요일 오전 10시부터 소방 안전 점검이 진행됩니다.',
      category: 'MAINTENANCE',
      importance: 'IMPORTANT',
      isPinned: true,
      viewsCount: 12,
      commentsCount: 1,
    },
  });

  // 17) 투표 결과에 따른 공지사항 생성 (투표 종료 후 일정 확정 공지)
  const noticeFromPoll = await prisma.notice.create({
    data: {
      apartmentId: apartment.id,
      authorId: admin.id,
      title: '102동 엘리베이터 교체 일정 확정',
      content: '투표 결과에 따라 102동 엘리베이터 교체 일정이 확정되었습니다.',
      category: 'RESIDENT_VOTE',
      importance: 'NORMAL',
      pollId: pollClosed.id,
      viewsCount: 7,
    },
  });

  await prisma.apartmentSchedule.create({
    data: {
      apartmentId: apartment.id,
      noticeId: noticeGeneral.id,
      title: '소방 안전 점검',
      description: '각 세대 소방 장비 점검',
      startDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      endDate: new Date(
        Date.now() + 2 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000
      ),
      createdById: admin.id,
    },
  });

  // 18) 처리 중인 민원 생성 (민원 등록 후 2일 뒤에 처리 중으로 변경된 것으로 설정)
  const complaintOpen = await prisma.complaint.create({
    data: {
      apartmentId: apartment.id,
      boardId: complaintBoard.id,
      authorId: userSampleA.id,
      title: '주차장 조명 수리 요청',
      content: '지하 1층 주차장 조명이 깜빡거립니다.',
      isPublic: true,
      status: 'IN_PROGRESS',
      building: '101',
      unitNumber: '101',
      viewsCount: 9,
      commentsCount: 1,
    },
  });

  // 19) 처리 완료된 민원 생성 (민원 등록 후 3일 뒤에 처리 완료로 변경된 것으로 설정)
  const complaintDone = await prisma.complaint.create({
    data: {
      apartmentId: apartment.id,
      boardId: complaintBoard.id,
      authorId: userSampleD.id,
      title: '102동 복도 전등 교체',
      content: '102동 2층 복도 전등이 나갔습니다.',
      isPublic: false,
      status: 'RESOLVED',
      building: '102',
      unitNumber: '201',
      viewsCount: 4,
      commentsCount: 1,
    },
  });

  await prisma.comment.createMany({
    data: [
      {
        apartmentId: apartment.id,
        boardType: 'NOTICE',
        boardId: noticeGeneral.id,
        authorId: userSampleB.id,
        content: '안내 감사합니다. 확인했습니다.',
      },
      {
        apartmentId: apartment.id,
        boardType: 'COMPLAINT',
        boardId: complaintOpen.id,
        authorId: admin.id,
        content: '현장 확인 후 오늘 내 처리 예정입니다.',
      },
      {
        apartmentId: apartment.id,
        boardType: 'POLL',
        boardId: pollInProgress.id,
        authorId: userSampleC.id,
        content: '운영시간 연장에 찬성합니다.',
      },
    ],
  });

  await prisma.notification.createMany({
    data: [
      {
        receiverId: superAdmin.id,
        type: 'ADMIN_SIGNUP_REQUESTED',
        title: '관리자 가입 요청',
        message: '신규 관리자 가입 요청이 도착했습니다.',
        isRead: false,
      },
      {
        receiverId: admin.id,
        type: 'RESIDENT_SIGNUP_REQUESTED',
        title: '입주민 가입 요청',
        message: '새 입주민 가입 요청이 있습니다.',
        isRead: false,
      },
      {
        receiverId: admin.id,
        type: 'COMPLAINT_CREATED',
        title: '신규 민원 등록',
        message: '주차장 조명 수리 요청 민원이 접수되었습니다.',
        relatedBoardType: 'COMPLAINT',
        relatedBoardId: complaintOpen.id,
        isRead: false,
      },
      {
        receiverId: userSampleA.id,
        type: 'NOTICE_CREATED',
        title: '신규 공지 등록',
        message: '소방 안전 점검 공지가 등록되었습니다.',
        relatedBoardType: 'NOTICE',
        relatedBoardId: noticeGeneral.id,
        isRead: false,
      },
      {
        receiverId: userSampleD.id,
        type: 'COMPLAINT_STATUS_CHANGED',
        title: '민원 처리 완료',
        message: '등록하신 민원이 처리 완료 상태로 변경되었습니다.',
        relatedBoardType: 'COMPLAINT',
        relatedBoardId: complaintDone.id,
        isRead: true,
        readAt: new Date(),
      },
      {
        receiverId: userSampleB.id,
        type: 'RESIDENT_SIGNUP_APPROVED',
        title: '가입 승인',
        message: '입주민 계정 승인이 완료되었습니다.',
        isRead: true,
        readAt: new Date(),
      },
    ],
  });

  // 20) 생성된 데이터 개수 출력
  const residentCount = await prisma.user.count({
    where: { role: 'USER', apartmentId: apartment.id },
  });
  const adminCount = await prisma.user.count({
    where: { role: 'ADMIN', apartmentId: apartment.id },
  });

  // 21) 시드 완료 메시지 출력 및 주요 정보 안내
  console.log(
    '===================🏠[Seed Complete]==========================='
  );
  console.log(`Super Admin: ${superAdmin.email} / ${PASSWORD_PLAIN}`);
  console.log(`Apartment: ${apartment.name}`);
  console.log(`Admins: ${adminCount}, Residents: ${residentCount}`);
  console.log(
    '==============================================================='
  );
}

// ==============================================
// ⭐️ 시드 스크립트 실행 및 에러 핸들링
// ==============================================
main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
