import { ApartmentStatus, type Prisma } from '@prisma/client';
import prisma from '../../config/prisma';
import { NotFoundError } from '../../middlewares/error-handler';
import { resolvePagination } from '../../utils/pagination';
import type { ListApartmentsQuery } from './apartment.dto';

// ==============================================
// ⭐️ 아파트 관련 데이터베이스 접근 로직
// ==============================================
// 1) 데이터베이스에서 아파트 정보를 직렬화하는 함수
const serializeApartment = (apartment: {
  id: string;
  name: string;
  address: string;
  officeNumber: string;
  description: string;
  apartmentStatus: ApartmentStatus;
  adminId: string | null;
  startComplexNumber: number;
  endComplexNumber: number;
  startDongNumber: number;
  endDongNumber: number;
  startFloorNumber: number;
  endFloorNumber: number;
  startHoNumber: number;
  endHoNumber: number;
  admin: { id: string; name: string; contact: string; email: string } | null;
}) => ({
  id: apartment.id,
  name: apartment.name,
  address: apartment.address,
  officeNumber: apartment.officeNumber,
  description: apartment.description,
  apartmentStatus: apartment.apartmentStatus,
  adminId: apartment.adminId,
  adminName: apartment.admin?.name ?? '',
  adminContact: apartment.admin?.contact ?? '',
  adminEmail: apartment.admin?.email ?? '',
  startComplexNumber: String(apartment.startComplexNumber),
  endComplexNumber: String(apartment.endComplexNumber),
  startDongNumber: String(apartment.startDongNumber),
  endDongNumber: String(apartment.endDongNumber),
  startFloorNumber: String(apartment.startFloorNumber),
  endFloorNumber: String(apartment.endFloorNumber),
  startHoNumber: String(apartment.startHoNumber),
  endHoNumber: String(apartment.endHoNumber),
});

// ================================================
// ⭐️ 아파트 관련 레포지토리 정의
// ================================================
class ApartmentRepository {
  // 1) 아파트 목록 조회 (관리자용)
  async list(query: ListApartmentsQuery, apartmentId?: string) {
    // 1-1) 페이지네이션 계산
    const { limit, skip } = resolvePagination(query, {
      defaultPage: 1,
      defaultLimit: 50,
    });

    // 1-2) 검색 조건 구성
    const where: Prisma.ApartmentWhereInput = {
      deletedAt: null,
    };

    if (query.name) {
      where.name = {
        contains: query.name,
        mode: 'insensitive',
      };
    }

    if (query.address) {
      where.address = {
        contains: query.address,
        mode: 'insensitive',
      };
    }

    if (query.searchKeyword) {
      where.OR = [
        { name: { contains: query.searchKeyword, mode: 'insensitive' } },
        { address: { contains: query.searchKeyword, mode: 'insensitive' } },
      ];
    }

    if (query.apartmentStatus) {
      where.apartmentStatus = query.apartmentStatus as ApartmentStatus;
    }

    if (apartmentId) {
      where.id = apartmentId;
    }

    // 1-3) 아파트 목록과 총 개수를 트랜잭션으로 조회
    const [apartments, totalCount] = await prisma.$transaction([
      prisma.apartment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          admin: {
            select: {
              id: true,
              name: true,
              contact: true,
              email: true,
            },
          },
        },
      }),
      prisma.apartment.count({ where }),
    ]);

    // 1-4) 조회된 아파트 목록을 직렬화하여 반환
    return {
      apartments: apartments.map(serializeApartment),
      totalCount,
    };
  }

  // 2) 아파트 목록 조회 (공개용)
  async listPublic() {
    // 2-1) 승인된 아파트 목록을 조회
    const apartments = await prisma.apartment.findMany({
      where: {
        apartmentStatus: ApartmentStatus.APPROVED,
        deletedAt: null,
      },
      orderBy: { name: 'asc' },
      include: {
        admin: {
          select: {
            id: true,
            name: true,
            contact: true,
            email: true,
          },
        },
      },
    });

    // 2-2) 조회된 아파트 목록을 직렬화하여 반환
    return {
      apartments: apartments.map(serializeApartment),
      totalCount: apartments.length,
    };
  }

  // 3) 아파트 상세 조회 (관리자용)
  async getById(apartmentId: string) {
    // 3-1) 아파트 정보를 조회
    const apartment = await prisma.apartment.findFirst({
      where: {
        id: apartmentId,
        deletedAt: null,
      },
      include: {
        admin: {
          select: {
            id: true,
            name: true,
            contact: true,
            email: true,
          },
        },
      },
    });

    // 3-2) 아파트 정보가 존재하지 않으면 예외 처리
    if (!apartment) {
      throw new NotFoundError('아파트 정보를 찾을 수 없습니다');
    }

    // 3-3) 조회된 아파트 정보를 직렬화하여 반환
    return serializeApartment(apartment);
  }

  // 4) 아파트 상세 조회 (공개용)
  async getPublicById(apartmentId: string) {
    // 4-1) 승인된 아파트 정보를 조회
    const apartment = await prisma.apartment.findFirst({
      where: {
        id: apartmentId,
        apartmentStatus: ApartmentStatus.APPROVED,
        deletedAt: null,
      },
      include: {
        admin: {
          select: {
            id: true,
            name: true,
            contact: true,
            email: true,
          },
        },
      },
    });

    // 4-2) 아파트 정보가 존재하지 않으면 예외 처리
    if (!apartment) {
      throw new NotFoundError('아파트 정보를 찾을 수 없습니다');
    }

    // 4-3) 조회된 아파트 정보를 직렬화하여 반환
    return serializeApartment(apartment);
  }
}

export default new ApartmentRepository();
