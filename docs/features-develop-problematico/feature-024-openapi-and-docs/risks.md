# risks.md — feature-024 · openapi-and-docs (FE)

Paquete de documentación. El riesgo runtime es nulo. Los riesgos reales son de ownership (READMEs), peso binario y doc engañosa.

## Riesgos funcionales

| riesgo | severidad | detalle | mitigación |
|---|---|---|---|
| Ninguno en runtime | — | No hay código ni config; los `.md`/`.png` no se importan ni ejecutan | — |

## Riesgos técnicos

| riesgo | severidad | detalle | mitigación |
|---|---|---|---|
| Regresión por traer READMEs | media | `README.md`/`ui/README.md` traen el rename `@devpablocristo/core-*`→`platform-*`, `ponti-frontend`→`web`, retiro `xlsx`. develop tip (8c25e88) AÚN tiene los nombres viejos. Traerlo con 024 adelanta un rename que es de 001/021 | OMITIR los 2 READMEs de 024. Si se traen, hacerlo con `git restore -p` y aceptar SOLO el hunk de copy OpenAPI/Axis-Companion, dejando ownership del rename a 001/021 |
| Conflicto de merge futuro | media | Si 024 trae los READMEs y luego mergea 001/021, ambos tocan las mismas líneas → conflicto | Omitir READMEs en 024 elimina el conflicto |
| PNG corrupto por copia manual | media | Copiar binarios a mano (cat/echo/copy-paste) los rompe | SIEMPRE `git checkout 3ffcf60 -- docs/audit/drawers/{before,after}/` |
| `git diff --check` whitespace | baja | Markdown puede tener trailing whitespace | `git diff --check` antes del PR; es md, riesgo bajo |

## Riesgos de integración

| riesgo | severidad | detalle | mitigación |
|---|---|---|---|
| Links rotos en docs | baja | `report.md` linkea `inventory.md`, `drawer-standard.md`, `before/`, `after/`. `RESPONSIVE_GUIDELINES`/`ui/CLAUDE.md` linkean a código de 006/020/etc. que puede no estar en develop | Traer las carpetas `before/`+`after/` completas. Los links a código son referencias informativas; aceptar links "adelantados" |

## Riesgos cross-repo

| riesgo | severidad | detalle | mitigación |
|---|---|---|---|
| Doble ownership del rename README | media | El hunk de README aparece en 024-FE y 024-BE Y pertenece conceptualmente a 001/021 en cada repo | Decidir UNA vez: 001/021 dueños; ambos paquetes 024 omiten el README |
| OpenAPI piloto incompleto | baja (no afecta este flist) | El swagger BE cubre solo 2 endpoints. Si alguien corre `yarn codegen:openapi` esperando cobertura total, genera tipos parciales. Pero ese codegen NO está en este flist FE | El BE-024 ya etiqueta el spec como piloto; el FE-024 no incluye codegen → sin impacto aquí |

## Riesgos de datos / migración

- Ninguno. No hay migraciones ni cambios de datos.

## Riesgos de archivos compartidos

| archivo | riesgo | mitigación |
|---|---|---|
| `README.md`, `ui/README.md` | overlap con 001/021 (rename + deps) | omitir de 024 |
| router.tsx / main.tsx / routes/index.ts / package.json / lockfiles | NO aparecen en el flist 024-FE → cero riesgo | — |

## Riesgos de extracción parcial

| riesgo | señal | mitigación |
|---|---|---|
| Faltan PNG/txt | `git diff 3ffcf60 -- docs/audit/` no vacío; conteo `git ls-tree -r 3ffcf60 docs/audit/ \| wc -l` ≠ archivos traídos (55) | traer `before/` y `after/` enteras con `git checkout` |
| Falta un `.md` de contenido | `ui/CLAUDE.md`/`RESPONSIVE_GUIDELINES`/`PR-92.md` ausente tras checkout | verificar `git status` lista los 3 |
| Se coló código | `git status` muestra `ui/src`/`api/src`/`*.json`/lockfile | revertir esos paths; 024 es solo docs |

## Riesgo de mergear solo este repo / solo el otro

- **Solo FE-024 (sin BE-024)**: SEGURO. La doc FE es autónoma; sus referencias a BE (entry_type.go, endpoints) son informativas. No rompe nada.
- **Solo BE-024 (sin FE-024)**: SEGURO también. El BE publica swagger; el FE no lo consume en este flist. Sin acoplamiento duro.
- **Conclusión**: ambos lados pueden mergear independientes. La única coordinación deseable es el ownership del rename de READMEs (delegarlo a 001/021).
