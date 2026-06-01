# dependencies — feature-022 · lefthook-git-hooks (FE)

## Depende-de
- **Ninguna feature.** El YAML no requiere que ninguna otra feature esté porteada para existir o ser válido.
- Dependencia **blanda (tooling, no de extracción)**: presupone que `ui/` tiene binarios resolubles vía yarn:
  - `eslint` (script `lint` = `eslint .` en `ui/package.json`),
  - `tsc` (script `typecheck` = `tsc --noEmit`, `build` = `tsc -b && vite build`),
  - `vitest` (script `test` = `vitest run`).
  Estos ya están en develop, así que la dependencia está satisfecha.

## Bloquea-a
- **Ninguna feature.** Ningún otro paquete lista feature-022 como prerequisito.

## Clasificación de dependencias
- **Fuertes**: ninguna.
- **Débiles**: presencia de los binarios de tooling en `ui/` (satisfecha en develop).
- **Inciertas**: ninguna.

## Archivos / tipos / config / migraciones / APIs compartidos
- **Compartidos con otras features en este repo**: ninguno. `lefthook.yml` es un archivo nuevo y aislado; no comparte hunks con `package.json`, `ui/yarn.lock`, routers ni bootstrap.
- **APIs/DTOs/migraciones**: ninguno.

## Cross-repo
- **core (BE) feature-022**: tiene su propio `lefthook.yml`. Relación = **paralela/cosmética**, sin acoplamiento técnico. No comparten contenido, no hay contrato entre ambos.
- No hay dependencia de orden: FE y BE se pueden mergear en cualquier orden o por separado.

## Relación con features adyacentes (solo referencia, NO dependencia)
- feature-020 `ci-workflows` [BEFE]: CI corre lint/test en pipeline; lefthook hace lo análogo en local. Independientes (uno no requiere al otro).
- feature-021 `build-and-deploy-config` [BEFE]: no relacionado; lefthook no toca build/deploy.
- feature-019 `be-local-tooling-db-scripts` [BE]: misma familia conceptual (tooling local), pero distinto repo y sin acoplamiento.

## Recomendación de orden
- Portar **cuando convenga**, de forma aislada. No precede ni sucede a nada de forma obligatoria.
- Sugerencia DX (no requisito): mergear FE-022 y BE-022 en ventana cercana para anunciar el setup de hooks a devs de una sola vez.
