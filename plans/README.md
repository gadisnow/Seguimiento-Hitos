# Plans — animaciones

Auditoría base: modal de detalle de tema (`dialog#modalTask`) y transiciones del tablero/pizarras, sobre el commit `b00eb3f`.

| # | Título | Severidad | Status |
| --- | --- | --- | --- |
| 001 | [Animar apertura/cierre de dialog#modalTask](001-modal-tema-entrada-salida.md) | HIGH | DONE |
| 002 | [Animar el selector de pizarras (#pizarraSwitcher)](002-cambio-pizarra-transicion.md) | HIGH | DONE |
| 003 | [Rama prefers-reduced-motion](003-reduced-motion-global.md) | MEDIUM | DONE |

## Orden de ejecución

1. **001** primero — crea el token `--ease-out` que reutilizan 002 y 003.
2. **002** — reusa el token de 001, independiente en el resto.
3. **003** — depende de que 001 y 002 ya existan en el CSS (neutraliza el `transform` que ambos introducen).

## Pendientes (no planificados todavía — lote 2 y 3, ver conversación)

- Tabs del modal de tema sin crossfade al cambiar de pane (`.task-pane`).
- `.task-tab` sin transición de color/borde.
- `.task-modal-close` sin transición ni press feedback.
- Menús contextuales `kcard-menu` / `board-menu` sin entrada animada ni transform-origin al trigger.
- Tarjetas/columnas del tablero teletransportan al reordenar (`renderAgenda()` hace `innerHTML=` completo) — recomendado empezar con un highlight liviano antes de un FLIP completo.
