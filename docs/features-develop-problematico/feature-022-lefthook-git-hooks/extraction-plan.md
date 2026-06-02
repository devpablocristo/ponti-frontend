# extraction-plan — feature-022 · lefthook-git-hooks (FE)

- **repo**: Frontend monorepo (`/home/pablocristo/Proyectos/pablo/ponti/web`)
- **rama base**: `develop` (tip 8c25e88)
- **SOURCE**: `develop-problematico~1` (SHA **3ffcf60**). NUNCA usar `develop-problematico` (su tip es un restore/vacío).
- **rama sugerida**: `pr/feature-022-lefthook-git-hooks-fe`

## PR title
`chore(fe): agregar lefthook.yml (git hooks pre-commit/pre-push) [feature-022]`

## PR description (sugerida)
> Agrega `lefthook.yml` en la raíz del monorepo FE para automatizar verificaciones locales:
> - **pre-commit** (parallel): `eslint` sobre `ui/src/**/*.{ts,tsx}` staged + `typecheck` (`tsc -b`).
> - **pre-push**: `vitest run --passWithNoTests` en `ui/`.
>
> Tooling local **opcional**. No toca runtime, CI ni build. lefthook NO se agrega como dependencia del proyecto; cada dev lo instala a nivel sistema (`brew/apt install lefthook` + `lefthook install`), tal como documenta el header del YAML.
>
> Portado tal cual desde `develop-problematico~1` (3ffcf60). Add limpio, sin conflicto con develop.
> Cross-repo: existe un `lefthook.yml` análogo en `core` (feature-022 BE); se mergean por separado.

## Archivos enteros vs parciales
- **Entero**: `lefthook.yml` (único archivo). Sin partials.

## Migraciones / tests a incluir
- Ninguna migración. No agrega tests.

## Dependencias previas
- Ninguna. Se puede portar de forma totalmente aislada.

## Coordinación con el otro repo
- **Orden**: indistinto (sin acoplamiento). No hay BE-first ni FE-first; cada `lefthook.yml` es independiente. Recomendado: mergear ambos en la misma ventana solo por consistencia de mensaje a devs, pero no es requisito.

## Pasos ordenados
1. Posicionarse en develop actualizado.
2. Crear la rama de la feature.
3. Traer el archivo entero desde el SOURCE.
4. Verificar contenido y whitespace.
5. Commit + push + PR.

## Comandos git SUGERIDOS (para un humano — NO ejecutados por este agente)
```bash
git -C /home/pablocristo/Proyectos/pablo/ponti/web checkout develop
git -C /home/pablocristo/Proyectos/pablo/ponti/web pull --ff-only
git -C /home/pablocristo/Proyectos/pablo/ponti/web checkout -b pr/feature-022-lefthook-git-hooks-fe

# traer el archivo entero desde el SOURCE (SHA 3ffcf60)
git -C /home/pablocristo/Proyectos/pablo/ponti/web checkout develop-problematico~1 -- lefthook.yml

# verificación
git -C /home/pablocristo/Proyectos/pablo/ponti/web diff --check
git -C /home/pablocristo/Proyectos/pablo/ponti/web diff --cached --stat
diff <(git -C /home/pablocristo/Proyectos/pablo/ponti/web show 3ffcf60:lefthook.yml) \
     /home/pablocristo/Proyectos/pablo/ponti/web/lefthook.yml   # debe ser vacío

git -C /home/pablocristo/Proyectos/pablo/ponti/web add lefthook.yml
git -C /home/pablocristo/Proyectos/pablo/ponti/web commit -m "chore(fe): agregar lefthook.yml (git hooks) [feature-022]"
git -C /home/pablocristo/Proyectos/pablo/ponti/web push -u origin pr/feature-022-lefthook-git-hooks-fe
```
> Como es un solo archivo nuevo no hace falta `git restore -p` (no hay hunks mixtos). Si se prefiriera, `git restore --source=develop-problematico~1 --staged --worktree -- lefthook.yml` es equivalente.

## Qué NO traer
- Nada de `package.json` / `ui/package.json` / `ui/yarn.lock` (la feature no los toca).
- No agregar `lefthook` a devDependencies como parte de este PR salvo decisión explícita del equipo (sería un cambio adicional, ver risks.md).
- No traer el `lefthook.yml` del repo `core`.

## Qué podría romperse
- Runtime/CI/build: nada. El archivo solo lo lee el binario lefthook localmente.
- Para devs con lefthook instalado y `lefthook install` corrido: el commit/push ahora dispara eslint/tsc/vitest; si su working tree tiene errores de lint o tipos, el commit se bloqueará (comportamiento deseado, pero puede sorprender). Bypass: `--no-verify`.

## Cómo detectar extracción incompleta
- `git show develop:lefthook.yml` debe devolver el archivo completo (27 líneas, termina en `run: cd ui && yarn vitest run --passWithNoTests`).
- El diff contra `3ffcf60:lefthook.yml` debe ser vacío.

## Qué validar antes del PR
- `git diff --check` limpio.
- (Opcional, si lefthook está instalado) `lefthook run pre-commit` parsea y arranca los comandos.
- Confirmar que `ui/package.json` sigue teniendo binarios `eslint`/`tsc`/`vitest` resolubles (script `test` = `vitest run`, `typecheck` = `tsc --noEmit`, `lint` = `eslint .`).

## Qué hacer después de mergear
- Avisar a devs: `lefthook install` (una vez) para activar los hooks.
- Considerar (mejora futura) declarar `lefthook` como devDependency + script `prepare`/`postinstall` para auto-instalación.
- Coordinar el merge del `lefthook.yml` del repo `core` en ventana cercana (consistencia de DX), sin que sea bloqueante.
