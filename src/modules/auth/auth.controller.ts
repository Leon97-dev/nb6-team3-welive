import type { Request, Response } from 'express';
import authService from './auth.service';
import { SignUpUserDto } from './auth.dto';

/**
 * 1. 일반 유저랑 관리자 가입 나눠야하고
 * 2. 로그인
 * 3. 로그아웃
 * 4. 토큰 재발급
 * 5. 가입 승인 상태 변경 (나중에 하자)
 */

// ==============================================
// ⭐️ 인증 관련 컨트롤러 정의
// ==============================================
class AuthController {
  async signUpUser(req: Request, res: Response) {
    const result = await authService.signUpUser(req.body as SignUpUserDto);
    res.status(201).json(result);
  }
}
export default new AuthController();
// 응답 구조 (일반유저)
// {
//   "username": "nelda5913",
//   "password": "evqs0qpZxV6SmNx",
//   "contact": "01084950608",
//   "name": "황지효",
//   "email": "deven.schumm@hotmail.com",
//   "role": "USER",
//   "apartmentName": "다온아파트",
//   "apartmentDong": "132",
//   "apartmentHo": "308"
// }

// 응답 구조 (관리자)
// {
//   "username": "nelda5913",
//   "password": "evqs0qpZxV6SmNx",
//   "contact": "01084950608",
//   "name": "황지효",
//   "email": "deven.schumm@hotmail.com",
//   !"description": "테스트 아파트 설명입니다.",
//   !"startComplexNumber": "1",
//   !"endComplexNumber": "19",
//   !"startDongNumber": "1",
//   !"endDongNumber": "15",
//   !"startFloorNumber": "1",
//   !"endFloorNumber": "84",
//   !"startHoNumber": "1",
//   !"endHoNumber": "8",
//   "role": "ADMIN",
//   "apartmentName": "예린아파트",
//   !"apartmentAddress": "광주광역시 속초군 8380 야월로",
//   !"apartmentManagementNumber": "0443592820"
// }

// 응답 구조 (슈퍼 관리자)
// {
//   "username": "nelda5913",
//   "password": "evqs0qpZxV6SmNx",
//   "contact": "01084950608",
//   "name": "황지효",
//   "email": "deven.schumm@hotmail.com",
//   "role": "SUPER_ADMIN",
//   !"joinStatus": "APPROVED"
// }
