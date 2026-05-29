import { Database } from 'lucide-react';
import ModalShell from '../../components/ModalShell';

export default function WorkArchiveFormPanel({
  form,
  message,
  onChange,
  onClose,
  onSubmit,
  status,
}) {
  return (
    <ModalShell ariaLabel="작품 아카이브 입력">
      <article className="work-submit-panel">
        <header className="work-detail-head">
          <div>
            <span>NEW ARCHIVE SIGNAL</span>
            <h3>작품 아카이브</h3>
            <p>입력한 작품 신호는 노션 작품 아카이브 DB에 바로 저장됩니다.</p>
          </div>
          <button onClick={onClose} type="button" aria-label="작품 아카이브 입력 닫기">×</button>
        </header>

        <form className="work-submit-form" onSubmit={onSubmit}>
          <label>
            <span>제목</span>
            <input name="title" onChange={onChange} placeholder="작품 제목" required value={form.title} />
          </label>
          <label>
            <span>카테고리</span>
            <select name="category" onChange={onChange} value={form.category}>
              <option value="소설">소설</option>
              <option value="영화">영화</option>
              <option value="게임">게임</option>
              <option value="애니메이션">애니메이션</option>
            </select>
          </label>
          <label>
            <span>저자</span>
            <input name="author" onChange={onChange} placeholder="저자 / 감독 / 제작자" value={form.author} />
          </label>
          <label>
            <span>출판사</span>
            <input name="publisher" onChange={onChange} placeholder="출판사 / 배급사 / 스튜디오" value={form.publisher} />
          </label>
          <label className="is-wide">
            <span>알라딘 링크</span>
            <input name="link" onChange={onChange} placeholder="https://www.aladin.co.kr/..." value={form.link} />
          </label>
          <label>
            <span>태그</span>
            <input name="tags" onChange={onChange} placeholder="쉼표로 구분: 하드SF, 디스토피아" value={form.tags} />
          </label>
          <label>
            <span>추천자</span>
            <input name="recommender" onChange={onChange} placeholder="추천자 이름" value={form.recommender} />
          </label>
          <div className="work-submit-actions">
            <p className={`work-comment-message is-${status}`}>
              {status === 'idle' && '현재는 소설 입력을 기준으로 작동합니다. 다른 카테고리는 선택만 가능합니다.'}
              {status === 'submitting' && '노션에 작품 신호를 저장 중입니다.'}
              {status !== 'idle' && status !== 'submitting' && message}
            </p>
            <button disabled={status === 'submitting'} type="submit">
              <Database aria-hidden="true" />
              {status === 'submitting' ? '저장 중' : '노션에 저장'}
            </button>
          </div>
        </form>
      </article>
    </ModalShell>
  );
}
