# Plans — animaciones

Auditoría base: modal de detalle de tema (`dialog#modalTask`) y transiciones del tablero/pizarras, sobre el commit `b00eb3f`.
Segunda auditoría (planes 008-010): recorrido completo de `styles.css`/`app.js` contra las 8 categorías de `AUDIT.md`, sobre el commit `6438fd1`.

| # | Título | Severidad | Status |
| --- | --- | --- | --- |
| 001 | [Animar apertura/cierre de dialog#modalTask](001-modal-tema-entrada-salida.md) | HIGH | DONE |
| 002 | [Animar el selector de pizarras (#pizarraSwitcher)](002-cambio-pizarra-transicion.md) | HIGH | DONE |
| 003 | [Rama prefers-reduced-motion](003-reduced-motion-global.md) | MEDIUM | DONE |
| 004 | [Fade al cambiar de tab en el modal de tema](004-tabs-modal-tema-crossfade.md) | LOW-MEDIUM | DONE |
| 005 | [Transiciones en .task-tab y press feedback en .task-modal-close](005-task-tab-close-feedback.md) | LOW | DONE |
| 006 | [Entrada animada para kcard-menu y board-menu](006-menus-contextuales-entrada.md) | LOW | DONE |
| 007 | [Highlight en la tarjeta que cambió de columna](007-highlight-tarjeta-movida.md) | MEDIUM-HIGH (alcance reducido) | DONE |
| 008 | [Feedback de presión (:active) sin transición en 6 elementos](008-press-feedback-transiciones.md) | MEDIUM | DONE |
| 009 | [Migrar toast y drawer al token --ease-out](009-toast-drawer-ease-token.md) | MEDIUM | DONE |
| 010 | [Entrada animada para user-menu, split-menu y resp-dropdown-panel](010-dropdowns-entrada-animada.md) | MEDIUM | DONE |

> Nota de proceso: los planes 001-007 tienen el header `Status: TODO` desactualizado dentro de cada archivo individual (quedó así al ejecutarlos, nunca se actualizó) — la tabla de arriba es la fuente de verdad real, confirmada contra el código actual y contra que los commits `b00eb3f`/`4a43c19`/`a6a72cf` son ancestros de HEAD.

## Orden de ejecución

**Lote 1** (commit `4a43c19`):
1. **001** primero — crea el token `--ease-out` que reutilizan el resto de los planes.
2. **002** — reusa el token de 001, independiente en el resto.
3. **003** — depende de que 001 y 002 ya existan en el CSS (neutraliza el `transform` que ambos introducen).

**Lote 2** (commit `a6a72cf`, retoques CSS chicos, todos independientes entre sí y de 001/002, solo reusan `--ease-out`):
4. **004**, **005**, **006** — sin dependencias entre ellos, se pueden aplicar en cualquier orden.

**Lote 3** (drag & drop del tablero, reusa `--ease-out`):
5. **007** — versión liviana (highlight, no FLIP completo) del problema de que las tarjetas "teletransportan" al soltarlas en una columna nueva. Un FLIP real (animar con `transform` la distancia entre la posición antes/después) queda pendiente como trabajo futuro si se decide encararlo — es una refactor mayor de `renderAgenda()`, no un plan de animación acotado.

**Lote 4** (segunda auditoría, commit `6438fd1`, todos independientes entre sí, solo reusan `--ease-out` y — 010 — el keyframe `contextMenuIn` del plan 006):
6. **008**, **009**, **010** — sin dependencias entre ellos ni con los lotes anteriores, se pueden aplicar en cualquier orden.

Durante esta segunda auditoría se re-descubrieron dos "findings" que en realidad ya eran decisiones deliberadas de los planes 006 y 007 (duración de `kcardLanded`, origen de los menús contextuales) — se descartaron sin generar plan nuevo, ver `AUDIT.md` regla "no re-litigar decisiones ya tomadas".
