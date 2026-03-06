import type { Request, Response } from 'express';
import { UnauthorizedError } from '../../middlewares/error-handler';
import pollsService from './polls.service';
import type { CreatePollDto, ListPollsQuery, UpdatePollDto } from './polls.dto';

// ==============================================
// ⭐️ 투표 관련 Controller
// ==============================================
class PollController {
  // 1) 투표 생성
  async create(req: Request, res: Response) {
    if (!req.user) {
      throw new UnauthorizedError('로그인이 필요합니다');
    }

    const result = await pollsService.create(
      req.user,
      req.body as CreatePollDto
    );

    res.status(201).json(result);
  }

  // 2) 투표 목록 조회
  async list(req: Request, res: Response) {
    const result = await pollsService.list(
      req.query as ListPollsQuery,
      req.user
    );

    res.status(200).json(result);
  }

  // 3) 투표 상세 조회
  async getById(req: Request, res: Response) {
    const pollId = String(req.params.pollId);
    const result = await pollsService.getById(pollId, req.user);

    res.status(200).json(result);
  }

  // 4) 투표 수정
  async update(req: Request, res: Response) {
    if (!req.user) {
      throw new UnauthorizedError('로그인이 필요합니다');
    }

    const pollId = String(req.params.pollId);
    const result = await pollsService.update(
      req.user,
      pollId,
      req.body as UpdatePollDto
    );

    res.status(200).json(result);
  }

  // 5) 투표 삭제
  async remove(req: Request, res: Response) {
    if (!req.user) {
      throw new UnauthorizedError('로그인이 필요합니다');
    }

    const pollId = String(req.params.pollId);
    const result = await pollsService.remove(req.user, pollId);

    res.status(200).json(result);
  }

  // 6) 투표 참여
  async vote(req: Request, res: Response) {
    if (!req.user) {
      throw new UnauthorizedError('로그인이 필요합니다');
    }

    const optionId = String(req.params.optionId);
    const result = await pollsService.vote(req.user, optionId);

    res.status(200).json(result);
  }

  // 7) 투표 취소
  async unvote(req: Request, res: Response) {
    if (!req.user) {
      throw new UnauthorizedError('로그인이 필요합니다');
    }

    const optionId = String(req.params.optionId);
    const result = await pollsService.unvote(req.user, optionId);

    res.status(200).json(result);
  }
}

export default new PollController();
