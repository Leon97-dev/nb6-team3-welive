# nb6-team3-welive

해당 프로젝트는 위리브라는 아파트 관리 플랫폼을 개발하는 것을 목표로 합니다. 이 플랫폼은 주민들과 아파트 관리 단체가 상호 관리할 수 있는 기능을 제공하여, 아파트 생활의 편의성을 높이는 것을 목적으로 합니다. 프로젝트는 고급 난이도로, 프론트엔드는 `public/project-welive-fe-main`에서 개발되며, 백엔드는 타입스크립트와 Express, PostgreSQL을 사용하여 구축됩니다.

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

#### AWS 배포

백엔드는 `AWS EC2 + Docker Compose + Nginx` 기준으로 배포합니다. 데이터베이스는 `PostgreSQL`을 사용하며, 운영 환경에서는 `RDS PostgreSQL` 사용을 권장합니다.

#### GitHub Actions 워크플로우

- `CI`: [`.github/workflows/ci.yml`](/Users/leon/nb6-team3-welive/.github/workflows/ci.yml)
  - `npm ci`
  - `npm run build`
  - `npm test`
  - `npm run test:e2e`
- `CD`: [`.github/workflows/cd.yml`](/Users/leon/nb6-team3-welive/.github/workflows/cd.yml)
  - `main` 브랜치 CI 성공 후 EC2 자동 배포
  - 또는 `workflow_dispatch`로 수동 배포
  - EC2에서 `docker compose up -d --build` 방식으로 배포

#### GitHub Secrets

배포를 위해 아래 Secrets를 등록해야 합니다.

- `EC2_HOST`
- `EC2_USER`
- `EC2_SSH_KEY`
- `EC2_PORT`
- `EC2_APP_DIR`
- `APP_ENV`

`APP_ENV`에는 운영 `.env` 전체 내용을 멀티라인 문자열로 등록합니다.

예시:

```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://USER:PASSWORD@RDS-ENDPOINT:5432/welive
CLIENT_URL=https://your-frontend-domain.com
ACCESS_SECRET=your-access-secret
REFRESH_SECRET=your-refresh-secret
ACCESS_EXPIRES_IN=15m
REFRESH_EXPIRES_IN=7d
LOG_LEVEL=info
```

#### EC2 서버 초기 설정

Docker, Docker Compose, Nginx를 설치합니다.

```bash
sudo apt update
sudo apt install -y nginx
sudo apt install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker $USER
```

프로젝트 디렉토리를 준비합니다.

```bash
mkdir -p ~/apps/welive
```

최초 1회는 서버에서 직접 저장소를 clone 해야 합니다.

```bash
cd ~/apps
git clone <YOUR_REPOSITORY_URL> welive
```

#### Docker 실행 기준

GitHub Actions CD가 아래 방식으로 서버를 관리합니다.

```bash
docker compose -f deploy/docker-compose.prod.yml down
docker compose -f deploy/docker-compose.prod.yml up -d --build
```

#### Nginx 설정

예시 설정 파일:

- [`deploy/nginx/welive.conf`](/Users/leon/nb6-team3-welive/deploy/nginx/welive.conf)
- [`deploy/docker-compose.prod.yml`](/Users/leon/nb6-team3-welive/deploy/docker-compose.prod.yml)
- [`Dockerfile`](/Users/leon/nb6-team3-welive/Dockerfile)

서버에 반영 예시:

```bash
sudo cp deploy/nginx/welive.conf /etc/nginx/sites-available/welive
sudo ln -s /etc/nginx/sites-available/welive /etc/nginx/sites-enabled/welive
sudo nginx -t
sudo systemctl restart nginx
```

#### 배포 흐름

1. `main` 브랜치에 push
2. GitHub Actions `CI` 성공
3. GitHub Actions `CD`가 EC2에 SSH 접속
4. `git pull`, `.env` 반영
5. `docker compose -f deploy/docker-compose.prod.yml up -d --build`
6. 컨테이너 시작 시 `prisma migrate deploy` 실행 후 서버 기동

#### 운영 체크 항목

- EC2 보안 그룹에서 `80`, `443`, `22` 포트 허용 여부 확인
- 백엔드 내부 포트 `3000`은 Nginx 뒤에서만 사용하도록 운영 권장
- 프론트와 백엔드 도메인이 다르면 `CLIENT_URL`, CORS 설정, 쿠키 정책 확인
- HTTPS 적용 시 `certbot` 또는 AWS ALB/ACM 구성 권장
- 업로드 파일은 `public/uploads` 볼륨으로 유지되도록 구성됨
