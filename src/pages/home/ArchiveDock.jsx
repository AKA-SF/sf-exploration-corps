import { ChevronRight } from 'lucide-react';

export default function ArchiveDock({ archiveCards, onResetCoordinateMap }) {
  return (
    <section className="archive-dock" id="archive-links" aria-label="아카이브 바로가기">
      {archiveCards.map(card => {
        const Icon = card.icon;
        return (
          <a className="dock-card" href={card.href} key={card.title} onClick={card.href === '#coordinates' ? onResetCoordinateMap : undefined}>
            <Icon aria-hidden="true" />
            <span>
              <strong>{card.title}</strong>
              <em>{card.text}</em>
            </span>
            <ChevronRight aria-hidden="true" />
          </a>
        );
      })}
    </section>
  );
}
