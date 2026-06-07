import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();

const checks = [
  {
    file: 'src/App.jsx',
    label: 'Core routes',
    patterns: [
      /path="\/login"/,
      /path="\/profile"/,
      /path="\/admin"/,
      /path="\/questions"/,
      /path="\/questions\/:questionId"/,
    ],
  },
  {
    file: 'api/questions.js',
    label: 'Community API mutations',
    patterns: [
      /request\.method === 'POST'/,
      /request\.method === 'PATCH'/,
      /request\.method === 'DELETE'/,
      /normalizeCommunityCategory/,
      /commentCount/,
    ],
  },
  {
    file: 'src/pages/questions/useQuestionsBoard.js',
    label: 'Community client flow',
    patterns: [
      /submitQuestion/,
      /submitComment/,
      /updateQuestion/,
      /deleteQuestion/,
      /deleteComment/,
    ],
  },
  {
    file: 'src/pages/profile/hooks/useProfileData.js',
    label: 'Profile sync flow',
    patterns: [
      /title_override/,
      /fetchCommunityQuestions/,
      /PROFILE_SYNC_INTERVAL_MS/,
      /work_comments/,
      /work_statuses/,
    ],
  },
  {
    file: 'src/pages/Admin.jsx',
    label: 'Admin diagnostic and controls',
    patterns: [
      /admin_set_member_title/,
      /admin_grant_mileage/,
      /admin_award_badge/,
      /admin-profile-diagnostics/,
      /deleteCommunityPayload/,
    ],
  },
  {
    file: 'api/_persistentCache.js',
    label: 'Durable public API cache',
    patterns: [
      /getDurableCachedJson/,
      /public_archive_cache/,
      /SUPABASE_SERVICE_ROLE_KEY/,
      /clearDurableCachePrefix/,
    ],
  },
];

const failures = [];

for (const check of checks) {
  const source = readFileSync(resolve(root, check.file), 'utf8');
  const missing = check.patterns.filter(pattern => !pattern.test(source));
  if (missing.length > 0) {
    failures.push(`${check.label} (${check.file}) missing ${missing.length} expected pattern(s).`);
  }
}

if (failures.length > 0) {
  console.error('Core flow check failed:');
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Core flow check passed (${checks.length} groups).`);
