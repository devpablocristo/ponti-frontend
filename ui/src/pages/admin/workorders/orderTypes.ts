/**
 * Tipos compartidos entre CreateOrder y UpdateOrder.
 * El shape de `emptyItems` es ligeramente distinto entre los dos drawers
 * (CreateOrder usa `itemId: number | null`, UpdateOrder usa `item: string`),
 * por eso no se extrae al archivo compartido — solo los types que SÍ son
 * idénticos.
 */

export type WorkOrderItem = {
  itemId: number | null;
  totalUsed: string;
  dose: string;
};

export type InvestorSplit = {
  investorId: number | null;
  percentage: string;
};
