# 006 — Entrada animada para kcard-menu y board-menu

- **Status**: TODO
- **Commit**: 4a43c19
- **Severity**: LOW
- **Category**: Physicality & origin (categoría 3 de AUDIT.md)
- **Estimated scope**: 1 file (styles.css), CSS only, ~14 líneas. Sin cambios en app.js.

## Problem

Dos menús contextuales anclados a un trigger aparecen sin ninguna animación de entrada:

```css
/* styles.css:853-866 — actual, kcard-menu (menu "..." de cada tarjeta) */
.kcard-menu-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15,23,42,0.6);
  z-index: 1000;
}
.kcard-menu {
  position: fixed;
  z-index: 1001;
  min-width: 190px;
  background: #18181B;
  border-radius: 10px;
  padding: 6px;
  box-shadow: 0 12px 28px rgba(0,0,0,0.35);
}
```

```css
/* styles.css:905-927 — actual, board-menu (menu "..." del tabbar del tablero) */
.board-menu-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15,23,42,0.6);
  z-index: 1000;
}
.board-menu {
  position: fixed;
  top: 64px;
  right: 22px;
  z-index: 1001;
  width: 340px;
  max-width: calc(100vw - 24px);
  max-height: calc(100vh - 88px);
  background: #18181B;
  color: #FAFAFA;
  border-radius: 10px;
  box-shadow: 0 12px 28px rgba(0,0,0,0.35);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
```

`kcard-menu` se crea con `document.createElement`/`appendChild` y se destruye con `.remove()` (app.js:1542-1568, `openKcardMenu`/`closeKcardMenu`). `board-menu` es un elemento fijo que se muestra/oculta con la clase utilitaria `.hidden` (`display:none !important`, styles.css:375) desde `openBoardMenu`/`closeBoardMenu` (app.js:1668-1683).

## Target

Fade + translateY corto en la entrada, sin scale (son popovers anclados a un botón fijo en top-right — `kcard-menu` se posiciona con `menu.style.top`/`menu.style.right` calculados desde el trigger, `board-menu` siempre en `top:64px;right:22px`; ambos "crecen" hacia abajo-izquierda desde esa esquina, por eso translateY en vez de scale-from-origin). Sin animación de salida — se abren muchas veces por sesión, así que el cierre debe seguir siendo instantáneo (ver "Repo conventions" para el porqué).

```css
/* target — agregar después de .kcard-menu (styles.css:866) */
.kcard-menu {
  animation: contextMenuIn .12s var(--ease-out);
}
@keyframes contextMenuIn {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}
```

```css
/* target — agregar dentro de .board-menu (styles.css:912-927), reusa @keyframes contextMenuIn de arriba */
.board-menu {
  /* ...propiedades existentes sin cambios... */
  animation: contextMenuIn .12s var(--ease-out);
}
```

No hace falta declarar `@keyframes contextMenuIn` dos veces — una sola declaración (cerca de `.kcard-menu`) sirve para ambos selectores.

## Repo conventions to follow

- Reusar `--ease-out` (creado en plan 001, `:root` en styles.css:21).
- Duración 120ms — más corta que los paneles de los planes 001/002 (200ms) porque, según AUDIT.md categoría 1, elementos que se abren "tens of times/day" (estos menús se abren mucho más seguido que un modal) piden movimiento drásticamente reducido, no eliminado.
- Por qué sin animación de salida: `kcard-menu` se desmonta del DOM (`.remove()`) y `board-menu` usa `display:none !important` vía `.hidden` — animar el cierre de ambos requeriría tocar JS (delay antes de `.remove()`, o mover `board-menu` fuera de la clase utilitaria `.hidden` compartida por el resto del proyecto). Es un cambio de mayor alcance que no corresponde a este plan; si se quiere en el futuro, es un plan aparte con su propio boundary sobre `.hidden`.
- Por qué `animation` (keyframes) y no `transition`: ambos elementos pasan de "no existir/`display:none`" a visibles de una sola vez (no hay un estado intermedio que un `transition` pueda interpolar) — un `@keyframes` que arranca solo cuando el elemento se vuelve renderizable es el mecanismo correcto acá (mismo patrón que el plan 004 usa para `.task-pane.active`).

## Steps

1. En `styles.css`, inmediatamente después del bloque `.kcard-menu { ... }` (termina en la línea 866), agregar `animation: contextMenuIn .12s var(--ease-out);` dentro de ese mismo selector `.kcard-menu`, y declarar `@keyframes contextMenuIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }` justo después del selector.
2. En `styles.css:912-927`, agregar la línea `animation: contextMenuIn .12s var(--ease-out);` dentro del selector `.board-menu` (no duplicar el `@keyframes`, ya está declarado en el paso 1).

## Boundaries

- Do NOT tocar `app.js` — ni `openKcardMenu`/`closeKcardMenu` ni `openBoardMenu`/`closeBoardMenu` cambian.
- Do NOT tocar la clase utilitaria `.hidden` (styles.css:375) — se usa en todo el proyecto, fuera de alcance.
- Do NOT agregar animación de salida a ninguno de los dos menús en este plan.
- Do NOT tocar `.kcard-menu-overlay` ni `.board-menu-overlay` (el fondo oscuro fijo detrás del menú) — solo los paneles de menú en sí.
- Si `styles.css:853-866` o `styles.css:912-927` no coinciden con los snippets de arriba (el archivo cambió desde `4a43c19`), STOP y reportar.

## Verification

- **Mechanical**: sin build local — probar en `npm run dev` o preview de Vercel.
- **Feel check**:
  - Click en el botón "⋯" de cualquier tarjeta del tablero: el menú debe entrar con un fade + deslizamiento sutil hacia abajo, no aparecer de golpe.
  - Click en el botón "⋯" del tabbar del tablero (board-menu): mismo efecto.
  - Abrir y cerrar varias veces seguidas: no debe haber acumulación ni el menú debe quedar a mitad de fade al reabrir rápido.
  - Confirmar que el cierre sigue siendo instantáneo en ambos (comportamiento esperado, no es un bug de este plan).
- **Done when**: ambos menús contextuales entran con el mismo fade+translateY sutil; el resto de su comportamiento (posición, cierre, contenido) no cambia.
