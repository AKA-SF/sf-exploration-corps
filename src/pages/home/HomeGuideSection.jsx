import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Compass, MessageSquareText, Sparkles, X } from 'lucide-react';
import ModalShell from '../../components/ModalShell';

function SignalLink({ children, className = '', href, onClick }) {
  if (href?.startsWith('/')) {
    return <Link className={className} onClick={onClick} to={href}>{children}</Link>;
  }
  return <a className={className} href={href || '#works-archive'} onClick={onClick}>{children}</a>;
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

export default function HomeGuideSection() {
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  return (
    <section className="home-guide-section" aria-label="처음 온 탐사자 안내">
      <div className="section-shell home-guide-shell">
        <article className="first-visitor-launch">
          <div>
            <span className="mono">FIRST CONTACT ROUTE</span>
            <h2>처음 온 탐사자라면</h2>
            <p>성향 테스트, 작품 저장, 탐사좌표, 커뮤니티까지 가장 빠른 입문 경로를 안내합니다.</p>
          </div>
          <button className="first-visitor-open" onClick={() => setIsGuideOpen(true)} type="button">
            <Sparkles aria-hidden="true" />
            안내 열기
          </button>
        </article>
      </div>

      {isGuideOpen && (
        <ModalShell ariaLabel="처음 온 탐사자 안내" className="work-detail-modal home-guide-modal">
          <article className="first-visitor-panel">
            <header className="first-visitor-modal-head">
              <div>
                <span className="mono">FIRST CONTACT ROUTE</span>
                <h2>처음 온 탐사자라면</h2>
              </div>
              <button onClick={() => setIsGuideOpen(false)} type="button" aria-label="처음 온 탐사자 안내 닫기">
                <X aria-hidden="true" />
              </button>
            </header>
            <p>
              SF 탐사단은 작품을 저장하는 사이트이면서, 취향을 찾고 기록을 쌓는 탐사 장비입니다.
              아래 순서대로 누르면 가장 빠르게 핵심 기능을 경험할 수 있습니다.
            </p>
            <div className="first-route-grid">
              {routeSteps.map(step => {
                const Icon = step.icon;
                return (
                  <SignalLink className="first-route-card" href={step.href} key={step.label} onClick={() => setIsGuideOpen(false)}>
                    <Icon aria-hidden="true" />
                    <span>{step.label}</span>
                    <strong>{step.title}</strong>
                    <em>{step.text}</em>
                  </SignalLink>
                );
              })}
            </div>
          </article>
        </ModalShell>
      )}
    </section>
  );
}
