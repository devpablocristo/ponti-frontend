const PALETTE = [
  "#60A5FA",
  "#31C48D",
  "#8B5CF6",
  "#9CA3AF",
  "#F98080",
  "#7DD3C0",
];

function investorColor(index: number): string {
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
