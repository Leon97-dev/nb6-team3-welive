import bcrypt from 'bcrypt';
import prisma from '../../config/prisma';
import {
  AppError,
  NotFoundError,
  UnauthorizedError,
} from '../../middlewares/error-handler';
import uploadService from '../../shared/upload/upload.service';
import type { ChangePasswordDto, UpdateMyProfileDto } from './user.dto';

// ==============================================
// ⭐️ 사용자 관련 레포지토리 정의
// ==============================================
class UserRepository {
  // 1) 내 프로필 업데이트
  async updateMe(userId: string, payload: UpdateMyProfileDto, baseUrl: string) {
    // 1-1) 사용자 존재 여부 확인
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        deletedAt: null,
      },
    });

    if (!user) {
      throw new NotFoundError('사용자를 찾을 수 없습니다.');
    }

    // 1-2) 업데이트할 데이터 준비
    const updateData: {
      passwordHash?: string;
      profileImageUrl?: string | null;
    } = {};

    // 1-3) 비밀번호 변경이 필요한 경우 현재 비밀번호 검증 및 새 비밀번호 해싱
    if (payload.newPassword) {
      if (!payload.currentPassword) {
        throw new UnauthorizedError('현재 비밀번호가 필요합니다.');
      }

      const matched = await bcrypt.compare(
        payload.currentPassword,
        user.passwordHash
      );

      if (!matched) {
        throw new UnauthorizedError('현재 비밀번호가 일치하지 않습니다.');
      }

      updateData.passwordHash = await bcrypt.hash(payload.newPassword, 10);
    }
    // 1-4) 프로필 이미지 업데이트가 필요한 경우 이미지 업로드 및 URL 저장
    if (payload.file) {
      updateData.profileImageUrl = await uploadService.getImageUrl(
        payload.file,
        baseUrl
      );
    }

    // 1-5) 업데이트 후 로그아웃 처리 여부 결정 (비밀번호 변경 시 로그아웃)
    const shouldLogout = Boolean(updateData.passwordHash);

    await prisma.user.update({
      where: { id: user.id },
      data: updateData,
    });

    if (shouldLogout) {
      await prisma.authSession.updateMany({
        where: {
          userId: user.id,
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      });
    }

    // 1-6) 업데이트 완료 메시지 반환
    return {
      message: `${user.name}님의 프로필이 성공적으로 업데이트되었습니다. 다시 로그인해주세요.`,
    };
  }

  // 2) 비밀번호 변경
  async changePassword(userId: string, payload: ChangePasswordDto) {
    // 2-1) 사용자 존재 여부 확인
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        passwordHash: true,
      },
    });

    if (!user) {
      throw new NotFoundError('사용자를 찾을 수 없습니다.');
    }

    // 2-2) 현재 비밀번호와 새 비밀번호가 모두 제공되었는지 확인
    if (!payload.currentPassword || !payload.newPassword) {
      throw new AppError('현재 비밀번호와 새 비밀번호가 모두 필요합니다.', 400);
    }

    // 2-3) 현재 비밀번호 검증
    const matched = await bcrypt.compare(
      payload.currentPassword,
      user.passwordHash
    );

    if (!matched) {
      throw new UnauthorizedError('현재 비밀번호가 일치하지 않습니다.');
    }

    // 2-4) 새 비밀번호 해싱 및 데이터베이스 업데이트, 동시에 모든 세션 로그아웃 처리
    const passwordHash = await bcrypt.hash(payload.newPassword, 10);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      }),
      prisma.authSession.updateMany({
        where: {
          userId: user.id,
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      }),
    ]);

    // 2-5) 비밀번호 변경 완료 메시지 반환
    return {
      message: `${user.name}님의 비밀번호가 성공적으로 변경되었습니다. 다시 로그인해주세요.`,
    };
  }
}

export default new UserRepository();
