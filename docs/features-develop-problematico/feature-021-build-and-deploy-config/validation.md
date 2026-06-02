# validation.md — feature-021 Build & deploy config (FE)

## Pre-PR checklist (Ola A — config aislada)
- [ ] No quedan locks de npm: `find . -name package-lock.json -not -path '*/node_modules/*'` → vacío.
- [ ] `.gitignore` contiene `**/package-lock.json`.
- [ ] `api/.eslintignore` borrado y `api/eslint.config.js` presente.
- [ ] `ui/knip.json`, `ui/scripts/lint-notify-leaks.sh`, `ui/scripts/lint-responsive-antipatterns.sh` presentes.
- [ ] `git diff --check` limpio (sin conflict markers ni whitespace masivo / EOL).
- [ ] El PR NO incluye `api/src/clients/ApiClient.ts`.
- [ ] El PR NO incluye hunks de deps `@devpablocristo/platform-*` ni `ui/yarn.lock` (si es PR de config pura).

## Comandos de validación (FE)
```bash
# ESLint api (flat-config)
cd /home/pablocristo/Proyectos/pablo/ponti/web/api && npx eslint . || echo "revisar violaciones"
npx eslint --print-config src/index.ts >/dev/null   # confirma que el config carga y los plugins existen

# ESLint ui (reglas ahora en error)
cd /home/pablocristo/Proyectos/pablo/ponti/web/ui && yarn lint        # corre eslint + notify-leaks + responsive
bash scripts/lint-notify-leaks.sh                                     # debe terminar en "✓ Sin leaks"
bash scripts/lint-responsive-antipatterns.sh                          # debe terminar en "✓ Sin antipatterns..."

# knip (dead-code) — informativo
cd /home/pablocristo/Proyectos/pablo/ponti/web/ui && npx knip || true

# docker-compose parsea
cd /home/pablocristo/Proyectos/pablo/ponti/web && docker compose config >/dev/null && echo "compose OK"
```

## Validación de build (Ola B — tras platform-migration)
```bash
cd /home/pablocristo/Proyectos/pablo/ponti/web/ui
yarn install --frozen-lockfile     # determinístico con yarn.lock regenerado
yarn build                         # tsc -b && vite build; verificar chunks
# confirmar que NO hay referencias a libs removidas:
grep -rn '@material-tailwind\|"xlsx"\|flowbite\|@heroicons' src/ ; echo "(0 hits esperados)"
```

## Validación de codegen (Ola B — tras 024 BE)
```bash
cd /home/pablocristo/Proyectos/pablo/ponti/web/ui
# requiere ../../core/docs/openapi/swagger.yaml (BE 024)
yarn codegen:openapi
git diff --stat src/api/generated/types.ts   # debe coincidir con el contrato BE actual
```

## Validación manual
- Levantar stack: `docker compose up ponti-ui ponti-bff` → UI en `:5173`, BFF en `:3001` (host) / `:3000` (interno). Verificar que NO aparece `ENOSPC` en logs de Vite (chokidar polling activo).
- Confirmar hot-reload editando un archivo en `ui/src/` (polling cada 1000ms).
- **Importante en este entorno:** usar `docker logs <container>` para ver stdout, NO `docker exec`/`run` (stdout swallowed — ver MEMORY).

## Casos borde
- `yarn lint` en un árbol donde 006 todavía NO migró los `z-[N]` → `lint:responsive` fallará. Si 006 no está, NO cablear el script en `lint`.
- `npm install` accidental → regenera un `package-lock.json` ignorado; confirmar que CI lo detecta (`git status --porcelain` debe seguir limpio porque está gitignored, pero advertir al dev).
- ESLint ui en `error`: un solo `any` rompe `yarn lint`. Correr antes y arreglar.

## Qué revisar en UI / API / DB / env
- **UI:** ningún cambio visual; solo build. Verificar bundle sin libs removidas.
- **API/BFF:** flat-config eslint carga; arranca en 3001.
- **DB:** nada.
- **env:** ningún `.env` versionado se toca; confirmar que docs internas mencionan el puerto correcto.

## Qué validar en el otro repo (BE)
- BE 021 no re-introduce bumps go-jose/x/net (#124).
- BE 024 publica `core/docs/openapi/swagger.yaml` con los handlers que el FE tipa (`/data-integrity/costs-check`, `/me/context`).
- Compose BE expone el backend Go donde `BASE_MANAGER_API` lo espera (8080).

## Señales de incompletitud / incompatibilidad
- `yarn install` falla por `@devpablocristo/platform-*` → falta platform-migration.
- `vite build` falla por import de `@material-tailwind` → tailwind config y deps desincronizados.
- `yarn codegen:openapi` falla por swagger ausente → falta 024 BE.
- Tipos en `generated/index.ts` referencian schemas que no existen en el swagger → contrato desalineado.
