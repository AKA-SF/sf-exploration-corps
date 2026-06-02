import { Link } from 'react-router-dom';
import { CheckCircle2, Circle, Compass, MessageSquareText, Sparkles } from 'lucide-react';

const onboardingItems = [
  {
    description: '취향에 맞는 탐사 대원 유형과 추천 작품을 확인합니다.',
    getComplete: ({ latestTasteProfile }) => Boolean(latestTasteProfile),
    href: '/#taste-test',
    icon: Sparkles,
    label: 'SF 성향 테스트 완료',
  },
  {
    description: '작품 카드에서 읽고 싶어요, 읽는 중, 읽었어요 중 하나를 저장합니다.',
    getComplete: ({ workStatuses }) => workStatuses.length > 0,
    href: '/#works-archive',
    icon: Compass,
    label: '첫 작품 좌표 저장',
  },
  {
    description: '커뮤니티에 글이나 댓글을 남겨 탐사단 네트워크에 접속합니다.',
    getComplete: ({ stats }) => (stats.posts ?? 0) + (stats.comments ?? 0) > 0,
    href: '/questions',
    icon: MessageSquareText,
    label: '첫 커뮤니티 교신',
  },
];

export default function ProfileOnboardingPanel({
  latestTasteProfile,
  stats,
  workStatuses,
}) {
  const context = { latestTasteProfile, stats, workStatuses };
  const completedCount = onboardingItems.filter(item => item.getComplete(context)).length;

  return (
    <section className="profile-onboarding-panel panel">
      <div className="profile-onboarding-head">
        <span className="mono">FIRST MISSION GUIDE</span>
        <strong>처음 할 일</strong>
        <em>{completedCount} / {onboardingItems.length} 완료</em>
      </div>
      <div className="profile-onboarding-steps">
        {onboardingItems.map(item => {
          const Icon = item.icon;
          const isComplete = item.getComplete(context);
          return (
            <Link
              className={`profile-onboarding-step ${isComplete ? 'is-complete' : ''}`}
              key={item.label}
              to={item.href}
            >
              <Icon aria-hidden="true" />
              <div>
                <strong>{item.label}</strong>
                <p>{item.description}</p>
              </div>
              {isComplete ? <CheckCircle2 aria-hidden="true" /> : <Circle aria-hidden="true" />}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
