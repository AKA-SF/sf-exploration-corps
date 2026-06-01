export const getCommunityAuthorName = user => (
  user?.user_metadata?.nickname
  || user?.user_metadata?.display_name
  || user?.user_metadata?.name
  || user?.email?.split('@')[0]
  || '탐사자'
);

export const getCommunityOwnerToken = user => (user?.id ? `user:${user.id}` : '');
