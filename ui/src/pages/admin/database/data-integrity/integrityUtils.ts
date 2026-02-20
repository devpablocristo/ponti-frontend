export type IntegrityCheck = {
  control_number: number;
  data_to_verify: string;
  description: string;
  control_rule: string;

  // SYSTEM VALUE (lo que el usuario ve en pantalla)
  system_calculation: string;
  system_value: string;
  system_source?: string;
  system_meaning?: string;

  // RECALC A (primer recálculo independiente)
  recalc_a_calculation: string;
  recalc_a_value: string;
  recalc_a_source?: string;
  recalc_a_meaning?: string;

  // RECALC B (segundo recálculo independiente, opcional)
  recalc_b_calculation?: string;
  recalc_b_value?: string;
  recalc_b_source?: string;
  recalc_b_meaning?: string;

  // RESULTADO
  difference_a: string;
  difference_b?: string;
  status: string;
  tolerance: string;
};

export const sortIntegrityChecks = (
  checks: IntegrityCheck[]
): IntegrityCheck[] => {
  return [...checks].sort((a, b) => a.control_number - b.control_number);
};

export const hasRecalcBData = (check: IntegrityCheck): boolean => {
  return Boolean(
    check.recalc_b_calculation ||
      check.recalc_b_value ||
      check.recalc_b_source ||
      check.recalc_b_meaning
  );
};
