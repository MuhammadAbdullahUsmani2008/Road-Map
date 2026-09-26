export function shiftDate(date: string, amount: number) {
  const shifted = new Date(`${date}T12:00:00Z`);
  shifted.setUTCDate(shifted.getUTCDate() + amount);
  return shifted.toISOString().slice(0, 10);
}

export function calculateStreaks(dates: string[], today: string) {
  const uniqueDates = [...new Set(dates)].sort();
  const dateSet = new Set(uniqueDates);
  let currentStreak = 0;
  let cursor = dateSet.has(today) ? today : shiftDate(today, -1);

  while (dateSet.has(cursor)) {
    currentStreak += 1;
    cursor = shiftDate(cursor, -1);
  }

  let longestStreak = 0;
  let runningStreak = 0;
  let previousDate: string | null = null;
  for (const date of uniqueDates) {
    runningStreak = previousDate && date === shiftDate(previousDate, 1) ? runningStreak + 1 : 1;
    longestStreak = Math.max(longestStreak, runningStreak);
    previousDate = date;
  }

  return { currentStreak, longestStreak, productiveDays: uniqueDates.length };
}
