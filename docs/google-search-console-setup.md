# Google Search Console 연결 및 색인 점검

이 문서는 SF 탐사단 Production(`https://www.sf-explorer.net`)의 기술적 SEO 수선이 배포된 뒤 진행한다. Search Console 등록과 DNS 변경은 Google 계정 및 도메인 관리 권한이 필요하므로 자동화하지 않는다.

## 1. 선행 조건

배포 후 일반 브라우저가 아닌 원본 HTTP 응답으로 다음을 확인한다.

- `/robots.txt`가 HTTP 200이며 `Sitemap: https://www.sf-explorer.net/sitemap.xml`을 포함한다.
- `/sitemap.xml`이 HTTP 200이며 canonical 공개 URL만 포함한다.
- `/`, `/discover`, 작품·미디어 목록, `/questions`, `/network`가 각자의 title·description·self-canonical을 최초 HTML에 포함한다.
- `/home-v2`는 `/`로, `/media/interviews`는 `/media/media`로 308 이동한다.
- 로그인·프로필·관리·작성·API 경로는 `X-Robots-Tag: noindex`를 반환한다.
- 등록되지 않은 임의 경로는 HTTP 404를 반환한다.

## 2. Domain property 등록

1. [Google Search Console](https://search.google.com/search-console/)에 사이트 소유 Google 계정으로 로그인한다.
2. 속성 추가에서 **도메인**을 선택하고 `sf-explorer.net`을 입력한다.
3. Search Console이 제시한 DNS TXT 또는 CNAME 레코드를 도메인 DNS 관리 화면에 추가한다.
4. DNS 전파 후 Search Console에서 소유권 확인을 실행한다.
5. 발급된 DNS 값이나 인증 토큰은 저장소, 문서, 채팅에 복사하지 않는다.

공식 문서: [Verify your site ownership](https://support.google.com/webmasters/answer/9008080)

## 3. sitemap 제출

1. Search Console의 **Sitemaps** 보고서를 연다.
2. `https://www.sf-explorer.net/sitemap.xml`을 제출한다.
3. 마지막 읽기 시각, 처리 상태, 발견된 URL 수와 오류를 기록한다.
4. 제출 성공은 색인 보장이 아니라 발견 신호임을 전제로 한다.

공식 문서:

- [Build and submit a sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
- [Manage your sitemaps using the Sitemaps report](https://support.google.com/webmasters/answer/7451001)

## 4. URL 검사와 대표 URL 색인 요청

다음 대표 URL을 각각 검사한다.

- `https://www.sf-explorer.net/`
- `https://www.sf-explorer.net/discover`
- `https://www.sf-explorer.net/works/novels`
- `https://www.sf-explorer.net/media/media`
- `https://www.sf-explorer.net/questions`
- `https://www.sf-explorer.net/network`

각 URL에서 다음 순서로 진행한다.

1. **URL 검사**를 실행한다.
2. **실제 URL 테스트(Test live URL)**를 실행한다.
3. 렌더링 스크린샷과 로드된 리소스를 확인한다.
4. 선언한 canonical과 Google이 선택한 canonical을 비교한다.
5. 차단·렌더링·canonical 오류가 없을 때 대표 URL만 **색인 생성 요청**한다.
6. 다수 URL은 개별 요청을 반복하지 않고 sitemap으로 관리한다.

공식 문서: [URL Inspection Tool](https://support.google.com/webmasters/answer/9012289)

## 5. 합격 기준

- Domain property 소유권 확인 완료
- sitemap 상태 `Success`
- 대표 URL의 live test에서 크롤링 허용
- 대표 URL의 선언 canonical이 각 URL 자신을 가리킴
- Google 선택 canonical이 선언 canonical과 일치하거나, 불일치 사유가 설명 가능함
- noindex 대상이 색인 대상에서 제외됨
- 임의의 존재하지 않는 URL이 soft 404가 아닌 HTTP 404로 확인됨

## 6. 운영 점검

- 배포 직후와 7일 후에 Pages/Indexing 보고서를 확인한다.
- `Crawled - currently not indexed`, `Duplicate`, `Soft 404`, `Blocked by robots.txt`를 구분해 기록한다.
- Search Console 결과가 실제 색인의 기준이다. `site:` 검색 결과만으로 색인 완료나 실패를 단정하지 않는다.
- sitemap의 `<lastmod>`는 경로별 실제 콘텐츠 수정일을 신뢰할 수 있을 때만 추가한다. 현재처럼 DB 콘텐츠와 배포 시각이 분리된 경우 부정확한 날짜는 생략한다.

## 공식 기준

- [Canonical URL 지정](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)
- [JavaScript SEO 기본 사항](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)
- [Dynamic rendering 안내](https://developers.google.com/search/docs/crawling-indexing/javascript/dynamic-rendering)
- [Google Images SEO](https://developers.google.com/search/docs/appearance/google-images)
