# 002 — Animar el selector de pizarras (#pizarraSwitcher)

- **Status**: TODO
- **Commit**: b00eb3f
- **Severity**: HIGH
- **Category**: Purpose & frequency / Missed opportunity
- **Estimated scope**: 2 files (styles.css, app.js), CSS + 6 reemplazos mecánicos de `style.display` por `classList`; 1 línea en index.html

## Problem

`#pizarraSwitcher` (el selector "Tus pizarras", index.html:31-46) se muestra/oculta con `style.display` puro, sin transición, tanto al abrirlo desde "Cambiar pizarra" (mid-sesión) como al cerrarlo al elegir un tablero:

```html
<!-- index.html:31 — actual -->
<div class="login-screen" id="pizarraSwitcher" style="display:none">
```

```js
// app.js:485-501 — actual
async function enterPizarra(id) {
  localStorage.setItem(PIZARRA_LS_KEY, id);
  if (els.pizarraSwitcher) els.pizarraSwitcher.style.display = "none";
  showApp();
  const ok = await withBusy(() => reloadState(id));
  if (ok) authApi.touchLastAccess().catch(() => {});
}

async function showPizarraSwitcher() {
  const app = document.querySelector(".app");
  const ls = $("loginScreen");
  if (app) app.style.display = "none";
  if (ls) ls.style.display = "none";
  els.pizarraSwitcher.style.display = "grid";
  els.pizarraSwitcher.style.placeItems = "center";
  await renderPizarraSwitcherScreen();
}
```

`els.pizarraSwitcher.style.display` también se pone en `"none"` en `showLoginScreen()` (app.js:757), `showApp()` (app.js:766) y `showAccessNotice()` (app.js:776) — los 4 puntos de "ocultar" el switcher.

Referencia: `.drawer`/`.drawer-overlay` (styles.css:1241-1281) ya resuelve este mismo problema (panel fijo, centrado, que aparece/desaparece) con `opacity` + `visibility` + una clase `.open`, sin usar `style.display` desde JS.

## Target

CSS (agregar después del bloque `.login-screen` en styles.css:2958-2965, o inmediatamente antes — cualquier lugar cerca de las reglas de login está bien):

```css
/* target — nuevo bloque, styles.css cerca de .login-screen */
#pizarraSwitcher {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: opacity .2s var(--ease-out), visibility .2s var(--ease-out);
}
#pizarraSwitcher.open {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
}
#pizarraSwitcher .login-card {
  transform: scale(0.96);
  transition: transform .2s var(--ease-out);
}
#pizarraSwitcher.open .login-card {
  transform: scale(1);
}
```

index.html:31 — quitar el `style="display:none"` inline (el estado cerrado por default ahora lo da el CSS de arriba):

```html
<!-- target -->
<div class="login-screen" id="pizarraSwitcher">
```

app.js — reemplazar los 4 lugares que tocan `els.pizarraSwitcher.style.display` por `classList`:

```js
// enterPizarra() — app.js:487, target
if (els.pizarraSwitcher) els.pizarraSwitcher.classList.remove("open");

// showPizarraSwitcher() — app.js:498-499, target
els.pizarraSwitcher.classList.add("open");

// showLoginScreen() — app.js:757, target
if (els.pizarraSwitcher) els.pizarraSwitcher.classList.remove("open");

// showApp() — app.js:766, target
if (els.pizarraSwitcher) els.pizarraSwitcher.classList.remove("open");

// showAccessNotice() — app.js:776, target
if (els.pizarraSwitcher) els.pizarraSwitcher.classList.remove("open");
```

## Repo conventions to follow

- Reusar el token `--ease-out: cubic-bezier(0.23, 1, 0.32, 1);` creado por el plan 001 en el primer `:root` de styles.css:1. Si el plan 001 todavía no corrió, agregarlo acá — no crear un cubic-bezier distinto.
- Exemplar exacto a imitar: `.drawer` / `.drawer.open` (styles.css:1257-1281) — mismo mecanismo `opacity + visibility + pointer-events` con clase `.open`, mismo `.2s`.
- Duración 200ms, igual que `.drawer` y que el plan 001 (modal de tema) — ambos son "el panel de detalle aparece/desaparece" y deben sentirse parte del mismo sistema.

## Steps

1. En `styles.css:1`, confirmar que existe `--ease-out` en el `:root` (agregado por plan 001; si no está, agregarlo acá).
2. Agregar el bloque CSS "Target" de `#pizarraSwitcher` cerca de `.login-screen` (styles.css:2958).
3. En `index.html:31`, quitar `style="display:none"` del `<div class="login-screen" id="pizarraSwitcher">`.
4. En `app.js`, aplicar los 4 reemplazos de `style.display` → `classList` listados arriba, en `enterPizarra`, `showPizarraSwitcher`, `showLoginScreen`, `showApp`, `showAccessNotice` (5 funciones, 4 son "cerrar" + 1 es "abrir").

## Boundaries

- Do NOT tocar `#loginScreen` (pantalla de login real) ni `.app` — sus propios `style.display` quedan igual. Solo `#pizarraSwitcher` cambia de mecanismo.
- Do NOT animar `.app` ni el contenido del tablero que aparece detrás — eso queda fuera de este plan (mayor riesgo, afecta también el flujo de login inicial). Si se quiere en el futuro, es un plan aparte.
- Do NOT remover o renombrar `PIZARRA_LS_KEY`, `enterPizarra`, ni cambiar el orden de las llamadas a `reloadState`/`showApp` — solo se toca la línea de `style.display`/`classList` en cada función.
- Si alguna de las 5 funciones no tiene exactamente la línea citada (el archivo cambió desde `b00eb3f`), STOP y reportar.

## Verification

- **Mechanical**: sin build local disponible — probar en `npm run dev` o preview de Vercel.
- **Feel check**:
  - Desde el menú de usuario, "Cambiar pizarra": el selector debe hacer fade-in del fondo + scale-in de la tarjeta blanca, no aparecer de golpe.
  - Elegir una pizarra de la lista: el selector debe hacer fade-out antes de que se vea el tablero.
  - Flujo de login inicial (primera vez, sin `lastId` guardado): el selector debe seguir apareciendo igual de animado la primera vez que se muestra.
  - Cerrar sesión desde el selector (`pizarraSwitcherLogout`) y loguear de nuevo: no debe quedar el switcher visible a medias ni con `opacity` trabada en 0.5 (revisar que `classList.remove("open")` corra en todos los caminos de salida).
  - En DevTools, togglear `prefers-reduced-motion` (ver plan 003) y confirmar que el fade de opacidad se mantiene pero el `scale` de la tarjeta desaparece.
- **Done when**: entrar y salir del selector de pizarras (inicial y mid-sesión) se siente como un panel que aparece/desaparece, igual que el modal de tema (plan 001) y el drawer de expediente; no quedan casos donde el switcher se trabe visible u oculto a medias.
