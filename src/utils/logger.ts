/**
 * @name Logger-Winston
 * @category Utility
 * @description
 * Winston 라이브러리를 활용한 로깅 유틸리티입니다.
 * 다양한 로그 레벨과 포맷을 지원하며, 개발 및 운영 환경에서 모두 활용됩니다.
 * 로그 레벨은 환경변수 LOG_LEVEL로 제어할 수 있습니다 (예: 'debug', 'info', 'warn', 'error').
 * @see https://www.npmjs.com/package/winston
 * @warning
 * 로그 레벨을 너무 낮게 설정하면 프로덕션에서 과도한 로그가 발생할 수 있으므로 주의해야 합니다.
 * 일반적으로 개발 환경에서는 'debug', 운영 환경에서는 'info' 또는 'warn'으로 설정하는 것을 권장합니다.
 */

import { createLogger, format, transports } from 'winston';
import type { TransformableInfo } from 'logform';
import { ENV } from '../config/env';

// 1) 로그 포맷 정의
const { combine, timestamp, printf, colorize, errors } = format;

// 2) 커스텀 로그 포맷: 타임스탬프, 레벨, 메시지, 스택 트레이스 포함
export const logger = createLogger({
  // 2-1) 로그 레벨 설정 (환경변수 LOG_LEVEL 또는 기본 'info')
  level: ENV.LOG_LEVEL,
  // 2-2) 로그 포맷 설정
  format: combine(
    // 2-2-1) 에러 객체의 스택 트레이스 포함
    errors({ stack: true }),
    // 2-2-2) 타임스탬프 추가
    timestamp(),
    // 2-2-3) 커스텀 로그 메시지 포맷
    printf((info: TransformableInfo) => {
      // 2-2-3-1) 로그 정보에서 레벨, 메시지, 타임스탬프, 스택 트레이스, 기타 메타데이터 추출
      const {
        level,
        message,
        timestamp: ts,
        stack,
        ...meta
      } = info as TransformableInfo & {
        timestamp?: string;
        stack?: string;
      };
      // 2-2-3-2) 메타데이터가 존재하면 JSON 문자열로 변환하여 로그 메시지에 포함
      const rest = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
      // 2-2-3-3) 메시지를 문자열로 변환하여 로그 포맷에 맞게 출력 (스택 트레이스가 있으면 포함)
      const msg = String(message);
      // 2-2-3-4) 최종 로그 메시지 포맷: [타임스탬프] 레벨: 메시지 메타데이터 (스택 트레이스 포함)
      return stack
        ? `[${ts ?? ''}] ${level}: ${msg} ${rest}\n${stack}`
        : `[${ts ?? ''}] ${level}: ${msg}${rest}`;
    })
  ),
  // 2-3) 로그 출력 방식 설정: 콘솔 출력
  transports: [
    new transports.Console({
      format: combine(colorize(), timestamp(), errors({ stack: true })),
    }),
  ],
});
