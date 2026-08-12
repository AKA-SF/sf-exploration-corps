import { ArrowLeft, Compass } from 'lucide-react';
import { Link } from 'react-router-dom';
import './NotFound.css';

export default function NotFound() {
  return (
    <main className="not-found-page">
      <div className="not-found-page__signal" aria-hidden="true">404</div>
      <p className="mono">SIGNAL NOT FOUND</p>
      <h1>찾으시는 탐사 경로를 찾지 못했습니다.</h1>
      <p>주소가 바뀌었거나 더 이상 공개되지 않은 경로입니다. 홈에서 현재 공개된 SF 탐사 경로를 다시 선택해 주세요.</p>
      <div className="not-found-page__actions">
        <Link className="not-found-page__primary" to="/"><Compass aria-hidden="true" /> 홈으로 돌아가기</Link>
        <Link className="not-found-page__secondary" to="/works/novels"><ArrowLeft aria-hidden="true" /> 작품 탐색으로</Link>
      </div>
    </main>
  );
}
