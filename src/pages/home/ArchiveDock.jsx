import { ChevronRight } from 'lucide-react';

function getCardStatus(card, metrics) {
  if (!metrics) return '';
  if (card.title.includes('작품')) return `${metrics.works} 작품 신호`;
  if (card.title.includes('미디어')) return `${metrics.media} 미디어 신호`;
  if (card.title.includes('좌표')) return `${metrics.concepts} 개념 좌표`;
  if (card.title.includes('로그')) return `${metrics.logs} 탐사 로그`;
  if (card.title.includes('개념')) return `${metrics.concepts} 용어`;
  if (card.title.includes('커뮤니티')) return `${metrics.questions} 교신`;
  return '';
}

export default function ArchiveDock({ archiveCards, metrics, onResetCoordinateMap }) {
  return (
    <section className="archive-dock" id="archive-links" aria-label="아카이브 바로가기">
      {archiveCards.map(card => {
        const Icon = card.icon;
        const status = getCardStatus(card, metrics);
        return (
          <a className="dock-card" href={card.href} key={card.title} onClick={card.href === '#coordinates' ? onResetCoordinateMap : undefined}>
            <Icon aria-hidden="true" />
            <span>
              <strong>{card.title}</strong>
              <em>{card.text}</em>
              {status && <small>{status}</small>}
            </span>
            <ChevronRight aria-hidden="true" />
          </a>
        );
      })}
    </section>
  );
}
