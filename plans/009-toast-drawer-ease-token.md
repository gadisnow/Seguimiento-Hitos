# 009 — Migrar toast y drawer al token --ease-out

- **Status**: DONE
- **Commit**: 6438fd1
- **Severity**: MEDIUM
- **Category**: Easing & duration (categoría 2) / Cohesión & tokens (categoría 7 de AUDIT.md)
- **Estimated scope**: 1 file (`styles.css`), 3 declaraciones `transition`, cambio de keyword únicamente. Sin cambios en `app.js`.

## Problem

El toast y el drawer (detalle de expediente) son de los elementos transitorios más vistos de la app, y ambos animan su entrada/salida con la curva `ease` (implícita o explícita) en vez del token `--ease-out` que ya usan todos los `dialog` del mismo archivo (`dialog#modalTask`, `#pizarraSwitcher`, `.task-pane`, `.task-accordion-body`, `kcard-menu`/`board-menu`):

```css
/* styles.css:1997-2013 — actual */
.toast {
  position: fixed;
  bottom: 28px;
  left: 50%;
  transform: translateX(-50%) translateY(16px);
  background: #18181B;
  color: #fff;
  padding: 10px 20px;
  border-radius: 10px;
  font-size: 13.5px;
  box-shadow: 0 8px 24px rgba(15,23,42,0.22);
  z-index: 200;
  opacity: 0;
  transition: opacity .2s, transform .2s;
  pointer-events: none;
  white-space: nowrap;
}
.toast.show {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}
```

```css
/* styles.css:1401-1409 — actual */
.drawer-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15,23,42,0.6);
  opacity: 0;
  transition: opacity .2s ease;
  z-index: 70;
  pointer-events: none;
}
```

```css
/* styles.css:1416-1434 — actual */
.drawer {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) scale(0.96);
  width: min(780px, 96vw);
  max-height: 92vh;
  background: white;
  border-radius: 18px;
  border: 1px solid var(--border);
  box-shadow: 0 24px 80px rgba(15,23,42,0.18);
  transition: transform .2s ease, opacity .2s ease;
  z-index: 80;
  display: grid;
  grid-template-rows: auto 1fr;
  opacity: 0;
  visibility: hidden;
  overflow: hidden;
}
```

El token `--ease-out` (`styles.css:26`) es posterior a este código (lo introdujo el plan `001-modal-tema-entrada-salida`, ver `plans/001-modal-tema-entrada-salida.md`) — `.toast` y `.drawer` son de antes de esa convención y nunca se migraron.

## Target

```css
/* target — styles.css:2010-2013 */
.toast {
  ...
  transition: opacity .2s var(--ease-out), transform .2s var(--ease-out);
  ...
}
```

```css
/* target — styles.css:1406 */
.drawer-overlay {
  ...
  transition: opacity .2s var(--ease-out);
  ...
}
```

```css
/* target — styles.css:1427 */
.drawer {
  ...
  transition: transform .2s var(--ease-out), opacity .2s var(--ease-out);
  ...
}
```

Ninguna duración ni valor de transform cambia — solo la curva.

## Repo conventions to follow

- `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)` vive en `:root` (`styles.css:26`).
- Exemplar ya migrado en el mismo archivo: `dialog#modalTask` (`styles.css:1681-1683`, `transition: opacity .2s var(--ease-out), transform .2s var(--ease-out), ...`) — mismo par de propiedades, misma duración (200ms), que `.toast`/`.drawer` deberían igualar.

## Steps

1. `styles.css:2010` — cambiar `transition: opacity .2s, transform .2s;` a `transition: opacity .2s var(--ease-out), transform .2s var(--ease-out);`.
2. `styles.css:1406` — cambiar `transition: opacity .2s ease;` a `transition: opacity .2s var(--ease-out);`.
3. `styles.css:1427` — cambiar `transition: transform .2s ease, opacity .2s ease;` a `transition: transform .2s var(--ease-out), opacity .2s var(--ease-out);`.

## Boundaries

- Do NOT cambiar ninguna duración (quedan en `.2s`).
- Do NOT cambiar los valores de `transform`/`opacity` de `.toast.show` ni `.drawer.open` — solo la curva de las 3 declaraciones `transition`.
- Do NOT tocar `app.js` ni el bloque `prefers-reduced-motion` existente (`styles.css:3949+`) — ya cubre `.drawer` correctamente (deja el fade, saca el transform) y no depende de qué curva se usa.
- Si los bloques citados no coinciden con el archivo (cambió desde `6438fd1`), STOP y reportar.

## Verification

- **Mechanical**: sin build local — probar en `npm run dev` o preview de Vercel.
- **Feel check**:
  - Disparar un toast (ej. guardar un cambio): debe sentirse igual de rápido pero con el mismo "freno" al llegar que tiene el modal de tema al abrir — no debe sentirse mecánico/lineal.
  - Abrir el detalle de un expediente (drawer): comparar la sensación de apertura contra `dialog#modalTask` — deberían sentirse de la misma familia.
  - En DevTools → Animations, bajar el playback a 10% en ambos y confirmar que la curva ya no es la `ease` por defecto del navegador (se nota un arranque más rápido y una llegada más suave).
- **Done when**: toast y drawer usan `var(--ease-out)` en sus 3 transiciones, sin cambios visibles de duración ni de qué se anima.
