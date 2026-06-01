# validation — feature-022 · lefthook-git-hooks (FE)

## Checklist pre-PR
- [ ] `lefthook.yml` existe en la raíz del repo tras el port.
- [ ] Diff contra el SOURCE es vacío:
  ```bash
  diff <(git -C /home/pablocristo/Proyectos/pablo/ponti/web show 3ffcf60:lefthook.yml) \
       /home/pablocristo/Proyectos/pablo/ponti/web/lefthook.yml
  ```
- [ ] `git -C /home/pablocristo/Proyectos/pablo/ponti/web diff --check` limpio (sin trailing whitespace / conflict markers).
- [ ] El PR toca **solo** `lefthook.yml` (`git diff --cached --stat` muestra 1 archivo).
- [ ] No se agregó nada a `package.json`/`ui/package.json`/`ui/yarn.lock` por accidente.

## Validación manual (requiere lefthook instalado: `brew/apt install lefthook`)
- [ ] `lefthook install` corre sin error (instala los git hooks).
- [ ] `lefthook run pre-commit` parsea el YAML y arranca `eslint` + `typecheck` sin error de configuración.
- [ ] `lefthook run pre-push` arranca `vitest run --passWithNoTests`.
- [ ] Hacer un commit de prueba con un archivo `ui/src/*.tsx` con error de lint → el commit debe **abortarse** (verifica que el hook efectivamente bloquea).
- [ ] `git commit --no-verify` en ese mismo caso → el commit **pasa** (verifica el bypass documentado).

## Tests sugeridos
- **FE**: no hay tests nuevos. Confirmar que los comandos del hook funcionan a mano desde `ui/`:
  ```bash
  cd /home/pablocristo/Proyectos/pablo/ponti/web/ui && yarn eslint src        # o {staged_files}
  cd /home/pablocristo/Proyectos/pablo/ponti/web/ui && yarn tsc -b --noEmit
  cd /home/pablocristo/Proyectos/pablo/ponti/web/ui && yarn vitest run --passWithNoTests
  ```
- No correr `yarn build`/e2e como parte de esta validación: la feature no los toca.

## Casos borde
- Dev SIN lefthook instalado → ningún hook corre; commit/push normales. (Comportamiento esperado, no es bug.)
- Commit que NO toca `ui/src/**/*.{ts,tsx}` → `glob` no matchea, eslint/typecheck no corren (solo lo staged relevante).
- `tsc -b` lento en commits grandes → revisar tiempos; no es fallo de correctitud.
- Hooks preexistentes en `.git/hooks` del dev → `lefthook install` los reescribe; avisar a devs con setup propio.

## Qué revisar en UI / API / DB / env
- **UI**: nada que revisar visualmente (config local).
- **API** (`api/`): no afectado (hooks solo apuntan a `ui/`).
- **DB**: N/A.
- **env**: ninguna variable nueva.

## Qué validar en el otro repo (core / BE)
- Que el `lefthook.yml` de `core` también parsee y sus comandos Go corran (`lefthook run pre-commit` en core).
- Coherencia de DX entre ambos repos (mismo flujo install/bypass documentado).

## Señales de incompletitud / incompatibilidad
- `lefthook run pre-commit` falla con "command not found" → binario (`eslint`/`tsc`/`vitest`) no resoluble en `ui/`; revisar `ui/node_modules` / lockfile.
- El archivo en develop tiene menos de 27 líneas o no termina en la línea de `vitest` → copia truncada, re-extraer.
- `lefthook.yml` aparece junto a cambios en `package.json`/`yarn.lock` en el PR → contaminación de otra feature; separar.
