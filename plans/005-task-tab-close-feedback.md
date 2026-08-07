# 005 — Transiciones en .task-tab y press feedback en .task-modal-close

- **Status**: TODO
- **Commit**: 4a43c19
- **Severity**: LOW
- **Category**: Easing & duration / Physicality
- **Estimated scope**: 1 file (styles.css), CSS only, ~4 líneas

## Problem

Dos elementos del header/tabs del modal de tema cambian de estado en seco, sin transición:

```css
/* styles.css:2575-2579 — actual */
.task-modal-close {
  background: transparent; border: 0; font-size: 16px; color: var(--muted); cursor: pointer;
  line-height: 1; padding: 4px;
}
.task-modal-close:hover { color: var(--text); }
```

```css
/* styles.css:2590-2595 — actual */
.task-tab {
  border: 0; border-radius: 0; background: transparent; padding: 10px 14px; font-size: 13px; font-weight: 500;
  color: var(--muted); border-bottom: 2px solid transparent; cursor: pointer;
}
.task-tab:hover { color: var(--text); }
.task-tab.active { color: var(--primary); border-bottom-color: var(--primary); }
```

`.task-modal-close` es además un botón pulsable (cierra el modal) sin ningún press feedback (`:active`).

## Target

```css
/* target — styles.css:2575-2579 */
.task-modal-close {
  background: transparent; border: 0; font-size: 16px; color: var(--muted); cursor: pointer;
  line-height: 1; padding: 4px;
  transition: color .15s ease, transform .1s ease-out;
}
.task-modal-close:hover { color: var(--text); }
.task-modal-close:active { transform: scale(0.92); }
```

```css
/* target — styles.css:2590-2595 */
.task-tab {
  border: 0; border-radius: 0; background: transparent; padding: 10px 14px; font-size: 13px; font-weight: 500;
  color: var(--muted); border-bottom: 2px solid transparent; cursor: pointer;
  transition: color .15s ease, border-bottom-color .15s ease;
}
.task-tab:hover { color: var(--text); }
.task-tab.active { color: var(--primary); border-bottom-color: var(--primary); }
```

## Repo conventions to follow

- Duración y curva: `ease` simple a 150ms, igual que el resto de los hovers de color del proyecto (p.ej. `.kcard-menu-item:hover`-adjacent patterns, `.resp-card { transition: box-shadow .15s; }` en styles.css). Esto NO necesita `--ease-out` (ese token es para entradas/salidas de paneles, no para cambios de color en hover) — usar `ease` como en el resto del repo.
- Press feedback: `transform: scale(0.92)` en vez del `scale(0.97)` que sugiere AUDIT.md para botones grandes — este es un ícono chico (16px, padding 4px), un scale más notorio (0.92) se percibe mejor en elementos pequeños sin llegar a exagerar. Duración 100ms con `ease-out` (feedback de press: 100-160ms según AUDIT.md).
- Exemplar ya existente en el repo: `.col-resize-handle::after { transition: background .12s; }` (styles.css) — mismo patrón de transición corta y simple para feedback de UI.

## Steps

1. En `styles.css:2575-2579`, agregar la línea `transition: color .15s ease, transform .1s ease-out;` al selector `.task-modal-close`, y agregar la nueva regla `.task-modal-close:active { transform: scale(0.92); }` justo después de `.task-modal-close:hover`.
2. En `styles.css:2590-2595`, agregar la línea `transition: color .15s ease, border-bottom-color .15s ease;` al selector `.task-tab`.

## Boundaries

- Do NOT tocar `.task-tab-add` ni `.task-tab.active` — quedan igual (el cambio de color al activarse una tab hereda la transición nueva de `.task-tab` automáticamente, no hace falta tocar `.active`).
- Do NOT agregar press feedback a `.task-tab` — son tabs, no botones de acción; el feedback de click ya lo da el cambio de color/borde.
- Si los bloques citados no coinciden con `styles.css:2575-2579` / `2590-2595` (el archivo cambió desde `4a43c19`), STOP y reportar.

## Verification

- **Mechanical**: sin build local — probar en `npm run dev` o preview de Vercel.
- **Feel check**:
  - Hacer hover sobre el botón "✕" del modal de tema: el color debe transicionar suave, no saltar.
  - Clickear el botón "✕" (mantener presionado un instante si es posible con el mouse): debe verse un achique sutil antes de soltar.
  - Hacer hover y click entre las tabs del modal: el color y el subrayado (`border-bottom-color`) deben transicionar juntos, sin que uno cambie antes que el otro.
- **Done when**: hover y click en el botón de cerrar y en las tabs se sienten con feedback inmediato pero suave, sin cortes.
