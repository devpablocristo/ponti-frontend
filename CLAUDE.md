# CLAUDE.md — ponti-frontend

## Recordatorio al inicio de cada sesión

> **Specs:** antes de implementar algo no trivial, verificá si existe un spec en
> `docs/specs/features/` o en `docs/features-develop-problematico/`. Si no existe y
> el cambio es significativo, creá el spec primero. Ver reglas abajo.

---

## Cuándo usar specs

| Tipo de cambio | Acción |
|---|---|
| Cosmético / bug simple (1-2 archivos) | Solo commit descriptivo. No tocar specs. |
| Bug complejo o que revela algo no obvio | Arreglar, luego actualizar el spec del dominio si aplica. |
| Feature nueva no trivial | Crear spec en `docs/specs/features/<slug>.md` antes de codear. |
| Feature del backlog (`develop-problematico`) | Siempre `/recuperar-feature <id>` primero. |

## Formato de spec

Todo spec en `docs/specs/features/` debe tener estas secciones:

```markdown
# spec — <slug>

## Qué hace
<2-3 líneas: problema que resuelve + solución>

## Archivos
| Archivo | Cambio | Qué hace |
|---|---|---|

## Dependencias
- Qué tiene que existir antes (intra-repo y BE)

## Criterios de aceptación
- [ ] condición verificable

## Riesgos
- riesgo: consecuencia

## Decisiones de diseño
- Por qué X en lugar de Y
```

Regla: un spec debe poder leerse en 5 minutos y responder — qué tocar, qué resolver antes, cuándo terminó, qué vigilar.

## Sistema de specs de este repo

- `docs/features-develop-problematico/` — **backlog** (16 features de `develop-problematico` pendientes)
- `docs/specs/features/` — **specs definitivos** listos para implementar
- Orden de recuperación: ver `docs/features-develop-problematico/extraction-order.md`
- Comando para convertir backlog → spec definitivo: `/recuperar-feature <id-o-slug>`

## Stack

- `ui/` — React + Vite + TypeScript + Tailwind
- `api/` — BFF Express/Node (proxy hacia el backend Go)
- Tests: vitest (`yarn workspace ui test`)
- Build: `yarn workspace ui build`

## Reglas generales

- No crear archivos de documentación (`.md`) salvo que el usuario lo pida explícitamente o sea un spec.
- No agregar comentarios al código salvo que el WHY no sea obvio.
- No modificar specs del backlog (`docs/features-develop-problematico/`) directamente — esos se procesan con `/recuperar-feature`.
