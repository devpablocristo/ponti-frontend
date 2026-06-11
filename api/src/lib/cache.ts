import NodeCache from "node-cache";
import { CACHE_TTL_DEFAULT } from "../configService";

// Instancia compartida del cache del BFF. Exportada aquí para que tanto
// index.ts como los routers de catálogo puedan importarla sin dependencias
// circulares.
export const cache = new NodeCache({
  stdTTL: CACHE_TTL_DEFAULT,
  checkperiod: CACHE_TTL_DEFAULT,
});

/**
 * Invalida todas las entradas del cache cuya clave empiece con alguno de los
 * prefijos dados, más la clave "options" (que agrega campañas/cultivos/tipos
 * en el objeto de form-options).
 */
export function invalidateCatalogCache(...prefixes: string[]): void {
  const keysToDelete = cache
    .keys()
    .filter((k) => k === "options" || prefixes.some((p) => k.startsWith(p)));
  if (keysToDelete.length > 0) {
    cache.del(keysToDelete);
  }
}
