# 004 — Fade al cambiar de tab en el modal de tema

- **Status**: TODO
- **Commit**: 4a43c19
- **Severity**: LOW-MEDIUM
- **Category**: Cohesion / Missed opportunity
- **Estimated scope**: 1 file (styles.css), CSS only, ~6 líneas

## Problem

Al cambiar de tab (General/Hitos/Actividad/Documentos) dentro de `dialog#modalTask`, el contenido cambia con un `display:none`→`display:block` puro — sin transición. El pane nuevo aparece de golpe.

```css
/* styles.css:2606-2607 — actual */
.task-pane { display: none; }
.task-pane.active { display: block; }
```

```js
// app.js — wireTaskModalTabs(), sin cambios en este plan
tab.classList.add("active");
const pane = els.taskForm.querySelector(`.task-pane[data-task-pane="${tab.dataset.taskTab}"]`);
if (pane) pane.classList.add("active");
```

## Target

No es un crossfade real (los panes no se superponen en el layout — uno ocupa el lugar del otro, así que mostrar ambos a la vez causaría un salto de altura). En cambio, el pane que se activa hace un fade-in corto apenas se vuelve visible, aprovechando que un elemento que pasa de `display:none` a `display:block` siempre reinicia su animación CSS:

```css
/* target — reemplaza styles.css:2606-2607 */
.task-pane { display: none; }
.task-pane.active {
  display: block;
  animation: taskPaneIn .15s var(--ease-out);
}
@keyframes taskPaneIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

## Repo conventions to follow

- Reusar `--ease-out: cubic-bezier(0.23, 1, 0.32, 1);` (creado en el plan 001, ya en `:root`, styles.css:21) — no crear un cubic-bezier nuevo.
- Duración corta (150ms) a propósito: cambiar de tab es una interacción frecuente dentro de una sesión de edición (categoría "tens of times/day" del audit) — el movimiento debe ser sutil, no un panel de entrada como el modal (200ms) o el selector de pizarras (200ms).
- No animar `.task-tab-add` (botón "+" para agregar tab) — fuera de alcance, no es un pane.

## Steps

1. En `styles.css:2606-2607`, reemplazar el bloque `.task-pane { display: none; } .task-pane.active { display: block; }` por el bloque "Target" de arriba (agrega la regla `@keyframes taskPaneIn` justo después).

## Boundaries

- Do NOT tocar `app.js` — `wireTaskModalTabs()` ya agrega/quita `.active` en el momento correcto; el fade sale gratis de que la animación se reinicia cada vez que el elemento vuelve a ser visible.
- Do NOT animar el ancho/alto del contenedor — solo opacity.
- Do NOT tocar `.task-pane[data-task-pane="documentos"]` ni `.task-pane[data-task-pane="general"]` (min-height) — quedan igual.
- Si `styles.css:2606-2607` no coincide con el snippet de arriba (el archivo cambió desde `4a43c19`), STOP y reportar.

## Verification

- **Mechanical**: sin build local — probar en `npm run dev` o preview de Vercel.
- **Feel check**:
  - Abrir el modal de un tema y clickear entre las tabs varias veces seguidas: cada pane debe entrar con un fade sutil, no debe verse un "parpadeo" ni contenido duplicado.
  - Clickear rápido y repetido entre dos tabs: no debe haber acumulación de animaciones ni el contenido debe quedar a medio fade (verificar que no "tiembla").
  - En DevTools → Animations panel, bajar playback a 10% y confirmar que el fade dura ~150ms y no hay salto de layout (el pane no debe moverse, solo aparecer).
- **Done when**: cambiar de tab dentro del modal de tema se siente como un fade suave, no como un corte binario; no hay regresión de layout ni glitches con clicks repetidos.
