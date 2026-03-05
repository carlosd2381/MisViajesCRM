export function applyTimestampRangeFilters(options: {
  filters: string[];
  params: unknown[];
  column: string;
  from?: string;
  to?: string;
}): void {
  const { filters, params, column, from, to } = options;

  if (from) {
    params.push(from);
    filters.push(`${column} >= $${params.length}::timestamptz`);
  }

  if (to) {
    params.push(to);
    filters.push(`${column} <= $${params.length}::timestamptz`);
  }
}
