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
            <span>원제</span>
            <input name="originalTitle" onChange={onChange} placeholder="원제 / 영어 제목" value={form.originalTitle} />
          </label>
          <label>
            <span>매체</span>
            <select name="category" onChange={onChange} value={form.category}>
              <option value="소설">소설</option>
              <option value="영화">영화</option>
              <option value="게임">게임</option>
              <option value="애니메이션">애니메이션</option>
            </select>
          </label>
          <label>
            <span>장르/분류</span>
            <input name="genre" onChange={onChange} placeholder="예: 사이버펑크, 스페이스 오페라" value={form.genre} />
          </label>
          <label>
            <span>창작자</span>
            <input name="author" onChange={onChange} placeholder="저자 / 감독 / 제작자" value={form.author} />
          </label>
          <label>
            <span>제작/출판</span>
            <input name="publisher" onChange={onChange} placeholder="출판사 / 배급사 / 스튜디오" value={form.publisher} />
          </label>
          <label>
            <span>연도</span>
            <input name="year" onChange={onChange} placeholder="예: 1982" value={form.year} />
          </label>
          <label>
            <span>국가</span>
            <input name="country" onChange={onChange} placeholder="예: 미국 / 일본 / 한국" value={form.country} />
          </label>
          <label className="is-wide">
            <span>한줄 설명</span>
            <input name="description" onChange={onChange} placeholder="작품을 설명하는 짧은 문장" value={form.description} />
          </label>
          <label className="is-wide">
            <span>링크</span>
            <input name="link" onChange={onChange} placeholder="알라딘, 공식 사이트, IMDb, Steam, YouTube 등" value={form.link} />
          </label>
          <label className="is-wide">
            <span>이미지 URL</span>
            <input name="image" onChange={onChange} placeholder="포스터 / 스틸컷 / 커버 이미지 URL" value={form.image} />
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
              {status === 'idle' && '소설은 기존 책 DB에, 영화·게임·애니메이션은 별도 미디어 작품 DB에 저장됩니다.'}
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
