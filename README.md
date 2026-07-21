# 수유역 2층·3층 상가 임대 대시보드 (Railway 통합 운영)

수유역 도봉로87길 8 건물의 임대 대시보드 + 비공개 문의 시스템입니다.
대시보드, 문의 접수, 관리자(임대인) 열람을 **Railway 한 곳**에서 운영합니다.

## 구성 파일

```
suyu-app/
├── server.js          # Express 서버 (문의 저장 API, 관리자 조회 API)
├── package.json       # 의존성 및 실행 스크립트
├── .gitignore         # node_modules 등 제외
├── README.md          # 이 문서
└── public/
    ├── index.html     # 임대 대시보드 (방문자용, 문의 폼 포함)
    ├── admin.html     # 관리자 페이지 (임대인 전용, 비밀번호 보호)
    └── building.jpg   # 건물 외관 사진
```

## 기능

- **대시보드** (`/`): 2·3층 매물 비교, 층별 구성, 적합 업종, 위치 지도, 건물 사진, 문의 폼
- **문의 접수** (`POST /api/inquiries`): 방문자 문의를 DB에 저장 (공개 목록 노출 없음)
- **관리자 열람** (`/admin`): 임대인이 비밀번호 입력 후 문의 목록 확인

## Railway 배포 순서

1. **GitHub 저장소 생성**
   - 이 `suyu-app` 폴더 전체를 새 GitHub 저장소에 업로드
   - ⚠️ `public/building.jpg`(사진)가 실제로 올라갔는지 반드시 확인 (누락 시 사진 깨짐)

2. **Railway 프로젝트 생성**
   - Railway → New Project → Deploy from GitHub repo → 저장소 선택
   - Node.js 앱을 자동 감지해 빌드

3. **PostgreSQL 추가**
   - 프로젝트 화면 → New → Database → PostgreSQL

4. **환경변수 설정** (Node 서비스 → Variables 탭)
   - `DATABASE_URL` = `${{Postgres.DATABASE_URL}}`  (Postgres 서비스 참조)
   - `ADMIN_PASSWORD` = 원하는 관리자 비밀번호 (임대인만 아는 값)

5. **공개 도메인 생성**
   - Node 서비스 → Settings → Networking → Generate Domain
   - `https://<이름>.up.railway.app` 링크 생성 → 이것이 대시보드 주소
   - 관리자 페이지는 그 뒤에 `/admin` 을 붙이면 접속

6. **작동 확인**
   - 대시보드에서 문의 폼 테스트 제출
   - `/admin` 접속 → 비밀번호 입력 → 문의가 보이면 완료

## 로컬 테스트 (선택)

PostgreSQL이 있는 경우:

```bash
npm install
export DATABASE_URL="postgres://user:pass@localhost:5432/dbname"
export ADMIN_PASSWORD="원하는비밀번호"
npm start
# http://localhost:3000 접속
```

## 참고

- Railway는 사용량 기반 과금입니다. 트래픽이 적어도 서버·DB 실행 시간만큼 크레딧이 소진됩니다.
- 이메일 알림 기능은 미포함입니다. 필요 시 문의 접수 시 임대인 메일로 발송하는 SMTP 연동을 추가할 수 있습니다.
- 기존 GitHub Pages(정적 버전)는 이 Railway 버전으로 대체됩니다. Pages는 저장소 Settings → Pages → Source를 None으로 두거나, 리다이렉트 페이지로 교체하세요.
