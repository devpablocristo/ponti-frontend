# risks.md — feature-008 · Identity & tenant context

## Funcionales

- **Sin `/me/context` en el BE** → `TenantProvider` cae al catch, `tenants=[]`, `TenantSwitcher` oculto, requests sin `X-Tenant-Id`.
  - *Mitigación*: BE-first; smoke test de `GET /me/context` en staging antes del FE.
- **`BFF_REQUIRE_TENANT=1` sin tenant resuelto** → 400 "Tenant obligatorio" en TODAS las rutas salvo `/me`,`/admin/tenants`,`/admin/invites`.
  - *Mitigación*: dejar `BFF_REQUIRE_TENANT=0` hasta validar el flujo completo; confirmar que el FE persiste `ponti:tenant_id` antes de la primera request de datos.
- **Reset de workspace inesperado**: cualquier `dispatchEvent("ponti:tenant-changed")` limpia customer/project/campaign/field.
  - *Mitigación*: confirmar que sólo `applyTenant(_, clearWorkspace=true)` lo dispara.

## Técnicos

- **No compila**: import de `@/lib/authStorage` (ausente en develop) y de `MeTenant` (`ui/src/api/generated` sin schemas en develop).
  - *Mitigación*: traer authStorage entero y regenerar tipos con `yarn codegen` (paso 2 del plan).
- **`useTenant` fuera de provider** lanza error si `ProtectedLayout` no monta `<TenantProvider>`.
  - *Mitigación*: portar el hunk del provider tree.
- **Identity Platform mal configurado** en no-local: `verifyWithIdentityPlatform` lanza `Identity Platform no configurado` → 500 en login.
  - *Mitigación*: setear `IDENTITY_PLATFORM_API_KEY`/`IDENTITY_PLATFORM_PROJECT_ID`; o `LOCAL_DEV_AUTH=1` + `APP_ENV` local-like en dev.
- **`verifiedTokenCache` crece sin límite** (Map en memoria, sin eviction). Deuda; bajo riesgo en BFF de corta vida.

## Integración / cross-repo

- **Contrato `MeTenant` opcional**: el BE marca todos los campos opcionales; el FE asume `id`/`name` presentes (`Required<Pick<...>>`). Si el BE manda tenants sin `id`/`name`, el `<option>` rompe el `key`/`value`.
  - *Mitigación*: confirmar con el BE que `id`/`name` siempre vienen en 200; o agregar guarda en `TenantSwitcher`.
- **Doble interceptor de response** en `ui/src/api/client.ts` envuelve 2xx en `{success,data}`; `meContextPayload` ya tolera ambas formas, pero otros consumidores de `/me/context` deben usar el parser.

## Datos / migración

- Sin migraciones en este repo.
- **localStorage legacy**: se leen/escriben `tenant_id` y `ponti:tenant_id`; al cambiar de tenant se limpian claves de workspace con y sin prefijo `ponti:`. Riesgo bajo de claves huérfanas.

## Archivos compartidos

- **`api/src/routes/index.ts`**: la cache scopeada por `tenant:user` reemplaza el `NodeCache` global. Si se trae a medias (sólo `router.use("/me")` sin la cache scopeada), hay **fuga de cache entre tenants** (riesgo de seguridad). Traer el bloque de cache COMPLETO junto con el guard, y verificar que `types.ts`/otros routers que importan `cache` sigan funcionando con la nueva API (`get/set/del/keys/flushAll`).
- **`Navbar.tsx`/`Menu.tsx`/`Login.tsx`**: arrastrar dark-mode (006) o `/admin/access`/`Notification` (016) por error contamina el PR y puede romper si esas features no están en develop (`Notification` ausente en develop).

## Extracción parcial

- Señal de incompletitud: `grep` de `@/lib/authStorage`, `MeTenant`, `TenantProvider`, `X-Tenant-Id` (ver extraction-plan "Cómo detectar extracción incompleta").
- Riesgo de traer `Notification`/`/admin/access` y romper build (esos no están en develop).

## Riesgo de mergear SOLO un repo

- **Solo FE/BFF (sin BE)**: TenantSwitcher vacío, requests sin tenant; con `BFF_REQUIRE_TENANT=1` el sistema queda inusable (400 everywhere). **No mergear FE antes que BE.**
- **Solo BE (sin FE)**: el BE expone `/me/context` y exige tenant pero el FE viejo no manda `X-Tenant-Id`; si el BE hace obligatorio el tenant, el FE actual rompe. Coordinar el flag de obligatoriedad.
