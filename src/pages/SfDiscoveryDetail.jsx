import { useEffect, useState } from 'react';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import EditorialArticle from '../components/editorial/EditorialArticle';
import './SfDiscoveries.css';

const DISCOVERY_SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{1,119}$/;

async function fetchDiscovery(slug, signal) {
  const response = await fetch(`/api/discoveries?slug=${encodeURIComponent(slug)}`, { signal });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || 'discovery unavailable');
    error.status = response.status;
    throw error;
  }
  return data.discovery;
}

function SfDiscoveryDetailContent({ slug }) {
  const [discovery, setDiscovery] = useState(null);
  const [status, setStatus] = useState('loading');
  const hasValidSlug = DISCOVERY_SLUG_PATTERN.test(slug || '');

  useEffect(() => {
    if (!hasValidSlug) return undefined;
    const controller = new AbortController();
    fetchDiscovery(slug, controller.signal)
      .then(item => {
        if (!item?.editorial_payload) throw new Error('editorial payload unavailable');
        setDiscovery(item);
        setStatus('ready');
      })
      .catch(error => {
        if (error.name !== 'AbortError') setStatus(error.status === 404 ? 'not-found' : 'error');
      });
    return () => controller.abort();
  }, [hasValidSlug, slug]);

  return (
    <main className="sf-discovery-detail-page">
      <Link className="sf-discoveries-back" to="/discover"><ArrowLeft aria-hidden="true" /> 새로 포착된 SF로 돌아가기</Link>
      {hasValidSlug && status === 'loading' && <div className="sf-discoveries-state" role="status"><strong>편집 추천을 불러오는 중입니다.</strong><span>공개가 승인된 본문만 확인하고 있습니다.</span></div>}
      {!hasValidSlug && <div className="sf-discoveries-state" role="alert"><RefreshCw aria-hidden="true" /><strong>이 주소는 편집 추천 상세 주소가 아닙니다.</strong><span>목록에서 공개된 추천을 선택해 주세요.</span><Link to="/discover">목록으로 돌아가기</Link></div>}
      {status === 'not-found' && <div className="sf-discoveries-state" role="alert"><RefreshCw aria-hidden="true" /><strong>이 편집 추천을 찾을 수 없습니다.</strong><span>비공개로 전환되었거나 주소가 바뀌었을 수 있습니다.</span><Link to="/discover">목록으로 돌아가기</Link></div>}
      {status === 'error' && <div className="sf-discoveries-state" role="alert"><RefreshCw aria-hidden="true" /><strong>편집 추천 연결이 지연되고 있습니다.</strong><span>잠시 후 다시 시도하거나 목록에서 다른 추천을 확인해 주세요.</span><Link to="/discover">목록으로 돌아가기</Link></div>}
      {status === 'ready' && discovery?.editorial_payload && <EditorialArticle payload={discovery.editorial_payload} title={discovery.title} />}
    </main>
  );
}

export default function SfDiscoveryDetail() {
  const { slug } = useParams();
  return <SfDiscoveryDetailContent key={slug} slug={slug} />;
}
