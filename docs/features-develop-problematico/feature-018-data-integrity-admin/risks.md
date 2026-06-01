# risks.md — feature-018 (FE)

## Riesgo de orquestación / alcance (el más importante)

- **Desajuste flist ↔ nombre de feature.** `fe-018.txt` contiene el refactor de
  `useDatabase/projects`, no la data-integrity admin. Riesgo: portear lo equivocado,
  duplicar trabajo con fe-010 (projects) o fe-014 (UI data-integrity), o creer que la
  feature data-integrity FE queda cubierta cuando NO lo está.
  - **Mitigación:** confirmar con el orquestador antes de abrir PR. Documentado en
    spec.md/file-list.md. La UI real de data-integrity está en fe-014; el BE en be-018.

## Riesgos funcionales

- **Traducciones de error dependientes de strings del BE.** `formatError` mapea
  `"project already exists"` y `"project not found or outdated"`. Si el BE de projects
  cambia esos mensajes, el usuario verá el fallback y los tests podrían pasar/fallar
  sin reflejar la realidad.
  - **Mitigación:** verificar contra el BE actual (feature-010) que esos strings
    siguen vigentes; si no, ajustar el mapeo en `@/lib/format` (fe-006).
- **API público de `useProjects`.** Debe quedar idéntico para no romper consumidores.
  - **Mitigación:** comparar las claves devueltas por el `index.ts` nuevo vs viejo
    (ambas listadas en spec.md). Correr build + smoke de pantallas de proyectos.

## Riesgos técnicos

- **Dependencia dura de `@/lib/format` (fe-006).** Portear sin fe-006 → build roto.
  - **Mitigación:** gate en extraction-plan (paso 0). No mergear hasta que fe-006 esté.
- **Trailing whitespace** marcado por `git diff --check` en `projectReducer.ts`/`types.ts`.
  - **Mitigación:** dejar que prettier/lefthook normalice; revisar el diff final.

## Riesgos de integración

- **Consumidores de `useProjects`** (lista en dependencies.md): cualquier suposición
  sobre el shape interno (no documentado como público) podría romperse.
  - **Mitigación:** `yarn build` + `yarn test` completo, no solo el test del hook.

## Riesgos cross-repo

- Esta flist FE no tiene acople de compilación con be-018; el riesgo cross-repo real
  aplica a fe-014 (UI) + be-018 (BE) + BFF ya en develop. Si alguien asume que mergear
  este paquete habilita la pantalla de data-integrity, se equivoca.
  - **Mitigación:** dejar claro que data-integrity FE = fe-014.

## Riesgos de datos / migración

- Ninguno: FE puro, sin migraciones ni cambios de persistencia.

## Riesgos de archivos compartidos / extracción parcial

- `types.ts` y `projectReducer.ts` evolucionan también en fe-010 y features de
  actores/tenancy (`actor_id`, `archived_at`). Traerlos enteros sobre un develop ya
  divergido puede pisar cambios ajenos.
  - **Mitigación:** usar `git restore -p --source=develop-problematico~1` y tomar solo
    los hunks de esta feature si develop ya los modificó.

## Riesgo de mergear solo un repo

- **Solo este repo (FE refactor):** bajo. Es independiente; no rompe el BE.
- **Solo el otro repo (be-018, data-integrity BE):** seguro funcionalmente, pero la
  pantalla que lo consume vive en fe-014, no acá. Mergear be-018 sin fe-014 deja el
  endpoint sin UI (no rompe nada existente).
