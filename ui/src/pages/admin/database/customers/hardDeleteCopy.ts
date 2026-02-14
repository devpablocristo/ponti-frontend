export const getHardDeleteCustomerMessage = (customerName: string): string => {
  return `¿Eliminar definitivamente el cliente "${customerName}"? Esta acción elimina en cascada el cliente, sus proyectos y los datos relacionados. No se puede deshacer.`;
};
