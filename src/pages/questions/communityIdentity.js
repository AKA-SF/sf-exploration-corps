import { getUserNickname } from '../../lib/userIdentity';

export const getCommunityAuthorName = user => getUserNickname(user, '탐사자');

export const getCommunityOwnerToken = user => (user?.id ? `user:${user.id}` : '');
