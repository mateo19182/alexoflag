# ◇

Instrumento web para diseñar banderas. Funciona por completo en el navegador.

## Abrir

```sh
npm run dev
```

Visita `http://localhost:4175`. No hay dependencias que instalar.

## Uso

- Añade y combina 17 tipos de capas. Selecciona una capa en la lista o en la bandera.
- Arrastra para mover. Usa el punto superior para girar y el inferior derecho para cambiar de tamaño.
- Ajusta los mandos arrastrando hacia arriba o abajo. Doble clic o doble toque devuelve un mando a su valor inicial. Los glifos eligen la forma y el formato. Reordena, oculta, duplica y elimina capas.
- Los discos de color funcionan como joysticks: el ángulo cambia el tono y la distancia al centro cambia la saturación. La barra inferior regula la luminosidad. Funcionan con ratón, tacto o teclado.
- En pantallas estrechas, cambia entre los seis bancos de controles con la fila de iconos. La lista de capas se recorre por páginas.
- Cada capa puede combinar trama geométrica, desenfoque, distorsión y eco. La trama admite círculos, cuadrados, rombos y barras, con tamaño e intensidad propios. El color puede pasar a gris o blanco y negro.
- En el banco de efectos, arrastra un cable desde la salida de la capa hasta un efecto. Arrastra un conector ocupado a otro para mover la intensidad, o suéltalo fuera para desconectarlo. Toca un conector para activarlo o desactivarlo. Los mandos afinan cada intensidad.
- El banco LFO / ∿ tiene dos osciladores. La animación empieza pausada; el botón de reproducción junto a la bandera la activa. Elige una onda con los glifos y ajusta velocidad y fase. Arrastra la salida A o B a un conector de la capa seleccionada para animar geometría, tono o efectos. Toca un conector ocupado para elegir su cable y ajustar la profundidad. Vuelve a tocarlo, o suelta el cable fuera, para desconectarlo. El osciloscopio dibuja ambas ondas.
- Reproduce o pausa junto a la bandera. La barra busca un instante de la animación. Doble clic o doble toque reinicia los mandos del oscilador y la profundidad.
- La variación de capa y de bandera también cambia los efectos. Todo se conserva en SVG, PNG y enlaces compartidos.
- Exporta el fotograma visible en SVG o PNG, o graba seis segundos en WebM. Compartir copia una URL con la bandera y sus conexiones de animación. Los enlaces animados también se abren pausados.
- El documento se guarda también en el almacenamiento local del navegador.

Atajos: `Ctrl/Cmd+Z` deshace, `Ctrl/Cmd+Shift+Z` rehace, `Ctrl/Cmd+D` duplica y `Supr` elimina la capa elegida.

## Imágenes

El botón Images abre 40 símbolos independientes con búsqueda por nombre, categorías y páginas de doce. Incluye animales, plantas, soles, lunas, armas y figuras heráldicas. Los escudos nacionales, mapas y emblemas completos quedan fuera del selector. Los símbolos se insertan con un solo color editable; Tint permite recuperar el dibujo original. Replace cambia el símbolo o carga una imagen. Mirror refleja la capa y Repeat crea una cuadrícula de 1 a 5 elementos por lado. Todos admiten efectos y conexiones LFO. El menú de añadir capa separa Image / symbol de las formas geométricas.

Los SVG originales proceden de flag-icons, bajo licencia MIT. Las fuentes y la licencia se conservan en assets/charges/. Los PNG transparentes de los emblemas tienen hasta 384 o 512 píxeles y se cargan sólo al utilizarlos. Los enlaces compartidos guardan el identificador de cada emblema; las exportaciones incluyen la imagen completa.

Upload acepta PNG, JPG, WEBP y SVG de hasta 15 MB. El navegador convierte la imagen a WEBP de hasta 384 píxeles por lado; se conserva la transparencia. Tint convierte sus píxeles visibles en una silueta del color elegido. Las imágenes se guardan localmente y se incluyen en exportaciones y enlaces. Los enlaces con imágenes pueden ser largos. No se envían archivos a un servidor.

### Azar y mutación

- `⤨` crea una composición de 2 a 6 capas. La mayoría combinan un campo amplio y un símbolo con tamaños y posiciones variables; una cuarta parte usa composiciones más libres. Los emblemas aparecen en aproximadamente el 80% de las banderas y conservan sus proporciones y orientación.
- `✧✧` modifica suavemente las capas de la bandera actual. Conserva el fondo, formato, imágenes, orden y conexiones LFO.
- El cuadrado de cada fila bloquea esa capa frente a la mutación y al azar de capa `✧`. El bloqueo se guarda en los enlaces y admite deshacer.
- Las capas ocultas también quedan intactas al mutar. El botón de bandera nueva crea un documento nuevo.

## Publicar

Ejecuta `npm run build` antes de subir el proyecto y publica `index.html`, `style.css` y `src/` juntos. El comando actualiza las URLs de los scripts y del CSS con una versión basada en su contenido para evitar reutilizar archivos antiguos del navegador. Configura el servidor para revalidar `index.html` con `Cache-Control: no-cache`.
