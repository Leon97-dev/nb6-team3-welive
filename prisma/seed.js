const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const prisma = new PrismaClient();

const PASSWORD_PLAIN = 'test1234@';

function makeContact(index) {
  return `010${String(10000000 + index).slice(-8)}`;
}

function createResidentSeedRows(apartmentId, adminsByBuilding, passwordHash) {
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
          approvedById: adminsByBuilding[String(building)].id,
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
          occupancyStatus: 'RESIDING',
          email,
        });

        contactIndex += 1;
      }
    }
  }

  return { residents, residentRosters };
}

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

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD_PLAIN, 10);

  await resetAllData();

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

  const adminRows = [
    { building: '101', email: 'admin101@test.com', name: '101동 관리자' },
    { building: '102', email: 'admin102@test.com', name: '102동 관리자' },
    { building: '103', email: 'admin103@test.com', name: '103동 관리자' },
  ];

  const admins = [];
  for (let i = 0; i < adminRows.length; i += 1) {
    const row = adminRows[i];
    const admin = await prisma.user.create({
      data: {
        username: row.email,
        email: row.email,
        passwordHash,
        name: row.name,
        contact: makeContact(700 + i),
        role: 'ADMIN',
        approvalStatus: 'APPROVED',
        isRegistered: true,
        apartmentId: apartment.id,
        building: row.building,
        approvedById: superAdmin.id,
        approvedAt: new Date(),
      },
    });
    admins.push(admin);
  }

  await prisma.apartment.update({
    where: { id: apartment.id },
    data: { adminId: admins[0].id },
  });

  const adminsByBuilding = Object.fromEntries(
    admins.map((admin) => [admin.building, admin])
  );
  const { residents, residentRosters } = createResidentSeedRows(
    apartment.id,
    adminsByBuilding,
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
        occupancyStatus: rosterData.occupancyStatus,
        userId: usersByEmail[rosterData.email]?.id ?? null,
      },
    });
  }

  const noticeBoard = await prisma.board.create({
    data: {
      apartmentId: apartment.id,
      type: 'NOTICE',
      name: '공지사항 게시판',
    },
  });

  const complaintBoard = await prisma.board.create({
    data: {
      apartmentId: apartment.id,
      type: 'COMPLAINT',
      name: '민원 게시판',
    },
  });

  const pollBoard = await prisma.board.create({
    data: {
      apartmentId: apartment.id,
      type: 'POLL',
      name: '주민투표 게시판',
    },
  });

  const pollInProgress = await prisma.poll.create({
    data: {
      apartmentId: apartment.id,
      boardId: pollBoard.id,
      authorId: admins[0].id,
      title: '단지 내 헬스장 운영시간 연장 찬반',
      content: '헬스장 운영시간을 1시간 연장하는 안건입니다.',
      status: 'IN_PROGRESS',
      targetType: 'ALL',
      buildingPermission: 0,
      startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    },
  });

  const pollClosed = await prisma.poll.create({
    data: {
      apartmentId: apartment.id,
      boardId: pollBoard.id,
      authorId: admins[1].id,
      title: '102동 엘리베이터 교체 일정 동의',
      content: '102동 엘리베이터 교체 공사 일정을 확정합니다.',
      status: 'CLOSED',
      targetType: 'BUILDING',
      buildingPermission: 102,
      startDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    },
  });

  const [poll1OptYes, poll1OptNo] = await Promise.all([
    prisma.pollOption.create({
      data: { pollId: pollInProgress.id, title: '찬성', sortOrder: 1 },
    }),
    prisma.pollOption.create({
      data: { pollId: pollInProgress.id, title: '반대', sortOrder: 2 },
    }),
  ]);

  const [poll2OptAgree, poll2OptDelay] = await Promise.all([
    prisma.pollOption.create({
      data: { pollId: pollClosed.id, title: '일정 동의', sortOrder: 1 },
    }),
    prisma.pollOption.create({
      data: { pollId: pollClosed.id, title: '일정 연기', sortOrder: 2 },
    }),
  ]);

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

  const noticeGeneral = await prisma.notice.create({
    data: {
      apartmentId: apartment.id,
      authorId: admins[0].id,
      title: '소방 안전 점검 안내',
      content: '이번 주 금요일 오전 10시부터 소방 안전 점검이 진행됩니다.',
      category: 'MAINTENANCE',
      importance: 'IMPORTANT',
      isPinned: true,
      viewsCount: 12,
      commentsCount: 1,
    },
  });

  const noticeFromPoll = await prisma.notice.create({
    data: {
      apartmentId: apartment.id,
      authorId: admins[1].id,
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
      createdById: admins[0].id,
    },
  });

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
        authorId: admins[0].id,
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
        receiverId: admins[0].id,
        type: 'RESIDENT_SIGNUP_REQUESTED',
        title: '입주민 가입 요청',
        message: '새 입주민 가입 요청이 있습니다.',
        isRead: false,
      },
      {
        receiverId: admins[0].id,
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

  const residentCount = await prisma.user.count({
    where: { role: 'USER', apartmentId: apartment.id },
  });
  const adminCount = await prisma.user.count({
    where: { role: 'ADMIN', apartmentId: apartment.id },
  });

  console.log('Seed complete');
  console.log(`Super Admin: superadmin@test.com / ${PASSWORD_PLAIN}`);
  console.log(`Apartment: ${apartment.name}`);
  console.log(`Admins: ${adminCount}, Residents: ${residentCount}`);
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
