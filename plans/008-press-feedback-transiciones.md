# 008 — Feedback de presión (:active) sin transición en 6 elementos

- **Status**: DONE
- **Commit**: 6438fd1
- **Severity**: MEDIUM
- **Category**: Physicality & origin (categoría 3 de AUDIT.md)
- **Estimated scope**: 1 file (`styles.css`), 6 ubicaciones, ~8 líneas nuevas/modificadas. Sin cambios en `app.js`.

## Problem

Seis elementos pulsables tienen `transform: scale(...)` en `:active` pero **ninguna** `transition` en la propiedad `transform` en ningún selector de esa clase — el achique al presionar ocurre instantáneo (salta), no se anima. Un séptimo (`.kcard`) no tiene ningún feedback de presión, ni siquiera instantáneo.

```css
/* styles.css:2887-2892 — actual */
.task-modal-edit-pencil {
  border: none; background: none; cursor: pointer; color: var(--muted);
  padding: 6px; border-radius: 6px; display: flex; flex-shrink: 0;
}
.task-modal-edit-pencil:hover { background: var(--bg); color: var(--text); }
.task-modal-edit-pencil:active { transform: scale(.97); }
```

```css
/* styles.css:3155-3159 — actual */
.task-comment-context button {
  border: none; background: none; color: var(--primary); cursor: pointer; opacity: .7;
  width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.task-comment-context button:hover { opacity: 1; }
.task-comment-context button:active { transform: scale(.97); }
```

```css
/* styles.css:3169-3175 — actual */
.task-feed-send {
  padding: 8px 20px;
  font-size: 13px;
  font-weight: 600;
  border-radius: 8px;
}
.task-feed-send:active { transform: scale(.97); }
```

```css
/* styles.css:3293-3298 — actual */
.task-accordion-head {
  ...
  padding: 14px 16px; border: 0; background: var(--card); color: var(--text);
  font: inherit; text-align: left; cursor: pointer;
}
.task-accordion-head:hover { background: var(--bg); }
.task-accordion-head:active { transform: scale(.995); }
```

```css
/* styles.css:3459-3467 — actual */
.hito-comment-btn {
  width: 26px; height: 26px; border-radius: 7px; display: flex; align-items: center; justify-content: center;
}
.hito-comment-btn:hover { background: var(--primary-soft); color: var(--primary); }
.hito-comment-btn:active { transform: scale(.97); }
html[data-theme="dark"] .hito-comment-btn { color: var(--muted); }
@media (hover: hover) and (pointer: fine) {
  .hito-comment-btn { transition: background-color .12s var(--ease-out), color .12s var(--ease-out); }
}
```

```css
/* styles.css:829-846 — actual (kcard: sin feedback de presión) */
.kcard {
  position: relative;
  background: white;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 8px 9px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  cursor: grab;
  box-shadow: 0 1px 2px rgba(15,23,42,0.04);
  transition: border-color .15s, box-shadow .15s;
}
.kcard:hover { border-color: var(--primary); box-shadow: 0 0 0 1px var(--primary); }
.kcard:active { cursor: grabbing; }
```

Además, `.task-accordion-head:active` usa `scale(.995)` — a un 0.5% de diferencia del tamaño original es imperceptible incluso con una transición correcta, muy por debajo del rango sutil que recomienda AUDIT.md (0.95–0.98).

Por último, el bloque `@media (prefers-reduced-motion: reduce)` que ya neutraliza el `transform` de presión de 6 elementos (`styles.css:3468-3481`) **no incluye `.kcard`** — si le agregamos scale acá, hay que sumarlo a esa lista para no introducir el único elemento sin cobertura de reduced-motion del archivo.

## Target

```css
/* target — styles.css:2887-2892 */
.task-modal-edit-pencil {
  border: none; background: none; cursor: pointer; color: var(--muted);
  padding: 6px; border-radius: 6px; display: flex; flex-shrink: 0;
  transition: transform .1s ease-out;
}
.task-modal-edit-pencil:hover { background: var(--bg); color: var(--text); }
.task-modal-edit-pencil:active { transform: scale(.97); }
```

```css
/* target — styles.css:3155-3159 */
.task-comment-context button {
  border: none; background: none; color: var(--primary); cursor: pointer; opacity: .7;
  width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  transition: transform .1s ease-out;
}
.task-comment-context button:hover { opacity: 1; }
.task-comment-context button:active { transform: scale(.97); }
```

```css
/* target — styles.css:3169-3175 */
.task-feed-send {
  padding: 8px 20px;
  font-size: 13px;
  font-weight: 600;
  border-radius: 8px;
  transition: transform .1s ease-out;
}
.task-feed-send:active { transform: scale(.97); }
```

```css
/* target — styles.css:3293-3298 */
.task-accordion-head {
  ...
  padding: 14px 16px; border: 0; background: var(--card); color: var(--text);
  font: inherit; text-align: left; cursor: pointer;
  transition: transform .1s ease-out;
}
.task-accordion-head:hover { background: var(--bg); }
.task-accordion-head:active { transform: scale(.97); }
```

```css
/* target — styles.css:3459-3467 (solo se agrega la linea "transition" a la regla base; el bloque @media(hover) no cambia) */
.hito-comment-btn {
  width: 26px; height: 26px; border-radius: 7px; display: flex; align-items: center; justify-content: center;
  transition: transform .1s ease-out;
}
.hito-comment-btn:hover { background: var(--primary-soft); color: var(--primary); }
.hito-comment-btn:active { transform: scale(.97); }
```

```css
/* target — styles.css:829-846 */
.kcard {
  position: relative;
  background: white;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 8px 9px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  cursor: grab;
  box-shadow: 0 1px 2px rgba(15,23,42,0.04);
  transition: border-color .15s, box-shadow .15s, transform .1s ease-out;
}
.kcard:hover { border-color: var(--primary); box-shadow: 0 0 0 1px var(--primary); }
.kcard:active { cursor: grabbing; transform: scale(.98); }
```

```css
/* target — styles.css:3469-3470, agregar .kcard:active a la lista existente */
@media (prefers-reduced-motion: reduce) {
  .hito-comment-btn:active, .lock-btn:active, .task-modal-edit-pencil:active,
  .task-accordion-head:active, .task-feed-send:active, .task-comment-context button:active,
  .kcard:active {
    transform: none;
  }
  ...
}
```

## Repo conventions to follow

- El patrón correcto ya existe en el propio archivo — `.lock-btn` (`styles.css:2896-2905`) combina exactamente esto: `transition: color .15s ease, border-color .15s ease, transform .1s ease-out;` junto a `.lock-btn:active { transform: scale(0.97); }`. Es el exemplar a imitar: `transform .1s ease-out` es la duración/curva ya establecida en este repo para feedback de presión (mismo valor que usa `.task-modal-close`, plan 005 ya aplicado).
- No agregar transición a otras propiedades (`background`, `color`, `opacity`) en los selectores de este plan — quedan como están; el alcance es solo el feedback de presión que falta, no una revisión general del hover de cada uno.
- `scale(.97)` es el valor que ya usan 4 de los 5 elementos con el bug — se lo aplica también a `.kcard` por consistencia. `.task-accordion-head` se ajusta de `.995` a `.97` porque, sin ese cambio, la transición nueva no tendría nada perceptible que animar.

## Steps

1. `styles.css:2887-2892` — agregar `transition: transform .1s ease-out;` a `.task-modal-edit-pencil`.
2. `styles.css:3155-3159` — agregar `transition: transform .1s ease-out;` a `.task-comment-context button`.
3. `styles.css:3169-3175` — agregar `transition: transform .1s ease-out;` a `.task-feed-send`.
4. `styles.css:3293-3298` — agregar `transition: transform .1s ease-out;` a `.task-accordion-head` y cambiar `.task-accordion-head:active { transform: scale(.995); }` a `scale(.97)`.
5. `styles.css:3459-3467` — agregar `transition: transform .1s ease-out;` a la regla base `.hito-comment-btn` (fuera del bloque `@media (hover: hover)`, que no se toca).
6. `styles.css:829-846` — agregar `, transform .1s ease-out` a la lista de `transition` de `.kcard`, y cambiar `.kcard:active { cursor: grabbing; }` a `.kcard:active { cursor: grabbing; transform: scale(.98); }`.
7. `styles.css:3469-3470` — agregar `.kcard:active` a la lista de selectores del bloque `@media (prefers-reduced-motion: reduce)` existente (no crear un bloque nuevo).

## Boundaries

- Do NOT tocar `app.js` — ningún handler de click/drag cambia.
- Do NOT agregar transición a `background`/`color`/`opacity` en ninguno de los 6 selectores — solo `transform`.
- Do NOT tocar `.lock-btn` ni `.task-modal-close` — ya están correctos, son solo la referencia.
- Do NOT agregar feedback de presión a ningún elemento fuera de esta lista de 6.
- Si alguno de los bloques citados no coincide con el archivo (cambió desde `6438fd1`), STOP y reportar.

## Verification

- **Mechanical**: sin build local — probar en `npm run dev` o preview de Vercel.
- **Feel check**:
  - Clickear (mantener presionado un instante) el lápiz de editar título del modal de tema, el botón "Comentar" del feed, una tarjeta del kanban, el header de un acordeón de hito, y el botón de comentario de un hito: los seis deben mostrar un achique breve y suave, no un salto.
  - En DevTools → Animations, bajar el playback a 10% y confirmar que el `scale` interpola (no salta de 1 a .97/.98 de golpe).
  - Arrastrar una kcard después de este cambio: confirmar que la imagen fantasma del drag nativo no sale distorsionada/aplastada por el scale de `:active` (el navegador toma el snapshot en `dragstart`, justo después del `:active` inicial).
  - Toggle `prefers-reduced-motion` (Rendering panel): los 6 elementos deben dejar de achicarse al presionar pero seguir siendo clickeables con normalidad.
- **Done when**: los 6 elementos animan su feedback de presión de forma consistente, `.kcard` tiene feedback por primera vez, y ninguno de los 6 queda sin cobertura de `prefers-reduced-motion`.
