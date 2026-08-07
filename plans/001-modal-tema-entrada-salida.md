# 001 — Animar apertura/cierre de dialog#modalTask

- **Status**: TODO
- **Commit**: b00eb3f
- **Severity**: HIGH
- **Category**: Purpose & frequency / Missed opportunity
- **Estimated scope**: 1 file (styles.css), CSS only, ~20 líneas nuevas

## Problem

`dialog#modalTask` es el modal de detalle/edición de tema (rediseñado en la Fase 3). Hoy no tiene ninguna transición: `showModal()` y `.close()` lo hacen aparecer/desaparecer instantáneamente, sin fade del backdrop ni scale/opacity de entrada.

```css
/* styles.css:2500-2508 — actual */
dialog#modalTask {
  border: 0; border-radius: 12px;
  padding: 0;
  width: min(1280px, 97vw);
  max-height: 90vh;
  box-shadow: 0 30px 60px rgba(15,23,42,0.2);
}
dialog#modalTask::backdrop { background: rgba(15,23,42,0.78); }
html[data-theme="dark"] dialog#modalTask { background: var(--card); color: var(--text); }
```

Contraste: `.drawer` (styles.css:1257-1279, detalle de expediente) ya anima scale(0.96→1) + opacity en `.2s ease` al togglear una clase `.open`. Ese es el patrón de referencia del repo, pero `dialog#modalTask` usa el `<dialog>` nativo (`showModal()`/`.close()` en app.js:4413,4419,4485,4552,4583) en vez de una clase — no se puede copiar el patrón de `.drawer` tal cual.

## Target

Usar el patrón moderno de animación de `<dialog>` nativo: `@starting-style` + `transition-behavior: allow-discrete` en `display`/`overlay`. Esto anima tanto la apertura (`showModal()`) como el cierre (`.close()`) sin tocar el JS — el navegador mantiene el elemento pintado con sus valores "cerrados" durante la transición antes de sacarlo del top layer.

Primero, agregar los tokens de easing que van a usar todos los planes de este lote (van al primer selector `:root` del archivo, styles.css:1):

```css
/* styles.css:1 — agregar dentro del primer :root { ... } */
:root {
  --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
  ...
}
```

Luego, reemplazar el bloque de `dialog#modalTask`:

```css
/* target — reemplaza styles.css:2500-2508 */
dialog#modalTask {
  border: 0; border-radius: 12px;
  padding: 0;
  width: min(1280px, 97vw);
  max-height: 90vh;
  box-shadow: 0 30px 60px rgba(15,23,42,0.2);
  opacity: 1;
  transform: scale(1);
  transition: opacity .2s var(--ease-out), transform .2s var(--ease-out),
              overlay .2s var(--ease-out) allow-discrete,
              display .2s var(--ease-out) allow-discrete;
}
dialog#modalTask:not([open]) {
  opacity: 0;
  transform: scale(0.96);
}
@starting-style {
  dialog#modalTask[open] {
    opacity: 0;
    transform: scale(0.96);
  }
}
dialog#modalTask::backdrop {
  background: rgba(15,23,42,0.78);
  transition: background .2s var(--ease-out),
              overlay .2s var(--ease-out) allow-discrete,
              display .2s var(--ease-out) allow-discrete;
}
@starting-style {
  dialog#modalTask[open]::backdrop {
    background: rgba(15,23,42,0);
  }
}
html[data-theme="dark"] dialog#modalTask { background: var(--card); color: var(--text); }
```

Nota: `dialog:not([open])` normalmente no se pintaría (display:none del user-agent stylesheet), pero con `display` incluido en `transition-property` + `allow-discrete`, el motor mantiene esos valores "de salida" visibles durante los 200ms de la transición de cierre antes de aplicar el `display:none` real. Esto es exactamente el mecanismo que hace que `.close()` anime sin cambios de JS.

## Repo conventions to follow

- No hay tokens `--ease-*`/`--duration-*` en el repo todavía — este plan los crea. Todos los planes siguientes (002, 003) deben reusar `--ease-out`, no inventar un cubic-bezier nuevo.
- Duración: modales van en 200-500ms según AUDIT.md; usar `.2s` para quedar alineado con `.drawer` (styles.css:1268), que ya usa `.2s ease` para el mismo tipo de elemento (panel centrado).
- Exemplar de scale de entrada: `.drawer` (styles.css:1257-1279) usa `scale(0.96)` como estado cerrado — mismo valor acá, por consistencia entre los dos "detalle" del proyecto (tema y expediente).

## Steps

1. En `styles.css:1`, dentro del primer `:root { ... }`, agregar `--ease-out: cubic-bezier(0.23, 1, 0.32, 1);` (si el plan 002 o 003 ya lo agregaron primero, no duplicar).
2. Reemplazar `styles.css:2500-2508` (bloque `dialog#modalTask` + `::backdrop` + dark override) por el bloque "Target" de arriba, preservando la línea `html[data-theme="dark"] dialog#modalTask { ... }` tal cual al final.
3. No tocar app.js — `showModal()`/`.close()` ya disparan la transición automáticamente con este CSS.

## Boundaries

- Do NOT touch `#taskForm`, `.task-modal-header`, `.task-modal-tabs`, `.task-modal-content`, `.task-modal-footer` — eso es el plan 004 (lote 2).
- Do NOT touch `dialog#modalForm` ni `dialog#modalNewResp` — fuera de alcance (no son "detalle de tema").
- Do NOT change markup en index.html.
- Si `styles.css:2500-2508` no coincide con el snippet "Problem" de arriba (el archivo cambió desde el commit `b00eb3f`), STOP y reportar en vez de improvisar.

## Verification

- **Mechanical**: no hay build step local (Node no instalado en este equipo) — verificar visualmente en `npm run dev` o en un deploy preview de Vercel.
- **Feel check**: abrir cualquier tema desde el tablero y confirmar:
  - El modal entra con un scale sutil (0.96→1) + fade, no aparece de golpe.
  - El backdrop hace fade de opacidad, no salta a `rgba(...,0.78)` de una.
  - Al cerrar (X, Cancelar, o Eliminar confirmado), el modal se achica y se desvanece antes de desaparecer del DOM — no corta en seco.
  - En DevTools → Animations panel, bajar playback a 10% y confirmar que el scale arranca en 0.96 y termina en 1.0 sin saltos.
  - Repetir en `html[data-theme="dark"]` — el fondo oscuro del modal (`var(--card)`) debe mantenerse correcto durante la transición.
- **Done when**: abrir y cerrar el modal de tema (crear, editar, ver) se siente como un panel que aparece/desaparece, no como un corte binario; no hay regresión visual en modo oscuro.
