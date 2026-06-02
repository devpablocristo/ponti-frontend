# `docs/specs/` — Specs definitivos (FE)

Acá viven los **specs definitivos** del frontend (`web` = `ui/` + BFF `api/`). Cada archivo es la
fuente de verdad de una pieza de trabajo, lista para implementar.

- `features/` — specs de features recuperadas de `develop-problematico` (ver abajo).

**Convención de naming:** un archivo suelto por spec, sin número, sin sufijo: `docs/specs/<área>/<slug>.md`.
(Misma convención que el repo backend `core`.)

---

## Recuperación controlada de `develop-problematico`

En `develop-problematico` se hizo mucho trabajo que dio problemas y se revirtió. Ese trabajo está
documentado en `docs/features-develop-problematico/` (el **backlog**) y se recupera **de a una
feature por vez, a nivel spec, antes de implementar**.

### Cómo correrlo

En el chat de Claude Code, escribí:

```
/recuperar-feature <id-o-slug>
```

Ejemplos:

```
/recuperar-feature 006
/recuperar-feature master-data-pages
```

### Qué hace (por cada corrida)

1. Encuentra la feature en `docs/features-develop-problematico/`.
2. **Re-baselinea contra el `develop` real** (solo lectura) para sacar el *diff de verdad* (no el que
   asume el spec viejo).
3. Escribe **un único** spec definitivo en `docs/specs/features/<slug>.md`
   (Propósito · Estado vs develop · Alcance/archivos · Dependencias y contrato BE · Plan de
   implementación · Validación · Riesgos).
4. **Borra** (`git rm`) la carpeta de esa feature del backlog → así `docs/features-develop-problematico/`
   muestra solo lo que falta tratar y `docs/specs/features/` lo ya tratado.

### Qué NO hace

- **No** escribe código de la app, **no** crea ramas, **no** mergea.
- La **implementación** es una etapa posterior, en la rama de trabajo sincronizada con `develop`.

> **BE-first:** muchas features FE consumen contratos del backend (`core`). Antes de implementar la
> cara FE, el contrato BE correspondiente debe estar en `develop` del backend.
>
> Definición del comando: [`.claude/commands/recuperar-feature.md`](../../.claude/commands/recuperar-feature.md).
