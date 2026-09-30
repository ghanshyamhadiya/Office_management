export function canContributeForYear(existingYears: number[], year: number) {
  return !existingYears.includes(year);
}
