# feature-020 (FE) — risks

## Funcionales

- **Riesgo:** nulo en runtime. El campo `name:` no afecta la ejecución de los workflows (triggers, jobs, deploy son idénticos).
- **Mitigación:** N/A. Confirmar con `git diff --cached` que solo cambia la línea 1.

## Técnicos

- **Required status checks por nombre (medio).** Si la branch protection de `develop`/`main` exige un check llamado literalmente "CI PR Frontend", al renombrarlo a "CI PR" GitHub puede dejar el PR con un check requerido "pendiente" que nunca llega.
  - **Mitigación:** preferir required checks por **job** (`lint`, `typecheck`, `test`, `build`) que NO cambian de nombre; o actualizar la regla de protección al nuevo nombre del workflow inmediatamente tras el merge. Revisar Settings → Branches en GitHub antes de mergear.
- **Notificaciones / dashboards externos (bajo).** Cualquier integración (Slack, badges, links a "Deploy Frontend DEV") que referencie el nombre humano del workflow quedará desactualizada.
  - **Mitigación:** buscar referencias al string viejo en README/badges/integraciones; actualizar.

## Integración

- **Bajo.** No hay integración runtime con el `name:`. La pestaña Actions y los checks reflejan el nuevo nombre sin más.

## Cross-repo

- **Bajo.** FE y BE no comparten archivos. El único riesgo es **inconsistencia temporal** si solo un repo se renombra (uno dirá "Deploy DEV", el otro "Deploy Backend DEV").
  - **Mitigación:** mergear feature-020 en ambos repos en la misma ventana.

## Datos / migración

- **Ninguno.** No hay DB ni migraciones.

## Archivos compartidos (con feature-021)

- **Principal riesgo del paquete (medio).** Los 4 YAML también reciben cambios de feature-021 (build-and-deploy-config) en otras líneas. Hacer `git checkout 3ffcf60 -- <archivo>` (archivo entero) puede arrastrar hunks de 021 si 021 ya está en `develop` o si se hace en orden equivocado, mezclando dos features en un PR.
  - **Mitigación:** usar `git restore -p --source=3ffcf60` y aceptar SOLO el hunk de la línea `name:`. Verificar con `git diff --cached` que son 4 hunks de 1 línea.

## Extracción parcial

- **Incompleta:** olvidar uno de los 4 archivos → quedaría "Deploy Frontend STAGING" mientras los otros se renombran. Detección: `for f in ci-pr deploy-dev deploy-prod deploy-staging; do git show develop:.github/workflows/$f.yml | head -1; done` no debe contener "Frontend".
- **De más:** colar hunks de 021 → deploy/CI podrían cambiar de comportamiento sin querer (ese sí es el "puede romper deploy" de la nota de feature). Detección: cualquier hunk fuera de la línea 1.

## Riesgo de mergear solo este repo / solo el otro

- **Solo FE:** seguro. FE queda con nombres nuevos; BE con viejos → solo inconsistencia cosmética en Actions. No rompe nada.
- **Solo BE:** simétrico, igual de seguro. Sin impacto funcional.
- **Conclusión:** no hay riesgo de romper deploy por mergear un solo lado; el riesgo cross-repo es puramente estético.
