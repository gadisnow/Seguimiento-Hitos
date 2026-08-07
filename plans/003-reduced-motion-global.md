# 003 — Rama prefers-reduced-motion para el modal de tema y el selector de pizarras

- **Status**: TODO
- **Commit**: b00eb3f
- **Severity**: MEDIUM
- **Category**: Accessibility
- **Estimated scope**: 1 file (styles.css), ~20 líneas, depende de 001 y 002

## Problem

No existe ningún `@media (prefers-reduced-motion: reduce)` en `styles.css` — búsqueda completa sobre el archivo no encontró coincidencias. Esto ya era cierto antes de este lote de trabajo (nada en el repo respetaba la preferencia), pero se vuelve más relevante ahora porque los planes 001 y 002 agregan movimiento nuevo (`scale` + `opacity`) al modal de tema y al selector de pizarras.

Reduced motion significa animaciones más suaves y menos, **no cero** — hay que conservar el fade de opacidad (ayuda a entender que algo apareció/desapareció) y eliminar el `scale`/`transform` (el movimiento en sí).

## Target

Agregar al final de `styles.css` (o inmediatamente después de los bloques de los planes 001/002) un único bloque `@media` que neutraliza el `transform` de ambos elementos, dejando vivo el fade de `opacity`:

```css
/* target — nuevo bloque, al final de styles.css */
@media (prefers-reduced-motion: reduce) {
  dialog#modalTask,
  dialog#modalTask:not([open]) {
    transform: none;
  }
  dialog#modalTask {
    transition: opacity .2s ease,
                overlay .2s ease allow-discrete,
                display .2s ease allow-discrete;
  }
  @starting-style {
    dialog#modalTask[open] { transform: none; }
  }

  #pizarraSwitcher .login-card,
  #pizarraSwitcher.open .login-card {
    transform: none;
  }
}
```

Esto deja: el modal de tema y el selector de pizarras siguen haciendo fade de opacidad (útil, no jarring), pero no escalan — sin movimiento de posición/tamaño para quien pidió reduced motion.

## Repo conventions to follow

- Es el primer `@media (prefers-reduced-motion...)` del repo — no hay convención previa que imitar. Colocarlo al final de `styles.css` como bloque único y comentado (`/* ============== Reduced motion ============== */`) para que sea fácil de encontrar y extender cuando se agreguen más animaciones al proyecto.
- No usar un ease-token nuevo acá — `ease` simple está bien para la rama reducida (es solo opacidad, no hay curva "fuerte" que defender).

## Steps

1. Confirmar que los planes 001 y 002 ya corrieron (este plan depende de que `dialog#modalTask` y `#pizarraSwitcher.open .login-card` existan tal como quedaron ahí — si no, STOP).
2. Agregar el bloque `@media (prefers-reduced-motion: reduce) { ... }` de arriba al final de `styles.css`, con el comentario de sección.

## Boundaries

- Do NOT tocar ningún otro selector fuera de `dialog#modalTask` y `#pizarraSwitcher .login-card` — este plan es acotado a lo que 001/002 introdujeron, no una auditoría de accesibilidad completa del resto del proyecto.
- Do NOT eliminar el fade de opacidad en modo reduced-motion — solo el `transform`.
- Si `dialog#modalTask` o `#pizarraSwitcher.open .login-card` no existen en el CSS al momento de aplicar este plan (porque 001/002 no corrieron o cambiaron de forma distinta a la documentada), STOP y reportar.

## Verification

- **Mechanical**: sin build local disponible.
- **Feel check**: en Chrome DevTools → Rendering panel → "Emulate CSS media feature prefers-reduced-motion: reduce":
  - Abrir el modal de tema: debe seguir haciendo fade de opacidad, sin el "pop" de escala.
  - Abrir el selector de pizarras: la tarjeta blanca no debe escalar, solo aparecer/desaparecer con el fade de fondo.
  - Sin la emulación activada (comportamiento normal), ambos elementos deben seguir animando exactamente como en los planes 001/002 — este plan no debe cambiar nada visible por default.
- **Done when**: con `prefers-reduced-motion: reduce` activo, ni el modal de tema ni el selector de pizarras muestran movimiento de escala, pero ambos conservan el fade de opacidad.
