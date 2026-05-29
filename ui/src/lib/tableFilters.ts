export const normalizeFilterText = (value: unknown) =>
  String(value ?? "").trim().toLowerCase();

export const matchesSelectFilter = (
  rowValue: unknown,
  selectedValues: unknown[]
) => {
  const normalizedRowValue = normalizeFilterText(rowValue);

  return selectedValues.some(
    (selectedValue) => normalizedRowValue === normalizeFilterText(selectedValue)
  );
};

export const matchesTextFilter = (rowValue: unknown, filterValue: unknown) => {
  return normalizeFilterText(rowValue).includes(
    normalizeFilterText(filterValue)
  );
};
