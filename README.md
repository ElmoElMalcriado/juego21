# Eclise 21 · Blackjack con cuenta de Google

Juego de blackjack (21) con fichas animadas. Cada jugador entra con su cuenta de Google, tiene un ID propio y un panel de administrador permite recargarle fichas. Las fichas son virtuales, sin dinero real.

## Archivos
```
index.html   página del juego
style.css    diseño
config.js    aquí pegas los datos de Supabase
app.js       lógica del juego, cuentas y panel admin
online.js    modo en línea (mesa para jugar con otras personas)
setup.sql    base de datos y seguridad (se ejecuta una vez en Supabase)
```

## Puesta en marcha

### 1. Supabase (base de datos y login)
1. Crea un proyecto gratis en https://supabase.com.
2. Abre **SQL Editor**, pega `setup.sql`, cambia `TU_CORREO@gmail.com` por **tu correo de Google** (será el administrador) y pulsa **Run**.
3. En **Project Settings → API** copia la *Project URL* y la clave *anon public* y pégalas en `config.js`.

### 2. Login con Google
1. En https://console.cloud.google.com crea un proyecto → **APIs y servicios → Credenciales → Crear credenciales → ID de cliente de OAuth** (tipo *Aplicación web*). Antes te pedirá configurar la pantalla de consentimiento (tipo *Externo*, solo nombre y correo).
2. En *URI de redireccionamiento autorizados* pon: `https://TU_PROYECTO.supabase.co/auth/v1/callback` (Supabase te la muestra en **Authentication → Providers → Google**).
3. Copia el *Client ID* y el *Client Secret* en Supabase, en **Authentication → Providers → Google**, y activa el proveedor.

### 3. Publicar en GitHub Pages
1. Crea un repositorio **público** en GitHub. Pulsa *Add file → Upload files*, arrastra **los archivos** (no el .zip ni una carpeta) y pulsa *Commit changes*. Los archivos deben quedar en la raíz del repositorio, junto a `index.html`.
2. En el repositorio: **Settings → Pages → Branch: main / (root) → Save**.
3. Tu juego quedará en `https://TU_USUARIO.github.io/TU_REPO/`.
4. En Supabase, **Authentication → URL Configuration**: pon esa dirección en *Site URL* y agrega `https://TU_USUARIO.github.io/TU_REPO/**` en *Redirect URLs*.

## Uso
- **Jugadores:** abren el enlace, pulsan *Entrar con Google* y ven su **ID** arriba. Se lo dan al administrador para que les recargue.
- **Administrador:** entra con el correo que pusiste en el SQL y pulsa la tecla **A** para abrir el panel. Ahí busca al jugador por ID, nombre o correo y le da o quita fichas. Con **Esc** se cierra.
- **Teclas:** `Enter` reparte y empieza una nueva mano.

## Jugar en línea con otra persona
1. Ambos entran con Google y pulsan **"👥 Jugar en línea"**, abajo de la mesa.
2. Uno pulsa **Crear mesa** y comparte el código de 6 letras que aparece arriba. El otro lo escribe en **Unirme**.
3. Pueden jugar hasta 4 personas en la misma mesa. Cada uno apuesta con sus fichas; el anfitrión (quien creó la mesa) pulsa **Repartir** y se juega por turnos contra el crupier.
4. Al terminar la ronda, el anfitrión pulsa **Nueva ronda**. Si el anfitrión sale, la mesa se cierra.
No hace falta configurar nada más en Supabase: usa Realtime, que viene activo.

## Seguridad
- Nadie puede cambiarse las fichas directamente: solo el administrador puede recargar, mediante funciones protegidas en la base de datos.
- Las cartas se reparten en el navegador del jugador. Para fichas de juego es suficiente; con dinero real habría que mover la lógica al servidor.

## Autor y derechos
Creado por **Elmo El Malcriado**.
© 2026 Elmo El Malcriado · Todos los derechos reservados. Ver el archivo `LICENSE`.
