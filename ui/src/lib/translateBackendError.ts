// translateBackendError mapea mensajes de error del BE (siempre en inglés, por
// convención del proyecto) a copy en español. Es la última capa de defensa: si
// un pattern no matchea, el mensaje crudo llega al usuario.
//
// Los patterns están ordenados de MÁS específico a MÁS genérico — un pattern
// general como "X already exists" no debe ganarle a "work order already exists
// for number Y and project Z", que tiene una copy más útil.
//
// Convenciones:
//   - Cada pattern usa `lookupBackendEntity` para resolver el nombre EN → léxico ES.
//   - Concordancia de género respetada vía helpers del catálogo (`genderSuffix`,
//     `objectPronoun`, etc.).
//   - Si un pattern hace falta cubrir, se agrega ACÁ y no en cada hook.

import {
  type Entity,
  ENTITIES_BY_KEY,
  genderSuffix,
  indefiniteArticle,
  lookupBackendEntity,
  objectPronoun,
  withArticle,
  withArticleCap,
} from "@/copy";

/** "el lote está archivado. Restauralo o elegí uno activo." (concordado por género) */
function archivedRefMessage(e: Entity): string {
  const adj = genderSuffix(e);
  const pron = objectPronoun(e);
  const indef = indefiniteArticle(e);
  return `${withArticleCap(e)} está archivad${adj}. Restaurá${pron} o elegí ${indef} activ${adj}.`;
}

function indefiniteNounArticle(e: Entity): string {
  return e.article === "la" || e.article === "las" ? "una" : "un";
}

function dependencyLabel(raw: string, count: string): string {
  const plural = count !== "1";
  const active = /^active\s+/i.test(raw);
  const normalized = raw.replace(/^active\s+/i, "").trim().toLowerCase();
  const labels: Record<string, { one: string; many: string; activeOne: string; activeMany: string }> = {
    "field(s)": { one: "campo", many: "campos", activeOne: "campo activo", activeMany: "campos activos" },
    "lot(s)": { one: "lote", many: "lotes", activeOne: "lote activo", activeMany: "lotes activos" },
    "work order(s)": { one: "orden de trabajo", many: "órdenes de trabajo", activeOne: "orden de trabajo activa", activeMany: "órdenes de trabajo activas" },
    "work order draft(s)": { one: "borrador de orden", many: "borradores de orden", activeOne: "borrador de orden activo", activeMany: "borradores de orden activos" },
    "labor record(s)": { one: "labor", many: "labores", activeOne: "labor activa", activeMany: "labores activas" },
    "supply record(s)": { one: "insumo", many: "insumos", activeOne: "insumo activo", activeMany: "insumos activos" },
    "supply movement(s)": { one: "movimiento de insumo", many: "movimientos de insumo", activeOne: "movimiento de insumo activo", activeMany: "movimientos de insumo activos" },
    "stock record(s)": { one: "registro de stock", many: "registros de stock", activeOne: "registro de stock activo", activeMany: "registros de stock activos" },
    "commercialization record(s)": { one: "comercialización", many: "comercializaciones", activeOne: "comercialización activa", activeMany: "comercializaciones activas" },
    "dollar value record(s)": { one: "valor dólar", many: "valores dólar", activeOne: "valor dólar activo", activeMany: "valores dólar activos" },
    "manager assignment(s)": { one: "responsable asignado", many: "responsables asignados", activeOne: "responsable asignado activo", activeMany: "responsables asignados activos" },
    "investor assignment(s)": { one: "inversor asignado", many: "inversores asignados", activeOne: "inversor asignado activo", activeMany: "inversores asignados activos" },
    "admin cost investor record(s)": { one: "inversor de costo administrativo", many: "inversores de costo administrativo", activeOne: "inversor de costo administrativo activo", activeMany: "inversores de costo administrativo activos" },
    "invoice(s)": { one: "factura", many: "facturas", activeOne: "factura activa", activeMany: "facturas activas" },
  };
  const label = labels[normalized];
  if (!label) return raw;
  if (active) return plural ? label.activeMany : label.activeOne;
  return plural ? label.many : label.one;
}

export function translateBackendError(raw: string): string {
  if (!raw) return raw;
  const msg = raw.trim();

  // ─── Patterns ESPECÍFICOS (van primero) ─────────────────────────────────────

  if (
    /customer already exists/i.test(msg) ||
    /duplicate key value violates unique constraint .*customers/i.test(msg) ||
    /unique constraint.*customers/i.test(msg) ||
    /uq_customers/i.test(msg)
  ) {
    return "Ya existe un cliente con ese nombre.";
  }

  if (/failed to rename customer/i.test(msg)) {
    return "No se pudo cambiar el nombre del cliente porque ya existe otro cliente con ese nombre.";
  }

  if (/customer actor link already exists/i.test(msg) || /failed to link customer to actor/i.test(msg)) {
    return "No se pudo guardar porque el cliente está vinculado a otro actor. Seleccioná el cliente correcto desde la lista.";
  }

  // "cannot restore X while Y is archived[; restore the Y first]"
  // Cubre: project, field, lot como parent del child a restaurar. Mensaje
  // accionable que le dice al usuario exactamente qué entidad restaurar primero.
  const cannotRestoreWhileParent = msg.match(
    /cannot restore (\w+(?: \w+)?) while (\w+(?: \w+)?) is archived(?:;.*)?$/i,
  );
  if (cannotRestoreWhileParent) {
    const child = lookupBackendEntity(cannotRestoreWhileParent[1]);
    const parent = lookupBackendEntity(cannotRestoreWhileParent[2]);
    if (child && parent) {
      return `No se puede restaurar ${withArticle(child)} hasta que se restaure ${withArticle(parent)} al que pertenece.`;
    }
  }

  // "actor has N active references; archive or reassign them first"
  // G6: archive de actor bloqueado por referencias activas (customers,
  // managers, investors, etc. apuntan al actor).
  const actorHasRefs = msg.match(
    /^actor has (\d+) active references?; archive or reassign them first$/i,
  );
  if (actorHasRefs) {
    const n = actorHasRefs[1];
    return `El actor tiene ${n} referencia${n === "1" ? "" : "s"} activa${n === "1" ? "" : "s"} (clientes, responsables, inversores). Archivá o reasigná esas referencias antes de archivar el actor.`;
  }

  const investorHasActiveAssignments = msg.match(
    /^investor has (\d+) active assignment(?:\(s\)|s)?; remove them first$/i,
  );
  if (investorHasActiveAssignments) {
    const n = investorHasActiveAssignments[1];
    return `El inversor tiene ${n} asignación${n === "1" ? "" : "es"} activa${n === "1" ? "" : "s"} en proyectos, campos, órdenes o costo administrativo. Quitá esas asignaciones antes de archivarlo.`;
  }

  // "work order already exists for number X and project Y"
  if (/^work order already exists for number/i.test(msg)) {
    return "Ya existe una orden de trabajo con ese número en este proyecto.";
  }

  // BE: "BLOCKED_BY_WORKORDERS:N|lot has N work orders; archive or hard-delete them first".
  // El prefijo `BLOCKED_BY_WORKORDERS:<count>` es machine-readable y lo lee
  // directamente la pantalla de Lotes archivados ([ArchivedLots.tsx]) para
  // mostrar un drawer con las WO bloqueando. Acá generamos solo el fallback
  // textual por si algún caller no parsea el prefijo.
  const blockedByWorkOrders = msg.match(
    /^BLOCKED_BY_WORKORDERS:(\d+)\b/i,
  );
  if (blockedByWorkOrders) {
    const count = blockedByWorkOrders[1];
    return `El lote tiene ${count} orden${
      count === "1" ? "" : "es"
    } de trabajo asociada${count === "1" ? "" : "s"}. Eliminá o archivá primero esas órdenes.`;
  }

  // BE: "remito X already includes supply Y" (movimientos de stock)
  const remitoIncludesSupply = msg.match(
    /^remito (\S+) already includes supply (.+)$/i,
  );
  if (remitoIncludesSupply) {
    return `El remito ${remitoIncludesSupply[1]} ya tiene cargado el insumo ${remitoIncludesSupply[2]}.`;
  }

  // BE: "remito X already includes supply Y in the import request" (duplicado en el mismo CSV)
  const remitoDupInImport = msg.match(
    /^remito (\S+) already includes supply (.+) in the import request$/i,
  );
  if (remitoDupInImport) {
    return `El remito ${remitoDupInImport[1]} ya incluye el insumo ${remitoDupInImport[2]} en este archivo. Eliminá la fila duplicada antes de importar.`;
  }

  // BE: "return remito X already includes supply Y in the request"
  const returnRemitoDup = msg.match(
    /^return remito (\S+) already includes supply (\S+) in the request$/i,
  );
  if (returnRemitoDup) {
    return `El remito de devolución ${returnRemitoDup[1]} ya incluye el insumo ${returnRemitoDup[2]} en este archivo. Eliminá la fila duplicada.`;
  }

  // BE: "devolución X already includes supply Y"
  const devolucionIncludesSupply = msg.match(
    /^devolución (\S+) already includes supply (.+)$/i,
  );
  if (devolucionIncludesSupply) {
    return `La devolución ${devolucionIncludesSupply[1]} ya tiene cargado el insumo ${devolucionIncludesSupply[2]}.`;
  }

  // BE validations de movimientos de stock
  if (/^no stock for this supply in the project$/i.test(msg)) {
    return "No hay stock cargado para este insumo en el proyecto.";
  }
  if (/^not enough stock to return the requested quantity$/i.test(msg)) {
    return "No hay stock suficiente para devolver la cantidad solicitada.";
  }
  if (/^return exceeds available supply stock$/i.test(msg)) {
    return "La devolución supera el stock disponible del insumo.";
  }
  if (/^internal movements cannot be edited$/i.test(msg)) {
    return "Los movimientos internos no se pueden editar.";
  }
  if (/^stock movements cannot be edited$/i.test(msg)) {
    return "Los movimientos de stock no se pueden editar.";
  }
  const supplyNotInProject = msg.match(/^supply (\d+) does not belong to project (\d+)$/i);
  if (supplyNotInProject) {
    return `El insumo ${supplyNotInProject[1]} no pertenece al proyecto ${supplyNotInProject[2]}.`;
  }
  const investorNotFound = msg.match(/^investor (\d+) not found$/i);
  if (investorNotFound) {
    return `El inversor ${investorNotFound[1]} no existe.`;
  }
  const providerNotFound = msg.match(/^provider (\d+) not found$/i);
  if (providerNotFound) {
    return `El proveedor ${providerNotFound[1]} no existe.`;
  }

  // BE work-order validations:
  if (/^work order date cannot be in the future$/i.test(msg)) {
    return "La fecha de la orden de trabajo no puede ser futura.";
  }
  if (/^harvest area exceeds lot surface$/i.test(msg)) {
    return "La superficie de cosecha supera la superficie del lote.";
  }
  if (/^cannot publish work order draft with pending supplies/i.test(msg)) {
    const after = msg.replace(/^cannot publish work order draft with pending supplies:?\s*/i, "");
    return after
      ? `No se puede publicar la orden porque tiene insumos pendientes de completar: ${after}`
      : "No se puede publicar la orden porque tiene insumos pendientes de completar.";
  }

  // "X has historical references; archive it instead" — usado por actors al hard-delete.
  if (/has historical references/i.test(msg)) {
    return "No se puede eliminar definitivamente porque hay registros históricos asociados. Archivá en su lugar.";
  }

  // "project parent customer is archived" — bloqueo al crear/editar un proyecto
  // si el cliente padre está archivado.
  if (/^project parent customer is archived$/i.test(msg)) {
    return "El cliente del proyecto está archivado. Restaurálo primero o elegí otro cliente.";
  }

  // "X must be archived before hard delete"
  const mustBeArchived = msg.match(/^(\w+(?: \w+)?) must be archived before hard delete$/i);
  if (mustBeArchived) {
    const e = lookupBackendEntity(mustBeArchived[1]);
    if (e) {
      return `Primero archivá ${withArticle(e)}; recién después podés eliminar${genderSuffix(e) === "a" ? "la" : "lo"} definitivamente.`;
    }
  }

  // "X has N <dependency>; archive or hard-delete them first" — bloqueo de
  // hard-delete cuando hay dependencias.
  const hasDeps = msg.match(/^(\w+(?: \w+)?) has (\d+) (.+?); archive or hard-delete them first$/i);
  if (hasDeps) {
    const e = lookupBackendEntity(hasDeps[1]);
    if (e) {
      const count = hasDeps[2];
      const dep = dependencyLabel(hasDeps[3], count);
      return `${withArticleCap(e)} tiene ${count} ${dep} asociado${count === "1" ? "" : "s"}. Archivá o eliminá primero esos registros.`;
    }
  }

  // ─── Patterns POR ENTIDAD ───────────────────────────────────────────────────

  // "X already archived"
  const alreadyArchived = msg.match(/^(\w+(?: \w+)?) already archived$/i);
  if (alreadyArchived) {
    const e = lookupBackendEntity(alreadyArchived[1]);
    if (e) {
      return `${withArticleCap(e)} ya está archivad${genderSuffix(e)}.`;
    }
  }

  // "X is archived" — usado por la validación de referencias activas.
  const refIsArchived = msg.match(/^(\w+(?: \w+)?) is archived$/i);
  if (refIsArchived) {
    const e = lookupBackendEntity(refIsArchived[1]);
    if (e) return archivedRefMessage(e);
  }

  // "failed to restore X" / "failed to archive X" / "failed to (hard )?delete X"
  const failedRestore = msg.match(/^failed to restore (\w+(?: \w+)?)/i);
  if (failedRestore) {
    const e = lookupBackendEntity(failedRestore[1]);
    if (e) return `No se pudo restaurar ${withArticle(e)}.`;
  }
  const failedArchive = msg.match(/^failed to archive (\w+(?: \w+)?)/i);
  if (failedArchive) {
    const e = lookupBackendEntity(failedArchive[1]);
    if (e) return `No se pudo archivar ${withArticle(e)}.`;
  }
  const failedDelete = msg.match(/^failed to (?:hard )?delete (\w+(?: \w+)?)/i);
  if (failedDelete) {
    const e = lookupBackendEntity(failedDelete[1]);
    if (e) return `No se pudo eliminar ${withArticle(e)}.`;
  }

  // "X not found or outdated" (conflict on optimistic-locked update)
  const notFoundOrOutdated = msg.match(
    /^(\w+(?: \w+)?) (?:\d+ )?not found or outdated/i,
  );
  if (notFoundOrOutdated) {
    const e = lookupBackendEntity(notFoundOrOutdated[1]);
    if (e) {
      return `${withArticleCap(e)} fue modificad${genderSuffix(e)} por otra persona o ya no existe. Recargá la página y volvé a intentar.`;
    }
  }

  // "X not found" / "X 123 not found"
  const notFound = msg.match(/^(\w+(?: \w+)?) (?:\d+ )?not found$/i);
  if (notFound) {
    const e = lookupBackendEntity(notFound[1]);
    if (e) return `No se encontró ${withArticle(e)}.`;
  }

  // "X already exists"
  const alreadyExists = msg.match(/^(\w+(?: \w+)?) already exists/i);
  if (alreadyExists) {
    const e = lookupBackendEntity(alreadyExists[1]);
    if (e) return `Ya existe ${indefiniteNounArticle(e)} ${e.singular} con ese nombre.`;
  }

  // ─── Patterns GENÉRICOS (al final) ──────────────────────────────────────────

  // "invalid request payload" / "invalid id" / "invalid tenant_id"
  if (/^invalid request payload/i.test(msg)) {
    return "Los datos enviados no son válidos. Revisá el formulario.";
  }
  if (/^invalid (?:tenant_)?id\b/i.test(msg)) {
    return "El identificador enviado no es válido.";
  }

  // Conflict por dependencias (catch-all): "X has dependencies", "project has dependencies"
  if (/dependenc/i.test(msg)) {
    return "No se puede completar la acción porque hay registros asociados.";
  }

  // Network Error de axios sin status (por si pasó la red del interceptor)
  if (/^network error$/i.test(msg)) {
    return "No se pudo conectar con el servidor. Verificá tu conexión a internet.";
  }

  // Fallback: si nada matchea, devolvemos el mensaje crudo. En dev logueamos
  // para detectar patterns nuevos y agregarlos acá.
  if (import.meta.env.DEV && msg && /^[a-z]/i.test(msg)) {
    console.warn("[translateBackendError] pattern no cubierto:", msg);
  }
  return raw;
}

// Re-export para tests legacy que importaban ENTITIES desde acá.
// Nuevo código debe usar `ENTITIES_BY_KEY` desde `@/copy`.
export { ENTITIES_BY_KEY as ENTITIES };
