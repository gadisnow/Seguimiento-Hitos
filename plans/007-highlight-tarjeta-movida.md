# 007 — Highlight en la tarjeta que cambió de columna (versión liviana del FLIP)

- **Status**: TODO
- **Commit**: a6a72cf
- **Severity**: MEDIUM-HIGH (alcance reducido a propósito — ver "Problem")
- **Category**: Missed opportunity / Performance
- **Estimated scope**: 2 files (styles.css, app.js), ~14 líneas nuevas, sin dependencias de los planes 001-006 salvo el token `--ease-out`

## Problem

`renderAgenda()` (app.js:1341-1387) reconstruye **todo** `.kanban` con `innerHTML =` en cada mutación. El drag & drop de una tarjeta entre columnas ya se ve bien *durante* el arrastre (el `dragover` mueve el nodo real vía `insertBefore`/`appendChild`, app.js:1394-1402/1414-1421) — el problema es lo que pasa **al soltar**:

```js
// app.js:1422-1445 — actual
col.addEventListener("drop", async () => {
  if (!dragId) return;
  const id = dragId; dragId = "";
  const tema = state.temas.find((t) => t.id === id);
  const nuevoEstado = col.dataset.estado;
  const nuevaColumna = state.columnas.find((c) => c.nombre === nuevoEstado);
  const orderedIds = Array.from(col.querySelectorAll(".kcard")).map((c) => c.dataset.id);
  await withBusy(async () => {
    if (tema && tema.estado !== nuevoEstado && nuevaColumna) {
      let extra = {};
      if (nuevoEstado === "Cerrado") {
        extra = { fecha_cierre: fmtDate(new Date()), cerrado_por: activeUserName() };
      } else if (tema.estado === "Cerrado") {
        extra = { fecha_cierre: null, cerrado_por: null };
      }
      await dataApi.updateTemaColumna(id, nuevaColumna.id, extra);
      await dataApi.logActivity(id, `Cambio a ${nuevoEstado}`);
    }
    await dataApi.reorderTemas(orderedIds);
    await reloadState();
  });
});
```

`reloadState()` hace `renderAll()` → `renderAgenda()` → reemplaza el HTML de **las 5+ columnas enteras**, no solo la tarjeta movida. La tarjeta que el usuario acaba de soltar (que ya estaba visualmente en el lugar correcto por el drag nativo) queda indistinguible de las demás — el board entero se resetea en silencio y no hay ninguna señal de "esto se guardó acá".

**Por qué la versión liviana y no un FLIP completo**: un FLIP real requeriría capturar `getBoundingClientRect()` de cada tarjeta antes del re-render y comparar contra la posición después, para animar con `transform` la diferencia — eso implica reescribir `renderAgenda()` para no destruir/recrear nodos (o hacer un diff manual), que es un cambio de arquitectura mucho más grande que el resto de este lote. Este plan resuelve el 80% del problema de percepción (confirmar visualmente dónde aterrizó la tarjeta) con una animación acotada a un solo elemento, sin tocar `renderAgenda()`.

## Target

CSS — nueva regla cerca de `.kcard.dragging` (styles.css:783):

```css
/* target — agregar despues de styles.css:783 (.kcard.dragging { opacity: 0.4; }) */
.kcard.landed {
  animation: kcardLanded .5s var(--ease-out);
}
@keyframes kcardLanded {
  from { box-shadow: 0 0 0 2px var(--primary); }
  to   { box-shadow: 0 1px 2px rgba(15,23,42,0.04); }
}
```

JS — en el `drop` handler, después de que `reloadState()` termine de reconstruir el DOM, ubicar la tarjeta por `data-id` y agregarle la clase (se limpia sola: la `animation` no es infinita, y no hace falta remover la clase a mano porque la tarjeta entera se vuelve a crear en el próximo `renderAgenda()`):

```js
// target — app.js, dentro del "drop" handler, reemplaza la linea `await reloadState();` de app.js:1443
await reloadState();
const landedCard = els.agendaKanban.querySelector(`.kcard[data-id="${id}"]`);
if (landedCard) landedCard.classList.add("landed");
```

## Repo conventions to follow

- Reusar `--ease-out` (plan 001, `:root` en styles.css:21) — no crear una curva nueva.
- Duración 500ms: es una señal de confirmación puntual (una vez por drop), no un elemento de alta frecuencia como los menús del plan 006 (120ms) — se ubica en el extremo superior del rango "Modals, drawers: 200-500ms" de AUDIT.md porque cumple una función similar (confirmar un cambio de estado importante), aunque no sea un modal.
- Solo se anima `box-shadow` (no `background-color`) para que funcione igual en claro y oscuro sin necesitar un override `html[data-theme="dark"]` — mismo criterio que ya usa `.kcard:hover` (styles.css:781), que tampoco tiene override de tema.
- Exemplar de "no limpiar la clase a mano": no aplica un patrón nuevo — es consecuencia directa de que `renderAgenda()` ya recrea el nodo en cada `reloadState()` siguiente, así que la clase `landed` nunca sobrevive a la próxima mutación del tablero.

## Steps

1. En `styles.css`, después de la línea `.kcard.dragging { opacity: 0.4; }` (styles.css:783), agregar el bloque CSS "Target" de arriba (`.kcard.landed` + `@keyframes kcardLanded`).
2. En `app.js:1443`, reemplazar la línea `await reloadState();` (dentro del `drop` handler de `bindKanban`) por las 3 líneas del bloque "Target" de arriba.

## Boundaries

- Do NOT tocar `renderAgenda()` ni `bindKanban()` más allá de esa única línea — no es un FLIP, no hay que capturar rects.
- Do NOT aplicar este mismo highlight al reordenamiento de columnas (`reorderColumnas`, board-menu) ni a la creación de un tema nuevo — alcance limitado al `drop` de una tarjeta existente en el tablero.
- Do NOT animar `background-color`, `width`, `height` ni ninguna propiedad de layout — solo `box-shadow` (compuesta, no dispara reflow).
- Si `app.js:1422-1445` o `styles.css:783` no coinciden con los snippets de arriba (el archivo cambió desde `a6a72cf`), STOP y reportar.

## Verification

- **Mechanical**: sin build local — probar en `npm run dev` o preview de Vercel.
- **Feel check**:
  - Arrastrar una tarjeta de una columna a otra y soltarla: después de que el tablero se actualiza, la tarjeta debe mostrar un anillo naranja que se desvanece en ~500ms — una señal clara de "esto se guardó acá".
  - Reordenar una tarjeta dentro de la misma columna (sin cambiar de estado): también debe recibir el highlight (el plan no distingue "cambio de columna" de "reorden interno" — cualquier drop exitoso lo dispara, que es el comportamiento esperado ya que `reorderTemas` corre en ambos casos).
  - Soltar la tarjeta y de inmediato hacer otra acción (abrir el modal de tema haciendo click): no debe haber errores en consola ni la tarjeta debe quedar con un anillo trabado.
  - Con la red lenta (throttle en DevTools), confirmar que el highlight aparece recién cuando el drop realmente terminó de persistir (no antes) — es dentro de `withBusy`, así que ya está cubierto por el loader existente.
- **Done when**: soltar una tarjeta en el tablero deja una señal visual breve de dónde aterrizó, sin regresiones de performance ni de layout.
