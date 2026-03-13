const idParam = (
  name: string,
  description: string
): Record<string, unknown> => ({
  name,
  in: 'path',
  required: true,
  schema: { type: 'string', example: 'cmmefve970003qy8u1dv37uzh' },
  description,
});

const queryParam = (
  name: string,
  description: string,
  type: 'string' | 'integer' | 'boolean' = 'string',
  example?: string | number | boolean
): Record<string, unknown> => ({
  name,
  in: 'query',
  required: false,
  schema: {
    type,
    ...(example !== undefined ? { example } : {}),
  },
  description,
});

const jsonBody = (
  description: string,
  schema: Record<string, unknown>,
  example?: Record<string, unknown>
): Record<string, unknown> => ({
  required: true,
  description,
  content: {
    'application/json': {
      schema,
      ...(example ? { example } : {}),
    },
  },
});

const multipartBody = (
  description: string,
  schema: Record<string, unknown>,
  example?: Record<string, unknown>
): Record<string, unknown> => ({
  required: true,
  description,
  content: {
    'multipart/form-data': {
      schema,
      ...(example ? { example } : {}),
    },
  },
});

const jsonResponse = (
  description: string,
  schema: Record<string, unknown>,
  example?: Record<string, unknown>
): Record<string, unknown> => ({
  description,
  content: {
    'application/json': {
      schema,
      ...(example ? { example } : {}),
    },
  },
});

const noContentResponse = {
  description: '처리가 완료되었습니다.',
} as const;

const csvResponse = (description: string): Record<string, unknown> => ({
  description,
  content: {
    'text/csv': {
      schema: { type: 'string', format: 'binary' },
    },
  },
});

const streamResponse = (description: string, example: string) => ({
  description,
  content: {
    'text/event-stream': {
      schema: { type: 'string', example },
    },
  },
});

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });

export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'WeLive API',
    version: '1.0.0',
    description:
      'WeLive 백엔드 API 문서입니다. 인증이 필요한 API는 쿠키 기반 인증(access_token, refresh_token)을 사용합니다.',
  },
  servers: [
    {
      url: '/',
      description: 'Current server',
    },
  ],
  tags: [
    { name: 'Health' },
    { name: 'Auth' },
    { name: 'Users' },
    { name: 'Apartments' },
    { name: 'Residents' },
    { name: 'Notices' },
    { name: 'Complaints' },
    { name: 'Comments' },
    { name: 'Polls' },
    { name: 'Events' },
    { name: 'Notifications' },
    { name: 'Upload' },
    { name: 'Poll Scheduler' },
  ],
  components: {
    securitySchemes: {
      cookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'access_token',
      },
    },
    schemas: {
      MessageResponse: {
        type: 'object',
        properties: {
          message: { type: 'string', example: '작업이 성공적으로 완료되었습니다' },
        },
        required: ['message'],
      },
      ResidentImportResponse: {
        type: 'object',
        properties: {
          message: { type: 'string', example: '18명의 입주민이 등록되었습니다' },
          count: { type: 'integer', example: 18 },
        },
        required: ['message', 'count'],
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          message: { type: 'string', example: '잘못된 요청입니다' },
        },
        required: ['message'],
      },
      HealthResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: '서버 연결 성공' },
          timestamp: {
            type: 'string',
            format: 'date-time',
            example: '2026-03-12T08:01:51.190Z',
          },
          environment: { type: 'string', example: 'production' },
        },
        required: ['success', 'message', 'timestamp', 'environment'],
      },
      DbHealthResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: '데이터베이스 연결 성공' },
          timestamp: {
            type: 'string',
            format: 'date-time',
            example: '2026-03-12T08:01:51.190Z',
          },
          database: {
            type: 'object',
            properties: {
              provider: { type: 'string', example: 'postgresql' },
              status: { type: 'string', example: 'connected' },
            },
            required: ['provider', 'status'],
          },
        },
        required: ['success', 'message', 'timestamp', 'database'],
      },
      UploadResponse: {
        type: 'object',
        properties: {
          imageUrl: {
            type: 'string',
            example: '/upload/7fd3e21e-8c8b-42be-be10-b2bb1e6ad92b.png',
          },
        },
        required: ['imageUrl'],
      },
      BoardIds: {
        type: 'object',
        properties: {
          COMPLAINT: { type: 'string', example: 'cmmefvf400004qy8v0abc1234' },
          NOTICE: { type: 'string', example: 'cmmefvf400005qy8v1abc1234' },
          POLL: { type: 'string', example: 'cmmefvf400006qy8v2abc1234' },
        },
        required: ['COMPLAINT', 'NOTICE', 'POLL'],
      },
      LoginResponse: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'cmmefve970003qy8u1dv37uzh' },
          name: { type: 'string', example: '입주민 101-101' },
          email: { type: 'string', example: 'user101-101@test.com' },
          role: { type: 'string', example: 'USER' },
          username: { type: 'string', example: 'user101-101@test.com' },
          contact: { type: 'string', example: '01011112222' },
          avatar: {
            type: 'string',
            nullable: true,
            example: '/upload/avatar.png',
          },
          isActive: { type: 'boolean', example: true },
          joinStatus: { type: 'string', example: 'APPROVED' },
          apartmentId: { type: 'string', example: 'cmmefve970002qy8u0apt0001' },
          apartmentName: { type: 'string', example: '1단지 아파트' },
          residentDong: { type: 'string', example: '101' },
          boardIds: ref('BoardIds'),
        },
        required: [
          'id',
          'name',
          'email',
          'role',
          'username',
          'contact',
          'isActive',
          'joinStatus',
          'apartmentId',
          'boardIds',
        ],
      },
      SignupUserRequest: {
        type: 'object',
        properties: {
          username: { type: 'string', example: 'user101-101@test.com' },
          password: { type: 'string', example: 'welive1234@' },
          email: { type: 'string', example: 'user101-101@test.com' },
          name: { type: 'string', example: '입주민 101-101' },
          contact: { type: 'string', example: '01011112222' },
          role: { type: 'string', enum: ['USER'], example: 'USER' },
          apartmentName: { type: 'string', example: '1단지 아파트' },
          apartmentDong: { type: 'string', example: '101' },
          apartmentHo: { type: 'string', example: '101' },
        },
        required: [
          'username',
          'password',
          'email',
          'name',
          'contact',
          'role',
          'apartmentName',
          'apartmentDong',
          'apartmentHo',
        ],
      },
      SignupAdminRequest: {
        type: 'object',
        properties: {
          username: { type: 'string', example: 'admin101@test.com' },
          password: { type: 'string', example: 'welive1234@' },
          contact: { type: 'string', example: '01023456781' },
          name: { type: 'string', example: '1단지 관리자' },
          email: { type: 'string', example: 'admin101@test.com' },
          role: { type: 'string', enum: ['ADMIN'], example: 'ADMIN' },
          apartmentName: { type: 'string', example: '1단지 아파트' },
          apartmentAddress: { type: 'string', example: '서울시 강남구 테헤란로 1' },
          apartmentManagementNumber: { type: 'string', example: '10001' },
          description: { type: 'string', example: '1단지 전체를 관리합니다.' },
          startComplexNumber: { type: 'string', example: '1' },
          endComplexNumber: { type: 'string', example: '1' },
          startDongNumber: { type: 'string', example: '101' },
          endDongNumber: { type: 'string', example: '103' },
          startFloorNumber: { type: 'string', example: '1' },
          endFloorNumber: { type: 'string', example: '20' },
          startHoNumber: { type: 'string', example: '1' },
          endHoNumber: { type: 'string', example: '4' },
        },
        required: [
          'username',
          'password',
          'contact',
          'name',
          'email',
          'role',
          'apartmentName',
          'apartmentAddress',
          'apartmentManagementNumber',
          'description',
          'startComplexNumber',
          'endComplexNumber',
          'startDongNumber',
          'endDongNumber',
          'startFloorNumber',
          'endFloorNumber',
          'startHoNumber',
          'endHoNumber',
        ],
      },
      SignupSuperAdminRequest: {
        type: 'object',
        properties: {
          username: { type: 'string', example: 'superadmin@test.com' },
          password: { type: 'string', example: 'welive1234@' },
          contact: { type: 'string', example: '01099998888' },
          name: { type: 'string', example: '최고 관리자' },
          email: { type: 'string', example: 'superadmin@test.com' },
          role: { type: 'string', enum: ['SUPER_ADMIN'], example: 'SUPER_ADMIN' },
          joinStatus: { type: 'string', enum: ['APPROVED'], example: 'APPROVED' },
        },
        required: ['username', 'password', 'contact', 'name', 'email', 'role', 'joinStatus'],
      },
      LoginRequest: {
        type: 'object',
        properties: {
          username: { type: 'string', example: 'user101-101@test.com' },
          password: { type: 'string', example: 'welive1234@' },
        },
        required: ['username', 'password'],
      },
      SignupResponse: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'cmmefve970003qy8u1dv37uzh' },
          name: { type: 'string', example: '입주민 101-101' },
          email: { type: 'string', example: 'user101-101@test.com' },
          joinStatus: { type: 'string', example: 'PENDING' },
          isActive: { type: 'boolean', example: false },
          role: { type: 'string', example: 'USER' },
        },
        required: ['id', 'name', 'email', 'joinStatus', 'isActive', 'role'],
      },
      ApprovalStatusRequest: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['APPROVED', 'REJECTED'],
            example: 'APPROVED',
          },
        },
        required: ['status'],
      },
      UpdateAdminRequest: {
        type: 'object',
        properties: {
          name: { type: 'string', example: '1단지 관리자 수정' },
          contact: { type: 'string', example: '01098765432' },
          email: { type: 'string', example: 'admin101@test.com' },
          description: { type: 'string', example: '1단지 전체 운영 담당' },
          apartmentName: { type: 'string', example: '1단지 아파트' },
          apartmentAddress: { type: 'string', example: '서울시 강남구 테헤란로 1' },
          apartmentManagementNumber: { type: 'string', example: '10001' },
        },
      },
      UserProfileResponse: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'cmmefve970003qy8u1dv37uzh' },
          username: { type: 'string', example: 'user101-101@test.com' },
          email: { type: 'string', example: 'user101-101@test.com' },
          name: { type: 'string', example: '입주민 101-101' },
          contact: { type: 'string', example: '01011112222' },
          avatar: {
            type: 'string',
            nullable: true,
            example: '/upload/avatar.png',
          },
        },
        required: ['id', 'username', 'email', 'name', 'contact'],
      },
      ProfileUpdateResponse: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            example: '입주민 101-101님의 프로필이 성공적으로 업데이트되었습니다. 다시 로그인해주세요.',
          },
        },
        required: ['message'],
      },
      PasswordChangeResponse: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            example: '입주민 101-101님의 비밀번호가 성공적으로 변경되었습니다. 다시 로그인해주세요.',
          },
        },
        required: ['message'],
      },
      ApartmentSummary: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'cmmefve970002qy8u0apt0001' },
          name: { type: 'string', example: '1단지 아파트' },
          address: { type: 'string', example: '서울시 강남구 테헤란로 1' },
          description: { type: 'string', example: '1단지 전체 세대' },
          apartmentStatus: { type: 'string', example: 'APPROVED' },
          adminId: { type: 'string', nullable: true, example: 'cmmefve970010qy8uadmin01' },
          admin: {
            type: 'object',
            nullable: true,
            properties: {
              id: { type: 'string', example: 'cmmefve970010qy8uadmin01' },
              name: { type: 'string', example: '1단지 관리자' },
              email: { type: 'string', example: 'admin101@test.com' },
              contact: { type: 'string', example: '01023456781' },
            },
          },
        },
        required: ['id', 'name', 'address', 'apartmentStatus'],
      },
      ApartmentListResponse: {
        type: 'object',
        properties: {
          apartments: {
            type: 'array',
            items: ref('ApartmentSummary'),
          },
          totalCount: { type: 'integer', example: 1 },
          totalPages: { type: 'integer', example: 1 },
          currentPage: { type: 'integer', example: 1 },
        },
        required: ['apartments'],
      },
      ResidentItem: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'cmmefve970020qy8ures0001' },
          userId: { type: 'string', example: 'cmmefve970003qy8u1dv37uzh' },
          building: { type: 'string', example: '101' },
          unitNumber: { type: 'string', example: '101' },
          name: { type: 'string', example: '입주민 101-101' },
          contact: { type: 'string', example: '01011112222' },
          email: { type: 'string', example: 'user101-101@test.com' },
          approvalStatus: { type: 'string', example: 'APPROVED' },
          isHouseholder: { type: 'string', example: 'HOUSEHOLDER' },
          isRegistered: { type: 'boolean', example: true },
          residenceStatus: { type: 'string', example: 'RESIDENCE' },
        },
        required: [
          'id',
          'building',
          'unitNumber',
          'name',
          'contact',
          'approvalStatus',
          'isRegistered',
          'residenceStatus',
        ],
      },
      ResidentListResponse: {
        type: 'object',
        properties: {
          residents: {
            type: 'array',
            items: ref('ResidentItem'),
          },
          totalCount: { type: 'integer', example: 18 },
          totalPages: { type: 'integer', example: 2 },
          currentPage: { type: 'integer', example: 1 },
        },
        required: ['residents'],
      },
      ResidentRequest: {
        type: 'object',
        properties: {
          building: { type: 'string', example: '101' },
          unitNumber: { type: 'string', example: '101' },
          name: { type: 'string', example: '입주민 101-101' },
          contact: { type: 'string', example: '01011112222' },
          isHouseholder: { type: 'string', enum: ['HOUSEHOLDER', 'MEMBER'], example: 'HOUSEHOLDER' },
        },
        required: ['building', 'unitNumber', 'name', 'contact', 'isHouseholder'],
      },
      NoticeItem: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'cmmefve970030qy8unotice01' },
          title: { type: 'string', example: '소방 안전 점검 안내' },
          content: { type: 'string', example: '3월 15일 오전 10시에 점검이 진행됩니다.' },
          category: { type: 'string', example: 'MAINTENANCE' },
          createdAt: {
            type: 'string',
            format: 'date-time',
            example: '2026-03-12T09:00:00.000Z',
          },
          authorName: { type: 'string', example: '1단지 관리자' },
          viewCount: { type: 'integer', example: 12 },
        },
        required: ['id', 'title', 'content', 'category', 'createdAt'],
      },
      NoticeListResponse: {
        type: 'object',
        properties: {
          notices: {
            type: 'array',
            items: ref('NoticeItem'),
          },
          totalCount: { type: 'integer', example: 2 },
          totalPages: { type: 'integer', example: 1 },
          currentPage: { type: 'integer', example: 1 },
        },
        required: ['notices'],
      },
      NoticeRequest: {
        type: 'object',
        properties: {
          title: { type: 'string', example: '소방 안전 점검 안내' },
          content: { type: 'string', example: '3월 15일 오전 10시에 점검이 진행됩니다.' },
          category: {
            type: 'string',
            enum: ['MAINTENANCE', 'EMERGENCY', 'COMMUNITY', 'RESIDENT_VOTE', 'RESIDENT_COUNCIL', 'ETC'],
            example: 'MAINTENANCE',
          },
          isPinned: { type: 'boolean', example: true },
          startDate: { type: 'string', format: 'date-time', example: '2026-03-15T01:00:00.000Z' },
          endDate: { type: 'string', format: 'date-time', example: '2026-03-15T03:00:00.000Z' },
          file: { type: 'string', format: 'binary' },
        },
        required: ['title', 'content', 'category'],
      },
      ComplaintItem: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'cmmefve970040qy8ucompl001' },
          title: { type: 'string', example: '공용 전등 고장' },
          content: { type: 'string', example: '101동 1층 공용 전등이 고장났습니다.' },
          status: { type: 'string', example: 'PENDING' },
          isPublic: { type: 'boolean', example: true },
          createdAt: { type: 'string', format: 'date-time', example: '2026-03-12T08:10:00.000Z' },
        },
        required: ['id', 'title', 'content', 'status', 'isPublic', 'createdAt'],
      },
      ComplaintListResponse: {
        type: 'object',
        properties: {
          complaints: {
            type: 'array',
            items: ref('ComplaintItem'),
          },
          totalCount: { type: 'integer', example: 3 },
          totalPages: { type: 'integer', example: 1 },
          currentPage: { type: 'integer', example: 1 },
        },
        required: ['complaints'],
      },
      ComplaintRequest: {
        type: 'object',
        properties: {
          title: { type: 'string', example: '공용 전등 고장' },
          content: { type: 'string', example: '101동 1층 공용 전등이 고장났습니다.' },
          isPublic: { type: 'boolean', example: true },
          boardId: { type: 'string', example: 'cmmefvf400004qy8v0abc1234' },
          status: {
            type: 'string',
            enum: ['PENDING', 'IN_PROGRESS', 'RESOLVED', 'REJECTED', 'COMPLETED'],
            example: 'PENDING',
          },
          file: { type: 'string', format: 'binary' },
        },
        required: ['title', 'content', 'isPublic', 'boardId'],
      },
      ComplaintStatusRequest: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['PENDING', 'IN_PROGRESS', 'RESOLVED', 'REJECTED', 'COMPLETED'],
            example: 'IN_PROGRESS',
          },
        },
        required: ['status'],
      },
      CommentRequest: {
        type: 'object',
        properties: {
          boardId: { type: 'string', example: 'cmmefvf400005qy8v1abc1234' },
          boardType: { type: 'string', enum: ['NOTICE', 'POLL', 'COMPLAINT'], example: 'NOTICE' },
          content: { type: 'string', example: '확인했습니다.' },
        },
        required: ['boardId', 'boardType', 'content'],
      },
      CommentResponse: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'cmmefve970050qy8ucomment1' },
          content: { type: 'string', example: '확인했습니다.' },
          boardId: { type: 'string', example: 'cmmefvf400005qy8v1abc1234' },
          boardType: { type: 'string', example: 'NOTICE' },
          authorName: { type: 'string', example: '입주민 101-101' },
        },
        required: ['id', 'content', 'boardId', 'boardType'],
      },
      PollOptionRequest: {
        type: 'object',
        properties: {
          title: { type: 'string', example: '찬성' },
        },
        required: ['title'],
      },
      PollRequest: {
        type: 'object',
        properties: {
          boardId: { type: 'string', example: 'cmmefvf400006qy8v2abc1234' },
          title: { type: 'string', example: '102동 엘리베이터 교체 일정 확정' },
          content: { type: 'string', example: '교체 일정에 대한 찬반 투표입니다.' },
          buildingPermission: { type: 'integer', example: 102 },
          status: { type: 'string', example: 'ONGOING' },
          startDate: { type: 'string', format: 'date-time', example: '2026-03-12T09:00:00.000Z' },
          endDate: { type: 'string', format: 'date-time', example: '2026-03-15T09:00:00.000Z' },
          options: {
            type: 'array',
            items: ref('PollOptionRequest'),
            example: [{ title: '찬성' }, { title: '반대' }],
          },
        },
        required: ['boardId', 'title', 'content', 'buildingPermission', 'startDate', 'endDate', 'options'],
      },
      PollItem: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'cmmefve970060qy8upoll0001' },
          title: { type: 'string', example: '102동 엘리베이터 교체 일정 확정' },
          content: { type: 'string', example: '교체 일정에 대한 찬반 투표입니다.' },
          status: { type: 'string', example: 'ONGOING' },
          buildingPermission: { type: 'integer', example: 102 },
          startDate: { type: 'string', format: 'date-time', example: '2026-03-12T09:00:00.000Z' },
          endDate: { type: 'string', format: 'date-time', example: '2026-03-15T09:00:00.000Z' },
        },
        required: ['id', 'title', 'content', 'status', 'buildingPermission', 'startDate', 'endDate'],
      },
      PollListResponse: {
        type: 'object',
        properties: {
          polls: {
            type: 'array',
            items: ref('PollItem'),
          },
          totalCount: { type: 'integer', example: 2 },
          totalPages: { type: 'integer', example: 1 },
          currentPage: { type: 'integer', example: 1 },
        },
        required: ['polls'],
      },
      EventListResponse: {
        type: 'object',
        properties: {
          events: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', example: 'cmmefve970070qy8uevent001' },
                start: {
                  type: 'string',
                  format: 'date-time',
                  example: '2026-03-15T01:00:00.000Z',
                },
                end: {
                  type: 'string',
                  format: 'date-time',
                  example: '2026-03-15T03:00:00.000Z',
                },
                category: { type: 'string', example: 'notice' },
                title: { type: 'string', example: '소방 안전 점검 안내' },
                type: { type: 'string', example: 'NOTICE' },
              },
              required: ['id', 'start', 'end', 'category', 'title', 'type'],
            },
          },
        },
        required: ['events'],
      },
      NotificationItem: {
        type: 'object',
        properties: {
          notificationId: { type: 'string', example: 'cmmefve970080qy8unoti001' },
          content: {
            type: 'string',
            example: '1단지 아파트 관리자가 가입 승인을 요청했습니다.',
          },
          notificationType: { type: 'string', example: 'ADMIN_SIGNUP_REQUESTED' },
          notifiedAt: {
            type: 'string',
            format: 'date-time',
            example: '2026-03-12T09:00:00.000Z',
          },
          isChecked: { type: 'boolean', example: false },
          complaintId: {
            type: 'string',
            nullable: true,
            example: null,
          },
          noticeId: {
            type: 'string',
            nullable: true,
            example: null,
          },
          pollId: {
            type: 'string',
            nullable: true,
            example: null,
          },
        },
        required: [
          'notificationId',
          'content',
          'notificationType',
          'notifiedAt',
          'isChecked',
        ],
      },
      NotificationListResponse: {
        type: 'object',
        properties: {
          notifications: {
            type: 'array',
            items: ref('NotificationItem'),
          },
        },
        required: ['notifications'],
      },
      ComplaintCreateResponse: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            example: '정상적으로 등록 처리되었습니다.',
          },
          complaintId: {
            type: 'string',
            example: 'cmmefve970090qy8ucompl001',
          },
        },
        required: ['message', 'complaintId'],
      },
      CommentDeleteResponse: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            example: '정상적으로 삭제 처리되었습니다',
          },
        },
        required: ['message'],
      },
      PollCreateResponse: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            example: '정상적으로 등록 처리되었습니다',
          },
          pollId: {
            type: 'string',
            example: 'cmmefve970050qy8upoll001',
          },
        },
        required: ['message', 'pollId'],
      },
      PollDeleteResponse: {
        type: 'object',
        properties: {
          pollId: {
            type: 'string',
            example: 'cmmefve970050qy8upoll001',
          },
        },
        required: ['pollId'],
      },
      PollVoteOption: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'cmmefve970060qy8upollopt1' },
          title: { type: 'string', example: '찬성' },
          votes: { type: 'integer', example: 12 },
        },
        required: ['id', 'title', 'votes'],
      },
      PollVoteResponse: {
        type: 'object',
        properties: {
          message: { type: 'string', example: '투표가 완료되었습니다' },
          updatedOption: ref('PollVoteOption'),
          winnerOption: ref('PollVoteOption'),
          options: {
            type: 'array',
            items: ref('PollVoteOption'),
            example: [
              { id: 'cmmefve970060qy8upollopt1', title: '찬성', votes: 12 },
              { id: 'cmmefve970060qy8upollopt2', title: '반대', votes: 5 },
            ],
          },
        },
        required: ['message', 'updatedOption', 'winnerOption', 'options'],
      },
      PollUnvoteResponse: {
        type: 'object',
        properties: {
          message: { type: 'string', example: '투표가 취소되었습니다' },
          updatedOption: ref('PollVoteOption'),
        },
        required: ['message', 'updatedOption'],
      },
      EventDeleteResponse: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'cmmefve970070qy8uevent001' },
          startDate: {
            type: 'string',
            format: 'date-time',
            example: '2026-03-15T01:00:00.000Z',
          },
          endDate: {
            type: 'string',
            format: 'date-time',
            example: '2026-03-15T03:00:00.000Z',
          },
          boardType: { type: 'string', example: 'NOTICE' },
          noticeId: {
            type: 'string',
            nullable: true,
            example: 'cmmefve970030qy8unotice01',
          },
          pollId: {
            type: 'string',
            nullable: true,
            example: null,
          },
          complaintId: {
            type: 'string',
            nullable: true,
            example: null,
          },
        },
        required: ['id', 'startDate', 'endDate', 'boardType'],
      },
      SchedulerPingResponse: {
        type: 'object',
        properties: {
          ok: { type: 'boolean', example: true },
          message: { type: 'string', example: 'pong' },
        },
        required: ['ok', 'message'],
      },
    },
  },
  paths: {
    '/api/health': {
      get: {
        tags: ['Health'],
        summary: '서버 상태 확인',
        responses: {
          '200': jsonResponse('서버 상태를 반환합니다.', ref('HealthResponse')),
        },
      },
    },
    '/api/health/db': {
      get: {
        tags: ['Health'],
        summary: '데이터베이스 상태 확인',
        responses: {
          '200': jsonResponse('DB 연결 상태를 반환합니다.', ref('DbHealthResponse')),
        },
      },
    },
    '/api/auth/signup': {
      post: {
        tags: ['Auth'],
        summary: '입주민 회원가입',
        requestBody: jsonBody('입주민 회원가입 요청', ref('SignupUserRequest')),
        responses: {
          '201': jsonResponse('회원가입 성공', ref('SignupResponse'), {
            id: 'cmmefve970003qy8u1dv37uzh',
            name: '입주민 101-101',
            email: 'user101-101@test.com',
            joinStatus: 'PENDING',
            isActive: false,
            role: 'USER',
          }),
          '400': jsonResponse('잘못된 요청', ref('ErrorResponse'), {
            message: '잘못된 요청입니다',
          }),
          '403': jsonResponse('이미 인증된 사용자', ref('ErrorResponse'), {
            message: '이미 인증된 사용자입니다',
          }),
          '409': jsonResponse('중복 데이터', ref('ErrorResponse'), {
            message: '이미 존재하는 사용자입니다',
          }),
        },
      },
    },
    '/api/auth/signup/admin': {
      post: {
        tags: ['Auth'],
        summary: '관리자 회원가입',
        requestBody: jsonBody('관리자 회원가입 요청', ref('SignupAdminRequest')),
        responses: {
          '201': jsonResponse('관리자 회원가입 성공', ref('SignupResponse'), {
            id: 'cmmefve970010qy8uadmin01',
            name: '1단지 관리자',
            email: 'admin101@test.com',
            joinStatus: 'PENDING',
            isActive: false,
            role: 'ADMIN',
          }),
          '400': jsonResponse('잘못된 요청', ref('ErrorResponse')),
          '403': jsonResponse('이미 인증된 사용자', ref('ErrorResponse'), {
            message: '이미 인증된 사용자입니다',
          }),
          '409': jsonResponse('중복 데이터', ref('ErrorResponse')),
        },
      },
    },
    '/api/auth/signup/super-admin': {
      post: {
        tags: ['Auth'],
        summary: '슈퍼 관리자 회원가입',
        security: [{ cookieAuth: [] }],
        requestBody: jsonBody('슈퍼 관리자 생성 요청', ref('SignupSuperAdminRequest')),
        responses: {
          '201': jsonResponse('슈퍼 관리자 생성 성공', ref('SignupResponse'), {
            id: 'cmmefve970001qy8usuper001',
            name: '최고 관리자',
            email: 'superadmin@test.com',
            joinStatus: 'APPROVED',
            isActive: true,
            role: 'SUPER_ADMIN',
          }),
          '401': jsonResponse('인증 필요', ref('ErrorResponse'), {
            message: '로그인이 필요합니다',
          }),
          '403': jsonResponse('권한 없음', ref('ErrorResponse'), {
            message: '권한이 없습니다',
          }),
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: '로그인',
        requestBody: jsonBody('로그인 요청', ref('LoginRequest')),
        responses: {
          '200': jsonResponse('로그인 성공', ref('LoginResponse')),
          '400': jsonResponse('잘못된 요청', ref('ErrorResponse')),
          '401': jsonResponse('인증 실패', ref('ErrorResponse'), {
            message: '아이디 또는 비밀번호가 올바르지 않습니다',
          }),
        },
      },
    },
    '/api/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: '로그아웃',
        security: [{ cookieAuth: [] }],
        responses: {
          '204': noContentResponse,
          '401': jsonResponse('인증 필요', ref('ErrorResponse'), {
            message: '로그인이 필요합니다',
          }),
        },
      },
    },
    '/api/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: '토큰 재발급',
        responses: {
          '200': jsonResponse('재발급 성공', ref('MessageResponse'), {
            message: '작업이 성공적으로 완료되었습니다',
          }),
          '401': jsonResponse('재발급 실패', ref('ErrorResponse'), {
            message: '유효하지 않은 리프레시 토큰입니다',
          }),
        },
      },
    },
    '/api/auth/admins/status': {
      patch: {
        tags: ['Auth'],
        summary: '관리자 승인 상태 일괄 변경',
        security: [{ cookieAuth: [] }],
        requestBody: jsonBody('일괄 상태 변경 요청', ref('ApprovalStatusRequest')),
        responses: {
          '200': jsonResponse('일괄 변경 성공', ref('MessageResponse'), {
            message: '작업이 성공적으로 완료되었습니다',
          }),
          '401': jsonResponse('인증 필요', ref('ErrorResponse')),
          '403': jsonResponse('권한 없음', ref('ErrorResponse')),
        },
      },
    },
    '/api/auth/admins/{adminId}/status': {
      patch: {
        tags: ['Auth'],
        summary: '관리자 승인 상태 변경',
        security: [{ cookieAuth: [] }],
        parameters: [idParam('adminId', '관리자 ID')],
        requestBody: jsonBody('상태 변경 요청', ref('ApprovalStatusRequest')),
        responses: {
          '200': jsonResponse('상태 변경 성공', ref('MessageResponse'), {
            message: '작업이 성공적으로 완료되었습니다',
          }),
          '404': jsonResponse('관리자 없음', ref('ErrorResponse')),
        },
      },
    },
    '/api/auth/admins/{adminId}': {
      patch: {
        tags: ['Auth'],
        summary: '관리자 정보 수정',
        security: [{ cookieAuth: [] }],
        parameters: [idParam('adminId', '관리자 ID')],
        requestBody: jsonBody('관리자 수정 요청', ref('UpdateAdminRequest')),
        responses: {
          '200': jsonResponse('수정 성공', ref('MessageResponse'), {
            message: '작업이 성공적으로 완료되었습니다',
          }),
          '400': jsonResponse('잘못된 요청', ref('ErrorResponse')),
          '404': jsonResponse('관리자 없음', ref('ErrorResponse')),
        },
      },
      delete: {
        tags: ['Auth'],
        summary: '관리자 삭제',
        security: [{ cookieAuth: [] }],
        parameters: [idParam('adminId', '관리자 ID')],
        responses: {
          '200': jsonResponse('삭제 성공', ref('MessageResponse'), {
            message: '작업이 성공적으로 완료되었습니다',
          }),
          '404': jsonResponse('관리자 없음', ref('ErrorResponse')),
        },
      },
    },
    '/api/auth/residents/{residentId}/status': {
      patch: {
        tags: ['Auth'],
        summary: '입주민 승인 상태 변경',
        security: [{ cookieAuth: [] }],
        parameters: [idParam('residentId', '입주민 ID')],
        requestBody: jsonBody('상태 변경 요청', ref('ApprovalStatusRequest')),
        responses: {
          '200': jsonResponse('상태 변경 성공', ref('MessageResponse'), {
            message: '작업이 성공적으로 완료되었습니다',
          }),
          '404': jsonResponse('입주민 없음', ref('ErrorResponse')),
        },
      },
    },
    '/api/auth/residents/status': {
      patch: {
        tags: ['Auth'],
        summary: '입주민 승인 상태 일괄 변경',
        security: [{ cookieAuth: [] }],
        requestBody: jsonBody('일괄 상태 변경 요청', ref('ApprovalStatusRequest')),
        responses: {
          '200': jsonResponse('일괄 변경 성공', ref('MessageResponse'), {
            message: '작업이 성공적으로 완료되었습니다',
          }),
        },
      },
    },
    '/api/auth/cleanup': {
      post: {
        tags: ['Auth'],
        summary: '거절 계정 정리',
        security: [{ cookieAuth: [] }],
        responses: {
          '200': jsonResponse('정리 성공', ref('MessageResponse'), {
            message: '작업이 성공적으로 완료되었습니다',
          }),
        },
      },
    },
    '/api/users/me': {
      patch: {
        tags: ['Users'],
        summary: '내 프로필 수정',
        security: [{ cookieAuth: [] }],
        requestBody: multipartBody(
          '프로필 수정',
          {
            type: 'object',
            properties: {
              name: { type: 'string', example: '입주민 101-101 수정' },
              contact: { type: 'string', example: '01012341234' },
              email: { type: 'string', example: 'user101-101@test.com' },
              file: { type: 'string', format: 'binary' },
            },
          }
        ),
        responses: {
          '200': jsonResponse('프로필 수정 성공', ref('ProfileUpdateResponse')),
          '401': jsonResponse('인증 필요', ref('ErrorResponse')),
        },
      },
    },
    '/api/users/password': {
      patch: {
        tags: ['Users'],
        summary: '비밀번호 변경',
        security: [{ cookieAuth: [] }],
        requestBody: jsonBody(
          '비밀번호 변경',
          {
            type: 'object',
            properties: {
              currentPassword: { type: 'string', example: 'welive1234@' },
              newPassword: { type: 'string', example: 'newWelive1234@' },
            },
            required: ['currentPassword', 'newPassword'],
          }
        ),
        responses: {
          '200': jsonResponse('비밀번호 변경 성공', ref('PasswordChangeResponse'), {
            message:
              '입주민 101-101님의 비밀번호가 성공적으로 변경되었습니다. 다시 로그인해주세요.',
          }),
          '400': jsonResponse('잘못된 요청', ref('ErrorResponse'), {
            message: '현재 비밀번호와 새 비밀번호를 입력해주세요',
          }),
        },
      },
    },
    '/api/apartments': {
      get: {
        tags: ['Apartments'],
        summary: '아파트 목록 조회',
        parameters: [
          queryParam('page', '페이지 번호', 'integer', 1),
          queryParam('limit', '페이지 크기', 'integer', 10),
          queryParam('searchKeyword', '검색어', 'string', '1단지'),
          queryParam('apartmentStatus', '상태', 'string', 'APPROVED'),
        ],
        responses: {
          '200': jsonResponse('아파트 목록 조회 성공', ref('ApartmentListResponse')),
        },
      },
    },
    '/api/apartments/public': {
      get: {
        tags: ['Apartments'],
        summary: '공개 아파트 목록 조회',
        responses: {
          '200': jsonResponse('공개 아파트 목록 조회 성공', ref('ApartmentListResponse')),
        },
      },
    },
    '/api/apartments/{apartmentId}': {
      get: {
        tags: ['Apartments'],
        summary: '아파트 상세 조회',
        parameters: [idParam('apartmentId', '아파트 ID')],
        responses: {
          '200': jsonResponse('아파트 상세 조회 성공', ref('ApartmentSummary')),
          '404': jsonResponse('아파트 없음', ref('ErrorResponse')),
        },
      },
    },
    '/api/apartments/public/{apartmentId}': {
      get: {
        tags: ['Apartments'],
        summary: '공개 아파트 상세 조회',
        parameters: [idParam('apartmentId', '아파트 ID')],
        responses: {
          '200': jsonResponse('공개 아파트 상세 조회 성공', ref('ApartmentSummary')),
          '404': jsonResponse('아파트 없음', ref('ErrorResponse')),
        },
      },
    },
    '/api/residents/file/template': {
      get: {
        tags: ['Residents'],
        summary: '입주민 템플릿 CSV 다운로드',
        security: [{ cookieAuth: [] }],
        responses: {
          '200': csvResponse('CSV 템플릿 다운로드'),
        },
      },
    },
    '/api/residents/file': {
      get: {
        tags: ['Residents'],
        summary: '입주민 CSV 다운로드',
        security: [{ cookieAuth: [] }],
        responses: {
          '200': csvResponse('CSV 다운로드'),
        },
      },
    },
    '/api/residents/from-file': {
      post: {
        tags: ['Residents'],
        summary: 'CSV로 입주민 일괄 등록',
        security: [{ cookieAuth: [] }],
        requestBody: multipartBody(
          '입주민 CSV 업로드',
          {
            type: 'object',
            properties: {
              file: { type: 'string', format: 'binary' },
            },
            required: ['file'],
          }
        ),
        responses: {
          '201': jsonResponse('CSV 등록 성공', ref('ResidentImportResponse'), {
            message: '18명의 입주민이 등록되었습니다',
            count: 18,
          }),
          '400': jsonResponse('CSV 파일 누락', ref('ErrorResponse'), {
            message: 'CSV 파일이 필요합니다',
          }),
        },
      },
    },
    '/api/residents/from-users/{userId}': {
      post: {
        tags: ['Residents'],
        summary: '유저로부터 입주민 생성',
        security: [{ cookieAuth: [] }],
        parameters: [idParam('userId', '사용자 ID')],
        responses: {
          '201': jsonResponse('입주민 생성 성공', ref('ResidentItem')),
          '404': jsonResponse('사용자 없음', ref('ErrorResponse')),
        },
      },
    },
    '/api/residents': {
      get: {
        tags: ['Residents'],
        summary: '입주민 목록 조회',
        security: [{ cookieAuth: [] }],
        parameters: [
          queryParam('page', '페이지 번호', 'string', '1'),
          queryParam('limit', '페이지 크기', 'string', '10'),
          queryParam('keyword', '검색어', 'string', '101'),
          queryParam('isRegistered', '가입 여부', 'boolean', true),
          queryParam('isHouseholder', '세대주 여부', 'boolean', true),
          queryParam('residenceStatus', '거주 상태', 'string', 'RESIDENCE'),
          queryParam('building', '동', 'string', '101'),
          queryParam('unitNumber', '호', 'string', '101'),
        ],
        responses: {
          '200': jsonResponse('입주민 목록 조회 성공', ref('ResidentListResponse')),
        },
      },
      post: {
        tags: ['Residents'],
        summary: '입주민 생성',
        security: [{ cookieAuth: [] }],
        requestBody: jsonBody('입주민 생성', ref('ResidentRequest')),
        responses: {
          '201': jsonResponse('입주민 생성 성공', ref('ResidentItem')),
          '400': jsonResponse('잘못된 요청', ref('ErrorResponse')),
        },
      },
    },
    '/api/residents/{id}': {
      get: {
        tags: ['Residents'],
        summary: '입주민 상세 조회',
        security: [{ cookieAuth: [] }],
        parameters: [idParam('id', '입주민 ID')],
        responses: {
          '200': jsonResponse('입주민 상세 조회 성공', ref('ResidentItem')),
          '404': jsonResponse('입주민 없음', ref('ErrorResponse')),
        },
      },
      patch: {
        tags: ['Residents'],
        summary: '입주민 수정',
        security: [{ cookieAuth: [] }],
        parameters: [idParam('id', '입주민 ID')],
        requestBody: jsonBody('입주민 수정', ref('ResidentRequest')),
        responses: {
          '200': jsonResponse('입주민 수정 성공', ref('ResidentItem')),
          '404': jsonResponse('입주민 없음', ref('ErrorResponse')),
        },
      },
      delete: {
        tags: ['Residents'],
        summary: '입주민 삭제',
        security: [{ cookieAuth: [] }],
        parameters: [idParam('id', '입주민 ID')],
        responses: {
          '200': jsonResponse('입주민 삭제 성공', ref('MessageResponse'), {
            message: '작업이 성공적으로 완료되었습니다',
          }),
        },
      },
    },
    '/api/notices': {
      get: {
        tags: ['Notices'],
        summary: '공지사항 목록 조회',
        parameters: [
          queryParam('page', '페이지 번호', 'integer', 1),
          queryParam('limit', '페이지 크기', 'integer', 10),
          queryParam('category', '분류', 'string', 'MAINTENANCE'),
          queryParam('searchKeyword', '검색어', 'string', '소방'),
        ],
        responses: {
          '200': jsonResponse('공지사항 목록 조회 성공', ref('NoticeListResponse')),
        },
      },
      post: {
        tags: ['Notices'],
        summary: '공지사항 생성',
        security: [{ cookieAuth: [] }],
        requestBody: multipartBody('공지사항 생성', ref('NoticeRequest')),
        responses: {
          '201': jsonResponse('공지사항 생성 성공', ref('MessageResponse'), {
            message: '정상적으로 등록 처리되었습니다',
          }),
          '400': jsonResponse('잘못된 요청', ref('ErrorResponse')),
        },
      },
    },
    '/api/notices/{noticeId}': {
      get: {
        tags: ['Notices'],
        summary: '공지사항 상세 조회',
        parameters: [idParam('noticeId', '공지사항 ID')],
        responses: {
          '200': jsonResponse('공지사항 상세 조회 성공', ref('NoticeItem')),
          '404': jsonResponse('공지사항 없음', ref('ErrorResponse')),
        },
      },
      patch: {
        tags: ['Notices'],
        summary: '공지사항 수정',
        security: [{ cookieAuth: [] }],
        parameters: [idParam('noticeId', '공지사항 ID')],
        requestBody: multipartBody('공지사항 수정', ref('NoticeRequest')),
        responses: {
          '200': jsonResponse('공지사항 수정 성공', ref('NoticeItem')),
          '404': jsonResponse('공지사항 없음', ref('ErrorResponse')),
        },
      },
      delete: {
        tags: ['Notices'],
        summary: '공지사항 삭제',
        security: [{ cookieAuth: [] }],
        parameters: [idParam('noticeId', '공지사항 ID')],
        responses: {
          '200': jsonResponse('공지사항 삭제 성공', ref('MessageResponse'), {
            message: '정상적으로 삭제 처리되었습니다',
          }),
        },
      },
    },
    '/api/complaints': {
      get: {
        tags: ['Complaints'],
        summary: '민원 목록 조회',
        parameters: [
          queryParam('page', '페이지 번호', 'integer', 1),
          queryParam('limit', '페이지 크기', 'integer', 10),
          queryParam('status', '상태', 'string', 'PENDING'),
          queryParam('isPublic', '공개 여부', 'boolean', true),
          queryParam('dong', '동', 'string', '101'),
          queryParam('ho', '호', 'string', '101'),
          queryParam('keyword', '검색어', 'string', '전등'),
        ],
        responses: {
          '200': jsonResponse('민원 목록 조회 성공', ref('ComplaintListResponse')),
        },
      },
      post: {
        tags: ['Complaints'],
        summary: '민원 생성',
        security: [{ cookieAuth: [] }],
        requestBody: multipartBody('민원 생성', ref('ComplaintRequest')),
        responses: {
          '201': jsonResponse('민원 생성 성공', ref('ComplaintCreateResponse')),
          '400': jsonResponse('잘못된 요청', ref('ErrorResponse')),
        },
      },
    },
    '/api/complaints/{id}': {
      get: {
        tags: ['Complaints'],
        summary: '민원 상세 조회',
        parameters: [idParam('id', '민원 ID')],
        responses: {
          '200': jsonResponse('민원 상세 조회 성공', ref('ComplaintItem')),
          '404': jsonResponse('민원 없음', ref('ErrorResponse')),
        },
      },
      put: {
        tags: ['Complaints'],
        summary: '민원 수정',
        security: [{ cookieAuth: [] }],
        parameters: [idParam('id', '민원 ID')],
        requestBody: multipartBody(
          '민원 수정',
          {
            type: 'object',
            properties: {
              title: { type: 'string', example: '공용 전등 고장' },
              content: {
                type: 'string',
                example: '101동 1층 공용 전등이 고장났습니다. 빠른 조치 부탁드립니다.',
              },
              isPublic: { type: 'boolean', example: true },
              file: { type: 'string', format: 'binary' },
            },
          }
        ),
        responses: {
          '200': jsonResponse('민원 수정 성공', ref('ComplaintItem')),
          '404': jsonResponse('민원 없음', ref('ErrorResponse')),
        },
      },
      delete: {
        tags: ['Complaints'],
        summary: '민원 삭제',
        security: [{ cookieAuth: [] }],
        parameters: [idParam('id', '민원 ID')],
        responses: {
          '200': jsonResponse('민원 삭제 성공', ref('MessageResponse'), {
            message: '정상적으로 삭제 처리되었습니다.',
          }),
        },
      },
    },
    '/api/complaints/{id}/status': {
      patch: {
        tags: ['Complaints'],
        summary: '민원 상태 변경',
        security: [{ cookieAuth: [] }],
        parameters: [idParam('id', '민원 ID')],
        requestBody: jsonBody('민원 상태 변경', ref('ComplaintStatusRequest')),
        responses: {
          '200': jsonResponse('민원 상태 변경 성공', ref('ComplaintItem')),
        },
      },
    },
    '/api/comments': {
      post: {
        tags: ['Comments'],
        summary: '댓글 생성',
        security: [{ cookieAuth: [] }],
        requestBody: jsonBody('댓글 생성', ref('CommentRequest')),
        responses: {
          '201': jsonResponse('댓글 생성 성공', ref('CommentResponse')),
          '400': jsonResponse('잘못된 요청', ref('ErrorResponse')),
        },
      },
    },
    '/api/comments/{commentId}': {
      patch: {
        tags: ['Comments'],
        summary: '댓글 수정',
        security: [{ cookieAuth: [] }],
        parameters: [idParam('commentId', '댓글 ID')],
        requestBody: jsonBody(
          '댓글 수정',
          {
            type: 'object',
            properties: {
              content: { type: 'string', example: '수정된 댓글입니다.' },
            },
            required: ['content'],
          }
        ),
        responses: {
          '200': jsonResponse('댓글 수정 성공', ref('CommentResponse')),
        },
      },
      delete: {
        tags: ['Comments'],
        summary: '댓글 삭제',
        security: [{ cookieAuth: [] }],
        parameters: [idParam('commentId', '댓글 ID')],
        responses: {
          '200': jsonResponse('댓글 삭제 성공', ref('CommentDeleteResponse')),
        },
      },
    },
    '/api/polls': {
      get: {
        tags: ['Polls'],
        summary: '투표 목록 조회',
        parameters: [
          queryParam('page', '페이지 번호', 'integer', 1),
          queryParam('limit', '페이지 크기', 'integer', 10),
          queryParam('buildingPermission', '동 권한', 'integer', 102),
          queryParam('status', '상태', 'string', 'ONGOING'),
          queryParam('keyword', '검색어', 'string', '엘리베이터'),
        ],
        responses: {
          '200': jsonResponse('투표 목록 조회 성공', ref('PollListResponse')),
        },
      },
      post: {
        tags: ['Polls'],
        summary: '투표 생성',
        security: [{ cookieAuth: [] }],
        requestBody: jsonBody('투표 생성', ref('PollRequest')),
        responses: {
          '201': jsonResponse('투표 생성 성공', ref('PollCreateResponse')),
        },
      },
    },
    '/api/polls/{pollId}': {
      get: {
        tags: ['Polls'],
        summary: '투표 상세 조회',
        parameters: [idParam('pollId', '투표 ID')],
        responses: {
          '200': jsonResponse('투표 상세 조회 성공', ref('PollItem')),
          '404': jsonResponse('투표 없음', ref('ErrorResponse')),
        },
      },
      patch: {
        tags: ['Polls'],
        summary: '투표 수정',
        security: [{ cookieAuth: [] }],
        parameters: [idParam('pollId', '투표 ID')],
        requestBody: jsonBody('투표 수정', ref('PollRequest')),
        responses: {
          '200': jsonResponse('투표 수정 성공', ref('PollItem')),
        },
      },
      delete: {
        tags: ['Polls'],
        summary: '투표 삭제',
        security: [{ cookieAuth: [] }],
        parameters: [idParam('pollId', '투표 ID')],
        responses: {
          '200': jsonResponse('투표 삭제 성공', ref('PollDeleteResponse')),
        },
      },
    },
    '/api/polls/{optionId}/vote': {
      post: {
        tags: ['Polls'],
        summary: '투표 참여',
        security: [{ cookieAuth: [] }],
        parameters: [idParam('optionId', '투표 옵션 ID')],
        responses: {
          '200': jsonResponse('투표 참여 성공', ref('PollVoteResponse')),
        },
      },
      delete: {
        tags: ['Polls'],
        summary: '투표 취소',
        security: [{ cookieAuth: [] }],
        parameters: [idParam('optionId', '투표 옵션 ID')],
        responses: {
          '200': jsonResponse('투표 취소 성공', ref('PollUnvoteResponse')),
        },
      },
    },
    '/api/event': {
      get: {
        tags: ['Events'],
        summary: '아파트 일정 조회',
        security: [{ cookieAuth: [] }],
        parameters: [
          queryParam('year', '연도', 'integer', 2026),
          queryParam('month', '월', 'integer', 3),
          queryParam('apartmentId', '아파트 ID', 'string', 'cmmefve970002qy8u0apt0001'),
        ],
        responses: {
          '200': jsonResponse('일정 조회 성공', ref('EventListResponse')),
        },
      },
      post: {
        tags: ['Events'],
        summary: '아파트 일정 생성/수정',
        security: [{ cookieAuth: [] }],
        parameters: [
          queryParam('boardType', '게시글 타입', 'string', 'NOTICE'),
          queryParam('boardId', '게시글 ID', 'string', 'cmmefve970030qy8unotice01'),
          queryParam('startDate', '시작일', 'string', '2026-03-15T01:00:00.000Z'),
          queryParam('endDate', '종료일', 'string', '2026-03-15T03:00:00.000Z'),
        ],
        responses: {
          '204': noContentResponse,
          '400': jsonResponse('필수 쿼리 파라미터 누락', ref('ErrorResponse'), {
            message: '필수 쿼리 파라미터가 누락되었습니다.',
          }),
        },
      },
    },
    '/api/event/{eventId}': {
      delete: {
        tags: ['Events'],
        summary: '아파트 일정 삭제',
        security: [{ cookieAuth: [] }],
        parameters: [idParam('eventId', '일정 ID')],
        responses: {
          '200': jsonResponse('일정 삭제 성공', ref('EventDeleteResponse')),
          '400': jsonResponse('일정 ID 누락', ref('ErrorResponse'), {
            message: '이벤트 ID가 필요합니다.',
          }),
        },
      },
    },
    '/api/notifications/unread': {
      get: {
        tags: ['Notifications'],
        summary: '읽지 않은 알림 SSE 구독',
        security: [{ cookieAuth: [] }],
        responses: {
          '200': streamResponse(
            'SSE 스트림 연결',
            'event: alarm\ndata: {"type":"alarm","data":[{"notificationId":"cmmefve970080qy8unoti001","content":"1단지 아파트 관리자가 가입 승인을 요청했습니다.","notificationType":"ADMIN_SIGNUP_REQUESTED","notifiedAt":"2026-03-12T09:00:00.000Z","isChecked":false,"complaintId":null,"noticeId":null,"pollId":null}]}\n\n'
          ),
        },
      },
    },
    '/api/notifications/sse': {
      get: {
        tags: ['Notifications'],
        summary: '읽지 않은 알림 SSE 구독 별칭',
        security: [{ cookieAuth: [] }],
        responses: {
          '200': streamResponse(
            'SSE 스트림 연결',
            'event: alarm\ndata: {"type":"alarm","data":[{"notificationId":"cmmefve970080qy8unoti001","content":"1단지 아파트 관리자가 가입 승인을 요청했습니다.","notificationType":"ADMIN_SIGNUP_REQUESTED","notifiedAt":"2026-03-12T09:00:00.000Z","isChecked":false,"complaintId":null,"noticeId":null,"pollId":null}]}\n\n'
          ),
        },
      },
    },
    '/api/notifications/{notificationId}/read': {
      patch: {
        tags: ['Notifications'],
        summary: '알림 읽음 처리',
        security: [{ cookieAuth: [] }],
        parameters: [idParam('notificationId', '알림 ID')],
        responses: {
          '200': jsonResponse('읽음 처리 성공', ref('NotificationItem')),
        },
      },
    },
    '/api/upload': {
      post: {
        tags: ['Upload'],
        summary: '파일 업로드',
        security: [{ cookieAuth: [] }],
        requestBody: multipartBody(
          '파일 업로드',
          {
            type: 'object',
            properties: {
              file: { type: 'string', format: 'binary' },
            },
            required: ['file'],
          }
        ),
        responses: {
          '200': jsonResponse('업로드 성공', ref('UploadResponse')),
          '400': jsonResponse('이미지 누락', ref('ErrorResponse'), {
            message: '이미지가 필요합니다',
          }),
        },
      },
    },
    '/api/poll-scheduler/ping': {
      get: {
        tags: ['Poll Scheduler'],
        summary: '스케줄러 연결 확인',
        responses: {
          '200': jsonResponse('스케줄러 연결 확인 성공', ref('SchedulerPingResponse')),
        },
      },
    },
  },
} as const;
