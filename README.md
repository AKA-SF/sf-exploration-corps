# SF Exploration Corps

SF 세계를 탐험하는 인터랙티브 탐사 시스템입니다. 일반 독서앱이 아니라, SF 작품을 섹터, 신호, 탐사 로그, 탐사자 네트워크로 다루는 콘솔형 웹앱입니다.

## Local Development

```bash
npm install
npm run dev
```

로컬 주소:

```txt
http://127.0.0.1:5174
```

로컬에서 알라딘 API를 쓰려면 `.env`에 아래 값을 넣습니다.

```env
VITE_ALADIN_TTB_KEY=your_aladin_ttb_key_here
```

`.env`는 GitHub에 올리지 않습니다.

## Production API Proxy

배포 환경에서는 브라우저 코드에 알라딘 키를 노출하지 않습니다. 앱은 `/api/aladin`을 호출하고, 서버리스 함수가 알라딘 API를 대신 호출합니다.

필요한 파일:

- `api/aladin.js`
- `vercel.json`

Vercel 환경변수에는 아래 값을 넣습니다.

```env
ALADIN_TTB_KEY=your_aladin_ttb_key_here
```

로컬 개발용 `VITE_ALADIN_TTB_KEY`와 배포용 `ALADIN_TTB_KEY`는 역할이 다릅니다.

## Deploy On Vercel

1. GitHub에 이 프로젝트를 push합니다.
2. Vercel에서 GitHub repository를 import합니다.
3. Environment Variables에 `ALADIN_TTB_KEY`를 추가합니다.
4. Build Command는 `npm run build`, Output Directory는 `dist`로 둡니다.
5. 배포 후 앱 상단 `ALADIN_RELAY`가 `CONNECTED`로 표시되는지 확인합니다.

## GitHub Update Flow

처음 한 번:

```bash
git init
git add .
git commit -m "Initial SF exploration corps app"
git branch -M main
git remote add origin https://github.com/AKA-SF/sf-exploration-corps.git
git push -u origin main
```

이후 수정할 때마다:

```bash
git add .
git commit -m "Describe update"
git push
```

Vercel과 GitHub가 연결되어 있으면 `git push` 이후 자동으로 새 버전이 배포됩니다.
