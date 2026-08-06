import { Plus, Trash2 } from 'lucide-react';

function updateAt(items, index, updater) {
  return items.map((item, itemIndex) => itemIndex === index ? updater(item) : item);
}

export default function EditorialArticleFields({ onChange, payload, validation }) {
  const updateRoot = (key, value) => onChange({ ...payload, [key]: value });
  const updateBook = (index, key, value) => updateRoot('books', updateAt(payload.books, index, book => ({ ...book, [key]: value })));
  const updateCover = (index, key, value) => updateRoot('books', updateAt(payload.books, index, book => ({ ...book, cover: { ...book.cover, [key]: value } })));
  const updateSource = (index, key, value) => updateRoot('sources', updateAt(payload.sources, index, source => ({ ...source, [key]: value })));
  const addSource = () => updateRoot('sources', [...payload.sources, { book_isbn13: null, label: '', type: 'REVIEW', url: '' }]);
  const removeSource = index => updateRoot('sources', payload.sources.filter((_, sourceIndex) => sourceIndex !== index));

  return (
    <section className="admin-editorial-fields" aria-labelledby="editorial-fields-title">
      <div className="admin-section-head">
        <div><span className="mono">LONGFORM EDITORIAL</span><strong id="editorial-fields-title">편집 추천 기사</strong></div>
        <span className={`admin-editorial-validity ${validation.valid ? 'is-valid' : ''}`}>{validation.valid ? '구조 검증 완료' : `${validation.errors.length}개 확인 필요`}</span>
      </div>

      <label><span>편집 테마</span><input onChange={event => updateRoot('theme', event.target.value)} value={payload.theme} /></label>
      <label><span>한 줄 소개</span><textarea onChange={event => updateRoot('deck', event.target.value)} rows="3" value={payload.deck} /></label>
      <label><span>여는 글</span><textarea onChange={event => updateRoot('intro', event.target.value)} rows="7" value={payload.intro} /></label>

      <div className="admin-editorial-books">
        {payload.books.map((book, index) => (
          <fieldset className="admin-editorial-book" key={book.isbn13 || index}>
            <legend>{index + 1}번째 책</legend>
            <div className="admin-discovery-fields two-columns">
              <label><span>제목</span><input onChange={event => updateBook(index, 'title', event.target.value)} value={book.title} /></label>
              <label><span>저자</span><input onChange={event => updateBook(index, 'author', event.target.value)} value={book.author} /></label>
              <label><span>옮긴이</span><input onChange={event => updateBook(index, 'translator', event.target.value)} value={book.translator} /></label>
              <label><span>ISBN13</span><input inputMode="numeric" maxLength="13" onChange={event => updateBook(index, 'isbn13', event.target.value)} pattern="[0-9]{13}" value={book.isbn13} /></label>
            </div>
            <label><span>간단한 줄거리</span><textarea onChange={event => updateBook(index, 'synopsis', event.target.value)} rows="5" value={book.synopsis} /></label>
            <label><span>SF에서의 자리</span><textarea onChange={event => updateBook(index, 'standing', event.target.value)} rows="5" value={book.standing} /></label>
            <label><span>이번에 함께 읽는 이유</span><textarea onChange={event => updateBook(index, 'reason', event.target.value)} rows="5" value={book.reason} /></label>
            <label><span>편집 노트</span><textarea onChange={event => updateBook(index, 'reflection', event.target.value)} rows="5" value={book.reflection} /></label>
            <div className="admin-discovery-fields two-columns">
              <label><span>표지 URL</span><input onChange={event => updateCover(index, 'url', event.target.value)} pattern="https://.*" type="url" value={book.cover?.url || ''} /></label>
              <label><span>표지 출처 URL</span><input onChange={event => updateCover(index, 'source_url', event.target.value)} pattern="https://.*" type="url" value={book.cover?.source_url || ''} /></label>
            </div>
            <label><span>표지 대체 텍스트</span><input onChange={event => updateCover(index, 'alt', event.target.value)} value={book.cover?.alt || ''} /></label>
            <div className="admin-discovery-fields two-columns">
              <label><span>표지 사용 상태</span><select onChange={event => updateCover(index, 'rights_status', event.target.value)} value={book.cover?.rights_status || ''}><option value="">확인 필요</option><option value="API_LICENSED">API 제공</option><option value="APPROVED">사용 승인</option></select></label>
              <label><span>표지 사용 메모</span><input onChange={event => updateCover(index, 'rights_note', event.target.value)} value={book.cover?.rights_note || ''} /></label>
            </div>
          </fieldset>
        ))}
      </div>

      <label><span>맺는 글</span><textarea onChange={event => updateRoot('closing', event.target.value)} rows="7" value={payload.closing} /></label>

      <section className="admin-editorial-sources">
        <div className="admin-section-head"><div><span className="mono">SOURCES</span><strong>출처 {payload.sources.length}건</strong></div><button onClick={addSource} type="button"><Plus aria-hidden="true" /> 출처 추가</button></div>
        {payload.sources.map((source, index) => (
          <div className="admin-editorial-source" key={`${source.url}-${index}`}>
            <input aria-label={`${index + 1}번째 출처 이름`} onChange={event => updateSource(index, 'label', event.target.value)} value={source.label} />
            <input aria-label={`${index + 1}번째 출처 URL`} onChange={event => updateSource(index, 'url', event.target.value)} pattern="https://.*" type="url" value={source.url} />
            <button aria-label={`${index + 1}번째 출처 삭제`} onClick={() => removeSource(index)} type="button"><Trash2 aria-hidden="true" /></button>
          </div>
        ))}
      </section>

      {!validation.valid && <ul className="admin-editorial-errors" aria-live="polite">{validation.errors.map(error => <li key={error}>{error}</li>)}</ul>}
    </section>
  );
}
