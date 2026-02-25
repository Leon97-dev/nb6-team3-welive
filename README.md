# nb6-team3-welive

해당 프로젝트는 위리브라는 아파트 관리 플랫폼을 개발하는 것을 목표로 합니다. 이 플랫폼은 주민들과 아파트 관리 단체가 상호 관리할 수 있는 기능을 제공하여, 아파트 생활의 편의성을 높이는 것을 목적으로 합니다. 프로젝트는 고급 난이도로, 프론트엔드는 leon-welive/public/project-welive-fe-main에서 개발되며, 백엔드는 타입스크립트와 Express, PostgreSQL을 사용하여 구축됩니다.

####

#### 링크 관련 주소

- [ERD Diagram](https://www.erdcloud.com/d/CtgrhBdo9Rrchm8tj)

#### 팀원 역할 분담

- 이호성(팀장)
  - 베포 관리: 깃허브, Docker, AWS,
  - 백엔드 개발: 인증 및 유저, 아파트, 입주민
- 이광수
  - 백엔드 개발: 댓글, 민원, 이벤트
- 오예슬
  - 백엔드 개발: 투표, 게시판, 공지사항

#### 프로젝트 진행 방식

- 매주 월요일 오전 10시에 주간 회의를 진행하여, 지난 주의 작업 내용과 이번 주의 작업 계획을 공유합니다.
- 매주 금요일 오전 10시에 주간 회고를 진행하여, 이번 주의 작업 내용과 다음 주의 작업 계획을 공유합니다.

#### 폴더 트리 구조

레이어드 아키텍처를 기반으로 한 폴더 트리 구조는 다음과 같습니다.

```
src
├── app.ts
├── server.ts
├── config
│   ├── cors.ts
│   ├── env.ts
│   ├── multer.ts
│   └── prisma.ts
├── middlewares
├── modules
│   ├── apartments
│   ├── auth
│   ├── comments
│   ├── complaints
│   ├── event
│   ├── notices
│   ├── notifications
│   ├── polls
│   ├── residents
│   └── users
├── shared
│   ├── health
│   └── upload
├── types
└── utils
```
