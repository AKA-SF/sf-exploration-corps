import EditorialArticle from '../components/editorial/EditorialArticle';
import { summerClimateEditorialDraft } from '../content/editorial/summerClimateEditorialDraft';
import './SfDiscoveries.css';

export default function EditorialDraftPreview() {
  return (
    <main className="sf-discovery-detail-page">
      <div className="editorial-draft-preview-notice" role="status">개발 환경 전용 비공개 초안 미리보기</div>
      <EditorialArticle payload={summerClimateEditorialDraft.editorial_payload} title={summerClimateEditorialDraft.title} />
    </main>
  );
}
