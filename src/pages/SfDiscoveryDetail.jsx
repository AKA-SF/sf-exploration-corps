import { useEffect, useState } from 'react';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import EditorialArticle from '../components/editorial/EditorialArticle';
import './SfDiscoveries.css';

async function fetchDiscovery(slug, signal) {
  const response = await fetch(`/api/discoveries?slug=${encodeURIComponent(slug)}`, { signal });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'discovery unavailable');
  return data.discovery;
}

function SfDiscoveryDetailContent({ slug }) {
  const [discovery, setDiscovery] = useState(null);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    const controller = new AbortController();
    fetchDiscovery(slug, controller.signal)
      .then(item => {
        if (!item?.editorial_payload) throw new Error('editorial payload unavailable');
        setDiscovery(item);
        setStatus('ready');
      })
      .catch(error => {
        if (error.name !== 'AbortError') setStatus('error');
      });
    return () => controller.abort();
  }, [slug]);

  return (
    <main className="sf-discovery-detail-page">
      <Link className="sf-discoveries-back" to="/discover"><ArrowLeft aria-hidden="true" /> 새로 포착된 SF로 돌아가기</Link>
      {status === 'loading' && <div className="sf-discoveries-state" role="status"><strong>편집 추천을 불러오는 중입니다.</strong><span>공개가 승인된 본문만 확인하고 있습니다.</span></div>}
      {status === 'error' && <div className="sf-discoveries-state" role="alert"><RefreshCw aria-hidden="true" /><strong>이 편집 추천을 열 수 없습니다.</strong><span>아직 공개되지 않았거나 잠시 연결할 수 없습니다.</span><Link to="/discover">목록으로 돌아가기</Link></div>}
      {status === 'ready' && discovery?.editorial_payload && <EditorialArticle payload={discovery.editorial_payload} title={discovery.title} />}
    </main>
  );
}

export default function SfDiscoveryDetail() {
  const { slug } = useParams();
  return <SfDiscoveryDetailContent key={slug} slug={slug} />;
}
