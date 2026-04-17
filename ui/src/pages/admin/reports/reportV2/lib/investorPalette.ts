const PALETTE = [
  "#3B82F6",
  "#10B981",
  "#8B5CF6",
  "#F59E0B",
  "#EC4899",
  "#06B6D4",
];

export function investorColor(index: number): string {
  return PALETTE[index % PALETTE.length];
}

export function investorColorMap<T extends { investor_id: number }>(
  list: T[],
): Record<number, string> {
  const map: Record<number, string> = {};
  list.forEach((item, i) => {
    map[item.investor_id] = investorColor(i);
  });
  return map;
}
