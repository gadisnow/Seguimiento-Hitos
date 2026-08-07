# Plans — animaciones

Auditoría base: modal de detalle de tema (`dialog#modalTask`) y transiciones del tablero/pizarras, sobre el commit `b00eb3f`.

| # | Título | Severidad | Status |
| --- | --- | --- | --- |
| 001 | [Animar apertura/cierre de dialog#modalTask](001-modal-tema-entrada-salida.md) | HIGH | DONE |
| 002 | [Animar el selector de pizarras (#pizarraSwitcher)](002-cambio-pizarra-transicion.md) | HIGH | DONE |
| 003 | [Rama prefers-reduced-motion](003-reduced-motion-global.md) | MEDIUM | DONE |
| 004 | [Fade al cambiar de tab en el modal de tema](004-tabs-modal-tema-crossfade.md) | LOW-MEDIUM | DONE |
| 005 | [Transiciones en .task-tab y press feedback en .task-modal-close](005-task-tab-close-feedback.md) | LOW | DONE |
| 006 | [Entrada animada para kcard-menu y board-menu](006-menus-contextuales-entrada.md) | LOW | DONE |

## Orden de ejecución

**Lote 1** (commit `4a43c19`):
1. **001** primero — crea el token `--ease-out` que reutilizan el resto de los planes.
2. **002** — reusa el token de 001, independiente en el resto.
3. **003** — depende de que 001 y 002 ya existan en el CSS (neutraliza el `transform` que ambos introducen).

**Lote 2** (retoques CSS chicos, todos independientes entre sí y de 001/002, solo reusan `--ease-out`):
4. **004**, **005**, **006** — sin dependencias entre ellos, se pueden aplicar en cualquier orden.

## Pendientes (lote 3, no planificado todavía)

- Tarjetas/columnas del tablero teletransportan al reordenar (`renderAgenda()` hace `innerHTML=` completo) — recomendado empezar con un highlight liviano antes de un FLIP completo. Mayor esfuerzo (requiere cambios en JS, no solo CSS) — plan aparte cuando se decida encararlo.
