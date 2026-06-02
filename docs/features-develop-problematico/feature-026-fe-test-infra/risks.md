# risks.md — feature-026 · fe-test-infra

## Funcionales

| riesgo | prob | impacto | mitigación |
|---|---|---|---|
| e2e flaky / falso-rojo por dataset distinto al workspace 29 (CAMPO COTY) | media | medio | verificar seed E2E; los specs ya son data-driven (leen `payload.data.data[0]`), pero asumen dataset no vacío. Definir `E2E_TENANT_ID` si el `/me/context` no resuelve tenant |
| specs e2e fallan porque la UI de producción (CustomerEditor/drawers/actores) no está en develop | **alta** si se mergea antes de 007/010 | alto | NO mergear 026c hasta que 007/008/010/014/018 estén en develop; correr `playwright test --list` y un dry-run |
| `drawer-audit.spec.ts` escribe a `docs/audit/drawers/$phase` y puede fallar por FS/permisos en CI | media | bajo | no usarlo como gate de CI; o asegurar `mkdir -p` del outDir |

## Técnicos

| riesgo | prob | impacto | mitigación |
|---|---|---|---|
| `api/test` no compila: `Cannot find module '../dist/configService'` / `authMiddleware` / `forwardQuery` | **alta** si falta 008/011 | alto | `npm --prefix api run build` antes de correr; gate 026b a 008+011 |
| Whitespace dañado (tabs/espacios) en `auth.ts`, `lots.spec.ts`, `workorders-stock.spec.ts` | **alta** (visible en el diff) | medio | corregir indentación; `git diff --check`; pasar prettier/eslint del repo |
| `handlers.ts` reindent masivo tapa cambios reales (quita login/JWT) | media | medio | aplicar por hunks (`git restore -p`), revisar que el bloque eliminado (jsonwebtoken/MOCK_USER) corresponde a auth movido a middleware (008) |

## Integración

| riesgo | prob | impacto | mitigación |
|---|---|---|---|
| Cambio de export en `auth.ts` (`workspace`→`e2eWorkspace`) rompe specs preexistentes que importaban el nombre viejo | baja | medio | `git grep -n "from \"./helpers/auth\"\|installAuthenticatedSession\|e2eWorkspace" ui/e2e` tras portar |
| Contrato lots/work-orders en develop difiere del mock (handlers.ts) | media | medio | alinear `handlers.ts` con el contrato real de 011; correr unit BFF |

## Cross-repo (BE)

| riesgo | prob | impacto | mitigación |
|---|---|---|---|
| Mockean `/me/context` y queries con customer/campaign; si el BE real difiere, los tests validan un contrato falso | baja | medio | confirmar contratos con features BE 008/010/011 (no se mergea BE acá) |

**Riesgo de mergear solo este repo (FE):** bajo en lo funcional de producción (son tests), pero **alto en CI** si se mergea antes de las dependencias → pipeline rojo. **Riesgo de mergear solo el otro repo (BE):** N/A — sin cambios BE.

## Datos / migración

Ninguno. Sin migraciones, sin cambios de datos persistidos. El único dato sensible es el workspace E2E hardcodeado (14/29) en `auth.ts`.

## Archivos compartidos (partial-hunks)

| archivo | riesgo | mitigación |
|---|---|---|
| `ui/e2e/helpers/auth.ts` | mezcla hunk multitenant (008) + cambio de workspace (propio) + whitespace | portar por hunks; separar lógica tenant de la elección de workspace si se quiere atribución limpia |
| `api/src/mocks/handlers.ts` | reindent tapa el cambio real | revisar hunk a hunk |
| `lotsRoute.test.js` / `workOrdersRoute.test.js` | asserts cubren contrato de 011 + lot-metrics (DONE) | aplicar entero (son tests, no producción) tras confirmar helpers `dist/` |

## Extracción parcial

| riesgo | mitigación |
|---|---|
| Traer specs sin su código de producción → suite roja permanente que se "silencia" con `.skip` | gatear 026c a las features de UI; nunca commitear specs skippeados como solución |
| Quedarse a medias con `.vite-smoke` (borrar unos sí y otros no) | borrar el directorio completo: `git rm -r ui/.vite-smoke/deps`; verificar `git ls-files ui/.vite-smoke` vacío |
| Olvidar el whitespace → lint/CI roja | `git diff --check` como paso obligatorio del checklist |
