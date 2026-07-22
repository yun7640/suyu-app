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
    ├── index.html     # 브리핑 대시보드 (매물 정보 전용, 문의 폼 없음)
    ├── inquiry.html   # 임대 문의 페이지 (폼 + 이메일 발송)
    ├── admin.html     # 관리자 페이지 (임대인 전용, 비밀번호 보호)
    └── photos/        # 건물·공실 사진 5장
```

## 페이지 구성 (브리핑 전용)

- **브리핑 대시보드** (`/`): 매물 정보 전용. 2·3층 조건, 층별 구성, 적합 업종, 위치 지도, 건물·공실 사진.
  문의 폼은 없으며, 연락은 전화로 안내합니다.
- **관리자 페이지** (`/admin`): 문의 데이터 열람용 (문의 접수는 별도 앱에서 이루어집니다)

> 임대 문의 접수 기능은 **별도 프로젝트(inquiry-app)**로 분리되어 독립 링크로 운영됩니다.

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

   **이메일 알림을 쓰려면 아래 3개도 추가** (선택 · 미설정 시 저장만 동작):
   - `MAIL_USER` = 발송용 Gmail 주소 (예: suyu.lease@gmail.com)
   - `MAIL_PASS` = 해당 Gmail의 **앱 비밀번호 16자리**
   - `MAIL_TO` = 받을 주소들, 쉼표로 구분 (예: 임대인@gmail.com,중개사@naver.com)

5. **공개 도메인 생성**
   - Node 서비스 → Settings → Networking → Generate Domain
   - `https://<이름>.up.railway.app` 링크 생성 → 이것이 대시보드 주소
   - 관리자 페이지는 그 뒤에 `/admin` 을 붙이면 접속

6. **작동 확인**
   - 대시보드에서 문의 폼 테스트 제출
   - `/admin` 접속 → 비밀번호 입력 → 문의가 보이면 완료

## 이메일 알림 설정 (Gmail 앱 비밀번호 발급)

문의가 접수되면 임대인·중개사 이메일로 자동 발송됩니다.

1. 발송에 쓸 Gmail 계정 준비 (임대 전용 계정 신규 생성 권장)
2. 구글 계정 → **보안** → **2단계 인증**을 먼저 활성화
3. 같은 보안 화면에서 **앱 비밀번호** 검색 → 앱 이름(예: suyu-lease) 입력 후 생성
4. 표시되는 **16자리 비밀번호**를 복사 (한 번만 보이므로 반드시 기록)
5. Railway Variables에 `MAIL_USER`(Gmail 주소), `MAIL_PASS`(16자리), `MAIL_TO`(받을 주소들) 입력
6. 재배포 후 Deploy Logs에 `[Mail config] enabled: true` 가 뜨면 정상

- 수신자는 쉼표로 여러 명 지정 가능 (임대인 + 중개업자)
- 메일의 **답장** 버튼을 누르면 문의자에게 바로 회신됩니다
- 메일 발송이 실패해도 문의는 DB에 저장되며, 관리자 페이지에서 확인 가능합니다

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
