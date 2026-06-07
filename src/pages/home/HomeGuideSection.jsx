import { Link } from 'react-router-dom';
import { BookOpen, Compass, MessageSquareText, Radar, Sparkles } from 'lucide-react';

function SignalLink({ children, className = '', href }) {
  if (href?.startsWith('/')) {
    return <Link className={className} to={href}>{children}</Link>;
  }
  return <a className={className} href={href || '#works-archive'}>{children}</a>;
}

const routeSteps = [
  {
    icon: Sparkles,
    label: 'STEP 01',
    title: '성향 테스트',
    text: '내가 어떤 SF 탐사자인지 먼저 확인합니다.',
    href: '#taste-test',
  },
  {
    icon: BookOpen,
    label: 'STEP 02',
    title: '작품 2개 열람',
    text: '추천 작품을 열고 읽고 싶은 좌표를 저장합니다.',
    href: '#works-archive',
  },
  {
    icon: Compass,
    label: 'STEP 03',
    title: '탐사좌표 확인',
    text: '장르 노드를 눌러 작품, 개념, 글을 연결합니다.',
    href: '#coordinates',
  },
  {
    icon: MessageSquareText,
    label: 'STEP 04',
    title: '첫 교신 남기기',
    text: '커뮤니티에 질문이나 추천을 남기며 MP를 쌓습니다.',
    href: '/questions',
  },
];

function getSignalItems({ concepts, mediaItems, questions, works }) {
  const safeConcepts = concepts ?? [];
  const safeMediaItems = mediaItems ?? [];
  const safeQuestions = questions ?? [];
  const safeWorks = works ?? [];

  return [
    safeWorks[0] && {
      href: '#works-archive',
      label: 'WORK SIGNAL',
      meta: safeWorks[0].medium || '작품 아카이브',
      title: safeWorks[0].title,
    },
    safeConcepts[0] && {
      href: '#concept-dictionary',
      label: 'CONCEPT SIGNAL',
      meta: safeConcepts[0].english || safeConcepts[0].category || 'SF 개념',
      title: safeConcepts[0].term,
    },
    safeQuestions[0] && {
      href: safeQuestions[0].id ? `/questions/${safeQuestions[0].id}` : '/questions',
      label: 'BOARD SIGNAL',
      meta: safeQuestions[0].category || '커뮤니티',
      title: safeQuestions[0].title,
    },
    safeMediaItems[0] && {
      href: '#media-archive',
      label: 'MEDIA SIGNAL',
      meta: safeMediaItems[0].category || safeMediaItems[0].medium || '미디어',
      title: safeMediaItems[0].title,
    },
  ].filter(Boolean);
}

export default function HomeGuideSection({
  concepts,
  mediaItems,
  questions,
  works,
}) {
  const signals = getSignalItems({ concepts, mediaItems, questions, works });

  return (
    <section className="home-guide-section" aria-label="처음 온 탐사자 안내와 오늘의 추천 신호">
      <div className="section-shell home-guide-shell">
        <article className="first-visitor-panel">
          <span className="mono">FIRST CONTACT ROUTE</span>
          <h2>처음 온 탐사자라면</h2>
          <p>
            SF 탐사단은 작품을 저장하는 사이트이면서, 취향을 찾고 기록을 쌓는 탐사 장비입니다.
            아래 순서대로 누르면 가장 빠르게 핵심 기능을 경험할 수 있습니다.
          </p>
          <div className="first-route-grid">
            {routeSteps.map(step => {
              const Icon = step.icon;
              return (
                <SignalLink className="first-route-card" href={step.href} key={step.label}>
                  <Icon aria-hidden="true" />
                  <span>{step.label}</span>
                  <strong>{step.title}</strong>
                  <em>{step.text}</em>
                </SignalLink>
              );
            })}
          </div>
        </article>

        <aside className="today-signal-panel">
          <div className="today-signal-head">
            <Radar aria-hidden="true" />
            <div>
              <span className="mono">TODAY'S SIGNALS</span>
              <strong>오늘 확인할 신호</strong>
            </div>
          </div>
          <div className="today-signal-list">
            {signals.map(signal => (
              <SignalLink className="today-signal-card" href={signal.href} key={`${signal.label}-${signal.title}`}>
                <span>{signal.label}</span>
                <strong>{signal.title}</strong>
                <em>{signal.meta}</em>
              </SignalLink>
            ))}
            {signals.length === 0 && (
              <p className="today-signal-empty">아카이브 신호를 동기화하는 중입니다.</p>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}
