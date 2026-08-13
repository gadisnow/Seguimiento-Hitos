# 010 — Entrada animada para user-menu, split-menu y resp-dropdown-panel

- **Status**: DONE
- **Commit**: 6438fd1
- **Severity**: MEDIUM
- **Category**: Missed opportunity (categoría 8) / Cohesión (categoría 7 de AUDIT.md) — companero directo del plan `006-menus-contextuales-entrada` (ya aplicado)
- **Estimated scope**: 1 file (`styles.css`), 3 ubicaciones (4 instancias — `.split-menu` es una sola clase compartida por 2 dropdowns), ~4 líneas nuevas. Sin cambios en `app.js`.

## Problem

Tres dropdowns aparecen con `display: none` → `display: block` puro, sin ninguna animación de entrada — mientras que sus primos directos (`kcard-menu`, `board-menu`) ya animan con `contextMenuIn` desde el plan 006:

```css
/* styles.css:237-252 — actual, menú del usuario (avatar, arriba a la derecha) */
.user-menu-dropdown {
  display: none;
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 240px;
  background: white;
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(15,23,42,0.14);
  z-index: 100;
  overflow: hidden;
  padding: 6px;
}
.user-menu.open .user-menu-dropdown { display: block; }
```

```css
/* styles.css:2165-2170 — actual, split-menu (usado 2 veces: descargar Planilla e Informe) */
.split-menu {
  position: absolute; top: calc(100% + 6px); right: 0; min-width: 230px;
  background: var(--card); border: 1px solid var(--border); border-radius: 12px;
  box-shadow: var(--shadow); padding: 6px; display: none; z-index: 20;
}
.split-menu.open { display: block; }
```

```css
/* styles.css:1766-1779 — actual, panel del selector de responsable */
.resp-dropdown-panel {
  display: none;
  position: absolute;
  top: calc(100% + 4px);
  left: 0; right: 0;
  background: white;
  border: 1px solid var(--border);
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(15,23,42,0.14);
  z-index: 100;
  overflow: hidden;
}
.resp-dropdown.open .resp-dropdown-panel { display: block; }
```

Los tres se abren/cierran con un simple `classList.toggle("open")`/`classList.remove("open")` en JS (`app.js:821`, `app.js:3299`/`3304`, `app.js:958-959`/`3439`) — mismo mecanismo que `kcard-menu`/`board-menu` ya tenían antes del plan 006, y mismo mecanismo con el que ese plan resolvió el problema.

## Target

Reusar el `@keyframes contextMenuIn` que el plan 006 ya declaró una sola vez en `styles.css:940-943` — no se vuelve a declarar acá:

```css
/* target — styles.css:252 */
.user-menu.open .user-menu-dropdown { display: block; animation: contextMenuIn .12s var(--ease-out); }
```

```css
/* target — styles.css:2170 */
.split-menu.open { display: block; animation: contextMenuIn .12s var(--ease-out); }
```

```css
/* target — styles.css:1779 */
.resp-dropdown.open .resp-dropdown-panel { display: block; animation: contextMenuIn .12s var(--ease-out); }
```

Sin animación de salida — mismo criterio que el plan 006 (se abren muchas veces por sesión, el cierre debe seguir siendo instantáneo).

## Repo conventions to follow

- `@keyframes contextMenuIn` ya existe, declarado en `styles.css:940-943` (fade + `translateY(-4px)→0`), aplicado hoy a `.kcard-menu` (`styles.css:938`), a `.board-menu` (`styles.css:998`) y a `.cal-day-popover` (`styles.css:1376`). Este plan es el mismo patrón aplicado a 3 dropdowns más — no crear un keyframe nuevo.
- Duración 120ms + `var(--ease-out)`, igual que plan 006 — razón documentada ahí: elementos que se abren "tens of times/day" piden movimiento reducido, no eliminado (AUDIT.md categoría 1), por eso 120ms y no los 200ms de un modal/drawer.
- El bloque `@media (prefers-reduced-motion: reduce)` que ya cubre `.kcard-menu, .board-menu, .cal-day-popover` (`styles.css:3985-3987`, swap a `contextFadeIn`, solo opacidad) **no** cubre estos 3 selectores nuevos — hay que sumarlos a esa misma regla para no dejarlos sin cobertura de reduced-motion (mismo criterio que ya aplica a los otros 3).

## Steps

1. `styles.css:252` — en `.user-menu.open .user-menu-dropdown { display: block; }`, agregar `animation: contextMenuIn .12s var(--ease-out);` a la misma regla.
2. `styles.css:2170` — en `.split-menu.open { display: block; }`, agregar `animation: contextMenuIn .12s var(--ease-out);` a la misma regla (cubre las 2 instancias — `#planillaMenu` e `#informeMenu` — porque ambas comparten la clase `.split-menu`).
3. `styles.css:1779` — en `.resp-dropdown.open .resp-dropdown-panel { display: block; }`, agregar `animation: contextMenuIn .12s var(--ease-out);` a la misma regla.
4. `styles.css:3985` — extender el selector del bloque `@media (prefers-reduced-motion: reduce)` existente:
   ```css
   .kcard-menu, .board-menu, .cal-day-popover,
   .user-menu.open .user-menu-dropdown, .split-menu.open, .resp-dropdown.open .resp-dropdown-panel {
     animation: contextFadeIn .12s var(--ease-out);
   }
   ```

## Boundaries

- Do NOT tocar `app.js` — los handlers de `classList.toggle("open")` de los 3 dropdowns no cambian.
- Do NOT declarar `@keyframes contextMenuIn` de nuevo — ya existe en `styles.css:940-943`.
- Do NOT agregar animación de salida a ninguno de los 3.
- Do NOT tocar `.kcard-menu`, `.board-menu` ni `.cal-day-popover` — ya están resueltos por el plan 006, solo se extiende su bloque de reduced-motion para incluir los 3 nuevos.
- Si los bloques citados no coinciden con el archivo (cambió desde `6438fd1`), STOP y reportar.

## Verification

- **Mechanical**: sin build local — probar en `npm run dev` o preview de Vercel.
- **Feel check**:
  - Click en el avatar de usuario (arriba a la derecha): el menú debe entrar con el mismo fade+deslizamiento sutil que ya tienen los menús "⋯" del tablero.
  - En la vista Reportes, click en el botón split "Descargar" tanto de Planilla como de Informe: mismo efecto en ambos.
  - Abrir el selector de responsable dentro de un formulario de tema/hito: mismo efecto.
  - Abrir y cerrar cada uno varias veces seguidas: no debe quedar a mitad de fade al reabrir rápido, y el cierre debe seguir siendo instantáneo.
  - Toggle `prefers-reduced-motion` (Rendering panel): los 3 deben seguir apareciendo con fade de opacidad pero sin el desplazamiento.
- **Done when**: los 3 dropdowns entran con el mismo lenguaje visual que `kcard-menu`/`board-menu`/`cal-day-popover`, y quedan cubiertos por el mismo bloque de reduced-motion.
