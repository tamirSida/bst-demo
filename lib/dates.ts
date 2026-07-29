/** Hebrew long date, e.g. "יום רביעי, 15 ביולי 2026". */
export function todayLabel(): string {
  return new Intl.DateTimeFormat("he-IL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
}
