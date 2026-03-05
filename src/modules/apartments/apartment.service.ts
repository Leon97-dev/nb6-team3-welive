import { Role } from '@prisma/client';
import { NotFoundError } from '../../middlewares/error-handler';
import type { ListApartmentsQuery } from './apartment.dto';
import apartmentRepository from './apartment.repository';

// ==============================================
// ⭐️ 아파트 관련 Service
// ==============================================
class ApartmentService {
  // 1) 아파트 목록 조회 (관리자용)
  list(query: ListApartmentsQuery, actor?: Express.UserContext) {
    // 1-1) 일반 사용자 또는 관리자는 자신의 아파트 정보만 조회할 수 있도록 apartmentId를 설정
    const apartmentId =
      actor?.role === Role.ADMIN || actor?.role === Role.USER
        ? (actor.apartmentId ?? undefined)
        : undefined;

    return apartmentRepository.list(query, apartmentId);
  }

  // 2) 아파트 목록 조회 (공개용)
  listPublic() {
    return apartmentRepository.listPublic();
  }

  // 3) 아파트 상세 조회 (관리자용)
  getById(apartmentId: string, actor?: Express.UserContext) {
    // 3-1) 일반 사용자 또는 관리자는 자신의 아파트 정보만 조회할 수 있도록 apartmentId를 검증
    if (
      (actor?.role === Role.ADMIN || actor?.role === Role.USER) &&
      actor.apartmentId !== apartmentId
    ) {
      throw new NotFoundError('아파트 정보를 찾을 수 없습니다');
    }

    return apartmentRepository.getById(apartmentId);
  }

  // 4) 아파트 상세 조회 (공개용)
  getPublicById(apartmentId: string) {
    return apartmentRepository.getPublicById(apartmentId);
  }
}

export default new ApartmentService();
