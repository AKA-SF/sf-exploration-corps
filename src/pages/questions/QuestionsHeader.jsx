import { ArrowLeft, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function QuestionsHeader({
  count,
  description,
  eyebrow,
  homeLink = '/',
  title,
}) {
  return (
    <header className="questions-header">
      <Link className="questions-back-link" to={homeLink}>
        <ArrowLeft aria-hidden="true" />
        {homeLink === '/questions' ? '게시판 목록' : 'SF 탐사단'}
      </Link>
      <div>
        <span>{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="questions-status">
        <Sparkles aria-hidden="true" />
        <strong>{count}</strong>
      </div>
    </header>
  );
}
