import { ArrowUpRight, BookOpenText } from 'lucide-react';
import './EditorialArticle.css';

const LENSES = [
  { key: 'community', label: '공동체' },
  { key: 'water', label: '물과 기억' },
  { key: 'life', label: '생명과 기술' },
];

export default function EditorialArticle({ payload, title }) {
  if (!payload) return null;

  return (
    <article className="editorial-article">
      <header className="editorial-article__header">
        <span className="mono">EDITOR PICK · THREE CLIMATE SIGNALS</span>
        <h1>{title}</h1>
        <p className="editorial-article__deck">{payload.deck}</p>
        <div className="editorial-article__spectrum" aria-label="이번 추천의 세 관점">
          {LENSES.map(lens => <span className={`is-${lens.key}`} key={lens.key}>{lens.label}</span>)}
        </div>
      </header>

      <p className="editorial-article__intro">{payload.intro}</p>

      <div className="editorial-article__books">
        {payload.books?.map((book, index) => {
          const lens = LENSES[index] ?? LENSES[0];
          return (
            <section className={`editorial-book is-${lens.key}`} key={book.isbn13 || book.title}>
              <div className="editorial-book__signal" aria-hidden="true"><span>{String(index + 1).padStart(2, '0')}</span></div>
              <div className="editorial-book__cover-column">
                {book.cover?.url ? (
                  <a className="editorial-book__cover-link" href={book.cover.source_url} rel="noreferrer" target="_blank">
                    <img alt={book.cover.alt} className="editorial-book__cover" loading="lazy" src={book.cover.url} />
                    <span>표지 출처 <ArrowUpRight aria-hidden="true" /></span>
                  </a>
                ) : <div className="editorial-book__cover-empty"><BookOpenText aria-hidden="true" /><span>표지 확인 중</span></div>}
                <dl className="editorial-book__bibliography">
                  <div><dt>저자</dt><dd>{book.author}</dd></div>
                  <div><dt>옮긴이</dt><dd>{book.translator}</dd></div>
                  <div><dt>ISBN</dt><dd>{book.isbn13}</dd></div>
                </dl>
              </div>
              <div className="editorial-book__body">
                <span className="editorial-book__lens mono">{lens.label}</span>
                <h2>{book.title}</h2>
                <section><h3>이야기</h3><p>{book.synopsis}</p></section>
                <section><h3>SF에서의 자리</h3><p>{book.standing}</p></section>
                <section><h3>이번에 함께 읽는 이유</h3><p>{book.reason}</p></section>
                {book.reflection && <aside className="editorial-book__reflection"><span>편집 노트</span><p>{book.reflection}</p></aside>}
              </div>
            </section>
          );
        })}
      </div>

      <footer className="editorial-article__closing">
        <p>{payload.closing}</p>
        <section className="editorial-article__sources">
          <h2>출처와 더 읽을 곳</h2>
          <p>한국어판 서지, 작가·출판사 자료, 비평과 독자 논의를 함께 확인했습니다.</p>
          <ol>
            {payload.sources?.map(source => (
              <li key={`${source.label}-${source.url}`}>
                <a href={source.url} rel="noreferrer" target="_blank"><span>{source.label}</span><ArrowUpRight aria-hidden="true" /></a>
              </li>
            ))}
          </ol>
        </section>
      </footer>
    </article>
  );
}
