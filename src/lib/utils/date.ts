import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);
dayjs.extend(timezone);

export const KST = "Asia/Seoul";

export function formatKst(value?: string | null) {
  if (!value) return "-";
  return dayjs(value).tz(KST).format("YYYY-MM-DD HH:mm");
}

export function todayKst() {
  return dayjs().tz(KST).format("YYYY-MM-DD");
}

export function countdownTo(value?: string | null) {
  if (!value) return "-";
  const seconds = Math.max(dayjs(value).diff(dayjs(), "second"), 0);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}시간 ${minutes}분`;
}
