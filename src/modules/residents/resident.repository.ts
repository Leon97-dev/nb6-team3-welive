import {
  HouseholderType,
  ResidentOccupancyStatus,
  Role,
  type Prisma,
} from '@prisma/client';
import fs from 'fs/promises';
import prisma from '../../config/prisma';
import {
  AppError,
  ConflictError,
  NotFoundError,
} from '../../middlewares/error-handler';
import { resolvePagination } from '../../utils/pagination';
import type {
  CreateResidentDto,
  ListResidentsQuery,
  UpdateResidentDto,
} from './resident.dto';
import { parseResidentsCsv } from './repository/csv';
import { tryLinkUserWithRoster } from './repository/linker';
import {
  toResidentRowFromRoster,
  toResidentRowFromUser,
} from './repository/mapper';
import {
  normalizeBuilding,
  normalizeContact,
  normalizeHouseholder,
  normalizeUnitNumber,
} from './repository/normalizer';

// ==============================================
// ⭐️ 입주민 관련 Repository
// ==============================================
class ResidentRepository {
  // 1) 입주민 목록 조회 (관리자용, 템플릿 CSV 다운로드)
  async list(query: ListResidentsQuery, actor: Express.UserContext) {
    if (actor.role !== Role.ADMIN) {
      throw new AppError('입주민 목록 조회 권한이 없습니다', 403);
    }

    const { limit, skip } = resolvePagination(query, {
      defaultPage: 1,
      defaultLimit: 20,
      maxLimit: 100,
    });

    if (query.isRegistered === 'true') {
      if (query.residenceStatus === 'NO_RESIDENCE') {
        return {
          residents: [],
          totalCount: 0,
          count: 0,
          message: '입주민 목록이 성공적으로 조회되었습니다.',
        };
      }

      const where: Prisma.UserWhereInput = {
        deletedAt: null,
        role: Role.USER,
        isRegistered: true,
      };

      if (actor.role === Role.ADMIN) {
        if (!actor.apartmentId) {
          throw new AppError('관리자 아파트 정보가 없습니다', 400);
        }
        where.apartmentId = actor.apartmentId;
      }

      if (query.isHouseholder) {
        where.isHouseholder = query.isHouseholder;
      }
      if (query.building) where.building = query.building;
      if (query.unitNumber) where.unitNumber = query.unitNumber;
      if (query.keyword) {
        where.OR = [
          { name: { contains: query.keyword, mode: 'insensitive' } },
          { contact: { contains: query.keyword, mode: 'insensitive' } },
        ];
      }

      const [residents, totalCount] = await prisma.$transaction([
        prisma.user.findMany({
          where,
          skip,
          take: limit,
          orderBy: [
            { building: 'asc' },
            { unitNumber: 'asc' },
            { createdAt: 'desc' },
          ],
          select: {
            id: true,
            name: true,
            contact: true,
            email: true,
            building: true,
            unitNumber: true,
            approvalStatus: true,
            isRegistered: true,
            isHouseholder: true,
          },
        }),
        prisma.user.count({ where }),
      ]);

      return {
        residents: residents.map(toResidentRowFromUser),
        totalCount,
        count: residents.length,
        message: '입주민 목록이 성공적으로 조회되었습니다.',
      };
    }

    const where: Prisma.ResidentRosterWhereInput = {
      deletedAt: null,
    };
    const andConditions: Prisma.ResidentRosterWhereInput[] = [];

    if (actor.role === Role.ADMIN) {
      if (!actor.apartmentId) {
        throw new AppError('관리자 아파트 정보가 없습니다', 400);
      }
      where.apartmentId = actor.apartmentId;
    }

    if (query.isHouseholder) {
      where.isHouseholder = query.isHouseholder;
    }

    if (query.building) where.building = query.building;
    if (query.unitNumber) where.unitNumber = query.unitNumber;
    if (query.residenceStatus) {
      where.residenceStatus =
        query.residenceStatus === 'NO_RESIDENCE'
          ? ResidentOccupancyStatus.NO_RESIDENCE
          : ResidentOccupancyStatus.RESIDENCE;
    }

    if (query.keyword) {
      andConditions.push({
        OR: [
          { name: { contains: query.keyword, mode: 'insensitive' } },
          { contact: { contains: query.keyword, mode: 'insensitive' } },
        ],
      });
    }

    if (query.isRegistered === 'false') {
      andConditions.push({
        OR: [{ userId: null }, { user: { deletedAt: { not: null } } }],
      });
    }

    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    const [residentRosters, totalCount] = await prisma.$transaction([
      prisma.residentRoster.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { building: 'asc' },
          { unitNumber: 'asc' },
          { createdAt: 'desc' },
        ],
        include: {
          user: {
            select: {
              id: true,
              email: true,
              approvalStatus: true,
              deletedAt: true,
            },
          },
        },
      }),
      prisma.residentRoster.count({ where }),
    ]);

    return {
      residents: residentRosters.map(toResidentRowFromRoster),
      totalCount,
      count: residentRosters.length,
      message: '입주민 목록이 성공적으로 조회되었습니다.',
    };
  }

  // 2) 입주민 생성 (관리자용)
  async create(actor: Express.UserContext, payload: CreateResidentDto) {
    if (actor.role !== Role.ADMIN) {
      throw new AppError('입주민 등록 권한이 없습니다', 403);
    }

    if (!actor.apartmentId) {
      throw new AppError('관리자 아파트 정보가 없습니다', 400);
    }
    const apartmentId = actor.apartmentId;
    const name = payload.name.trim();
    if (!name) {
      throw new AppError('이름을 입력해주세요', 400);
    }

    const building = normalizeBuilding(payload.building);
    const unitNumber = normalizeUnitNumber(payload.unitNumber);
    const contact = normalizeContact(payload.contact);
    const isHouseholder = normalizeHouseholder(payload.isHouseholder);

    try {
      const resident = await prisma.$transaction(async (tx) => {
        const created = await tx.residentRoster.create({
          data: {
            apartmentId,
            name,
            contact,
            building,
            unitNumber,
            isHouseholder,
            residenceStatus: ResidentOccupancyStatus.RESIDENCE,
          },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                approvalStatus: true,
                deletedAt: true,
              },
            },
          },
        });

        const linked = await tryLinkUserWithRoster(tx, {
          id: created.id,
          apartmentId,
          name,
          contact,
          building,
          unitNumber,
          isHouseholder,
          userId: created.userId,
        });

        if (!linked) {
          return created;
        }

        const refreshed = await tx.residentRoster.findUnique({
          where: { id: created.id },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                approvalStatus: true,
                deletedAt: true,
              },
            },
          },
        });

        if (!refreshed) {
          throw new NotFoundError('입주민 명부를 찾을 수 없습니다');
        }

        return refreshed;
      });

      return toResidentRowFromRoster(resident);
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') {
        throw new ConflictError('이미 등록된 입주민 정보입니다');
      }
      throw error;
    }
  }

  // 3) CSV로 입주민 일괄 등록 (관리자용)
  async importFromCsv(actor: Express.UserContext, filePath: string) {
    if (actor.role !== Role.ADMIN) {
      throw new AppError('입주민 파일 등록 권한이 없습니다', 403);
    }

    if (!actor.apartmentId) {
      throw new AppError('관리자 아파트 정보가 없습니다', 400);
    }

    const raw = await fs.readFile(filePath, 'utf-8');
    const rows = parseResidentsCsv(raw);

    if (rows.length === 0) {
      return {
        message: '업로드할 유효한 데이터가 없습니다',
        count: 0,
      };
    }

    const stats = {
      total: rows.length,
      created: 0,
      updated: 0,
      linkedUsers: 0,
      skipped: 0,
    };

    for (const row of rows) {
      try {
        const linked = await prisma.$transaction(async (tx) => {
          const uniqueWhere = {
            apartmentId_building_unitNumber_name_contact: {
              apartmentId: actor.apartmentId as string,
              building: row.building,
              unitNumber: row.unitNumber,
              name: row.name,
              contact: row.contact,
            },
          } as const;

          const existing = await tx.residentRoster.findUnique({
            where: uniqueWhere,
            select: {
              id: true,
              userId: true,
            },
          });

          let rosterId = existing?.id;
          let rosterUserId = existing?.userId ?? null;

          if (existing) {
            await tx.residentRoster.update({
              where: { id: existing.id },
              data: {
                isHouseholder: row.isHouseholder,
                residenceStatus: ResidentOccupancyStatus.RESIDENCE,
                deletedAt: null,
              },
            });
            stats.updated += 1;
          } else {
            const created = await tx.residentRoster.create({
              data: {
                apartmentId: actor.apartmentId as string,
                building: row.building,
                unitNumber: row.unitNumber,
                name: row.name,
                contact: row.contact,
                isHouseholder: row.isHouseholder,
                residenceStatus: ResidentOccupancyStatus.RESIDENCE,
              },
              select: {
                id: true,
                userId: true,
              },
            });
            rosterId = created.id;
            rosterUserId = created.userId;
            stats.created += 1;
          }

          if (!rosterId) {
            return false;
          }

          return tryLinkUserWithRoster(tx, {
            id: rosterId,
            apartmentId: actor.apartmentId as string,
            building: row.building,
            unitNumber: row.unitNumber,
            name: row.name,
            contact: row.contact,
            isHouseholder: row.isHouseholder,
            userId: rosterUserId,
          });
        });

        if (linked) {
          stats.linkedUsers += 1;
        }
      } catch {
        stats.skipped += 1;
      }
    }

    return {
      message: `${stats.created}명의 입주민이 등록되었습니다`,
      count: stats.created,
    };
  }

  // 4) 입주민 목록 CSV 다운로드 (관리자용)
  async downloadCsv(actor: Express.UserContext, query: ListResidentsQuery) {
    if (actor.role !== Role.ADMIN) {
      throw new AppError('입주민 명부 다운로드 권한이 없습니다', 403);
    }

    if (!actor.apartmentId) {
      throw new AppError('관리자 아파트 정보가 없습니다', 400);
    }

    const listResult = await this.list(query, actor);
    const residents = listResult.residents;

    const header = [
      'id',
      'userId',
      'building',
      'unitNumber',
      'contact',
      'name',
      'email',
      'residenceStatus',
      'isHouseholder',
      'isRegistered',
      'approvalStatus',
    ];

    const lines = residents.map((resident) => {
      return [
        resident.id,
        resident.userId,
        resident.building,
        resident.unitNumber,
        resident.contact,
        resident.name,
        resident.email,
        resident.residenceStatus,
        resident.isHouseholder,
        resident.isRegistered ? 'true' : 'false',
        resident.approvalStatus,
      ]
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(',');
    });

    return ['\uFEFF' + header.join(','), ...lines].join('\n');
  }

  // 5) 입주민 목록 조회 (관리자용, 템플릿 CSV 다운로드)
  getTemplateCsv() {
    const header = [
      'building',
      'unitNumber',
      'name',
      'contact',
      'isHouseholder',
    ];
    const sample1 = ['101', '1001', '홍길동', '01012341234', 'HOUSEHOLDER'];
    const sample2 = ['101', '1002', '김철수', '01098765432', 'MEMBER'];

    return [
      '\uFEFF' + header.join(','),
      sample1.join(','),
      sample2.join(','),
    ].join('\n');
  }

  // 6) 입주민 상세 조회 (관리자용)
  async createFromUser(actor: Express.UserContext, userId: string) {
    if (actor.role !== Role.ADMIN) {
      throw new AppError('입주민 등록 권한이 없습니다', 403);
    }

    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        role: Role.USER,
        deletedAt: null,
      },
      select: {
        id: true,
        apartmentId: true,
        name: true,
        contact: true,
        email: true,
        building: true,
        unitNumber: true,
        approvalStatus: true,
        isHouseholder: true,
      },
    });

    if (!user) {
      throw new NotFoundError('사용자 정보를 찾을 수 없습니다');
    }

    if (!user.apartmentId) {
      throw new AppError('사용자의 아파트 정보가 없습니다', 400);
    }

    if (actor.role === Role.ADMIN && actor.apartmentId !== user.apartmentId) {
      throw new AppError('다른 아파트 사용자는 등록할 수 없습니다', 403);
    }

    if (!user.building || !user.unitNumber) {
      throw new AppError('사용자의 동/호 정보가 없습니다', 400);
    }

    const building = normalizeBuilding(user.building);
    const unitNumber = normalizeUnitNumber(user.unitNumber);
    const contact = normalizeContact(user.contact);
    const isHouseholder = user.isHouseholder ?? HouseholderType.MEMBER;

    const resident = await prisma.$transaction(async (tx) => {
      const existing = await tx.residentRoster.findFirst({
        where: {
          apartmentId: user.apartmentId as string,
          building,
          unitNumber,
          name: user.name,
          contact,
          deletedAt: null,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              approvalStatus: true,
              deletedAt: true,
            },
          },
        },
      });

      if (existing) {
        if (existing.userId !== user.id) {
          return tx.residentRoster.update({
            where: { id: existing.id },
            data: { userId: user.id, isHouseholder },
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  approvalStatus: true,
                  deletedAt: true,
                },
              },
            },
          });
        }
        return existing;
      }

      return tx.residentRoster.create({
        data: {
          apartmentId: user.apartmentId as string,
          building,
          unitNumber,
          name: user.name,
          contact,
          isHouseholder,
          residenceStatus: ResidentOccupancyStatus.RESIDENCE,
          userId: user.id,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              approvalStatus: true,
              deletedAt: true,
            },
          },
        },
      });
    });

    return toResidentRowFromRoster(resident);
  }

  // 7) 입주민 상세 조회 (관리자용)
  async getById(actor: Express.UserContext, residentId: string) {
    if (actor.role !== Role.ADMIN) {
      throw new AppError('입주민 조회 권한이 없습니다', 403);
    }

    const roster = await prisma.residentRoster.findFirst({
      where: {
        id: residentId,
        deletedAt: null,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            approvalStatus: true,
            deletedAt: true,
          },
        },
      },
    });

    if (roster) {
      if (
        actor.role === Role.ADMIN &&
        actor.apartmentId !== roster.apartmentId
      ) {
        throw new AppError('다른 아파트 입주민은 조회할 수 없습니다', 403);
      }
      return toResidentRowFromRoster(roster);
    }

    const resident = await prisma.user.findFirst({
      where: {
        id: residentId,
        role: Role.USER,
        deletedAt: null,
      },
      select: {
        id: true,
        apartmentId: true,
        name: true,
        contact: true,
        email: true,
        building: true,
        unitNumber: true,
        approvalStatus: true,
        isRegistered: true,
        isHouseholder: true,
      },
    });

    if (!resident) {
      throw new NotFoundError('입주민 정보를 찾을 수 없습니다');
    }

    if (
      actor.role === Role.ADMIN &&
      actor.apartmentId !== resident.apartmentId
    ) {
      throw new AppError('다른 아파트 입주민은 조회할 수 없습니다', 403);
    }

    return toResidentRowFromUser(resident);
  }

  // 8) 입주민 정보 수정 (관리자용)
  async update(
    actor: Express.UserContext,
    residentId: string,
    payload: UpdateResidentDto
  ) {
    if (actor.role !== Role.ADMIN) {
      throw new AppError('입주민 수정 권한이 없습니다', 403);
    }

    const building = normalizeBuilding(payload.building);
    const unitNumber = normalizeUnitNumber(payload.unitNumber);
    const contact = normalizeContact(payload.contact);
    const name = payload.name.trim();

    const roster = await prisma.residentRoster.findFirst({
      where: {
        id: residentId,
        deletedAt: null,
      },
      select: {
        id: true,
        apartmentId: true,
        userId: true,
      },
    });

    if (roster) {
      if (
        actor.role === Role.ADMIN &&
        actor.apartmentId !== roster.apartmentId
      ) {
        throw new AppError('다른 아파트 입주민은 수정할 수 없습니다', 403);
      }

      const updated = await prisma.$transaction(async (tx) => {
        const updatedRoster = await tx.residentRoster.update({
          where: { id: roster.id },
          data: {
            building,
            unitNumber,
            contact,
            name,
            isHouseholder: payload.isHouseholder,
          },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                approvalStatus: true,
                deletedAt: true,
              },
            },
          },
        });

        if (updatedRoster.userId) {
          await tx.user.update({
            where: { id: updatedRoster.userId },
            data: {
              building,
              unitNumber,
              contact,
              name,
              isHouseholder: payload.isHouseholder,
            },
          });
        }

        return updatedRoster;
      });

      return toResidentRowFromRoster(updated);
    }

    const resident = await prisma.user.findFirst({
      where: {
        id: residentId,
        role: Role.USER,
        deletedAt: null,
      },
      select: {
        id: true,
        apartmentId: true,
      },
    });

    if (!resident) {
      throw new NotFoundError('입주민 계정을 찾을 수 없습니다');
    }

    if (
      actor.role === Role.ADMIN &&
      actor.apartmentId !== resident.apartmentId
    ) {
      throw new AppError('다른 아파트 입주민은 수정할 수 없습니다', 403);
    }

    const updated = await prisma.user.update({
      where: { id: resident.id },
      data: {
        building,
        unitNumber,
        contact,
        name,
        isHouseholder: payload.isHouseholder,
      },
      select: {
        id: true,
        name: true,
        contact: true,
        email: true,
        building: true,
        unitNumber: true,
        approvalStatus: true,
        isRegistered: true,
        isHouseholder: true,
      },
    });

    return toResidentRowFromUser(updated);
  }

  // 9) 입주민 삭제 (관리자용)
  async remove(actor: Express.UserContext, residentId: string) {
    if (actor.role !== Role.ADMIN) {
      throw new AppError('입주민 삭제 권한이 없습니다', 403);
    }

    const roster = await prisma.residentRoster.findFirst({
      where: {
        id: residentId,
        deletedAt: null,
      },
      select: {
        id: true,
        apartmentId: true,
        userId: true,
      },
    });

    if (roster) {
      if (
        actor.role === Role.ADMIN &&
        actor.apartmentId !== roster.apartmentId
      ) {
        throw new AppError('다른 아파트 입주민은 삭제할 수 없습니다', 403);
      }

      await prisma.$transaction(async (tx) => {
        if (roster.userId) {
          await tx.authSession.updateMany({
            where: {
              userId: roster.userId,
              revokedAt: null,
            },
            data: { revokedAt: new Date() },
          });

          await tx.user.update({
            where: { id: roster.userId },
            data: { deletedAt: new Date() },
          });
        }

        await tx.residentRoster.update({
          where: { id: roster.id },
          data: { deletedAt: new Date(), userId: null },
        });
      });

      return { message: '작업이 성공적으로 완료되었습니다' };
    }

    const resident = await prisma.user.findFirst({
      where: {
        id: residentId,
        role: Role.USER,
        deletedAt: null,
      },
      select: {
        id: true,
        apartmentId: true,
      },
    });

    if (!resident) {
      throw new NotFoundError('입주민 계정을 찾을 수 없습니다');
    }

    if (
      actor.role === Role.ADMIN &&
      actor.apartmentId !== resident.apartmentId
    ) {
      throw new AppError('다른 아파트 입주민은 삭제할 수 없습니다', 403);
    }

    await prisma.$transaction(async (tx) => {
      await tx.authSession.updateMany({
        where: {
          userId: resident.id,
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      });

      await tx.user.update({
        where: { id: resident.id },
        data: { deletedAt: new Date() },
      });

      await tx.residentRoster.updateMany({
        where: {
          userId: resident.id,
          deletedAt: null,
        },
        data: {
          userId: null,
          deletedAt: new Date(),
        },
      });
    });

    return { message: '작업이 성공적으로 완료되었습니다' };
  }
}

export default new ResidentRepository();
