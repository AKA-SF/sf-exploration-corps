const DAY_MS = 24 * 60 * 60 * 1000;
const KOREA_OFFSET_MS = 9 * 60 * 60 * 1000;

export function millisecondsUntilNextKoreanDay(date = new Date()) {
  const timestamp = date.getTime();
  if (!Number.isFinite(timestamp)) return DAY_MS;
  const koreanDayOffset = ((timestamp + KOREA_OFFSET_MS) % DAY_MS + DAY_MS) % DAY_MS;
  return koreanDayOffset === 0 ? DAY_MS : DAY_MS - koreanDayOffset;
}
