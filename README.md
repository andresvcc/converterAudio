# converterAudio

Conversor sencillo de FLAC a AIFF con CLI y GUI (Tkinter).

## Requisitos
- Python 3.8+
- ffmpeg/ffprobe en el PATH para conversión a 16 bits / 44.1 kHz (necesario para CD).
- (flac solo no sirve para forzar 16/44.1, se requiere ffmpeg)
- Se incluye un `bin/ffmpeg` y `bin/ffprobe` (build estático Linux x86_64) para uso en Docker/servidor.
- Para la GUI se necesita Tkinter. En macOS con Homebrew:
  - `brew install python-tk@3.12`
  - O instala Python desde python.org (ya incluye Tk).

## Uso rápido
CLI:
```bash
python3 converter.py ruta/al/archivo.flac -o carpeta_salida
python3 converter.py carpeta_con_flacs/ -o carpeta_salida
```
GUI:
```bash
python3 converter.py --gui
```
Si no pasas argumentos y Tkinter está disponible, abrirá la GUI por defecto.

### Doble clic (macOS / Linux)
- Usa `EjecutarConverter.command` (ya es ejecutable). Al hacer doble clic se abrirá la GUI.
  - Si el sistema advierte que viene de Internet, pulsa “Abrir”.
  - Debes tener `python3` accesible en el PATH.
  - Si aparece un mensaje sobre Tkinter no disponible, instala Tk según los requisitos.
  - Recuerda tener `ffmpeg` instalado para la conversión 16/44.1.\n

### App para macOS
- Se agregó `ConverterAudio.app` (carpeta). Puedes abrirla con doble clic; busca un Python con Tkinter en rutas habituales (`/opt/homebrew/bin/python3`, `/usr/local/bin/python3`, `/usr/bin/python3`, `python3`).
- Si no encuentra Tkinter mostrará un aviso y sugerirá `brew install python-tk@3.12` o instalar Python desde python.org.
- Puedes mover la carpeta `.app` a `/Applications` si lo prefieres.

## Qué hace
- Detecta bit depth con ffprobe y escoge un códec AIFF PCM equivalente.
- Copia metadatos básicos con ffmpeg (`-map_metadata 0`).
- Fallback automático a `flac --force-aiff-format` si no hay ffmpeg.

## Notas
- La salida conserva la misma carpeta del archivo salvo que indiques `-o`.
- En GUI puedes añadir archivos o una carpeta completa y elegir carpeta de salida.

## Versión web (Node + Express)
Requiere tener `ffmpeg` instalados en el servidor (o usar el binario incluido en `bin/`).

1. Instala dependencias:
```bash
npm install
```
2. Ejecuta el servidor:
```bash
npm run dev
```
   Se levanta en `http://localhost:3000`.
3. Abre el navegador, sube un .flac y descarga el .aiff resultante.

Notas:
- API en `server.js`:
  - `POST /convert` convierte un archivo y devuelve AIFF (16 bits / 44.1 kHz).
  - `POST /convert-multi` acepta varios archivos y devuelve un ZIP con todos los AIFF (requiere ffmpeg).
- Frontend en `public/index.html`: permite cargar varios FLAC, verlos en tabla y convertir
  - Individualmente (descarga cada AIFF)
  - Todos juntos (ZIP)
- Los archivos temporales se guardan en el directorio temp del sistema y se limpian al finalizar la respuesta.
- Para CD el servidor fuerza salida 16 bits / 44.1 kHz. Si solo hay `flac`, la API responderá error: instala `ffmpeg`.

### Ejecutar en Docker
```bash
docker build --platform=linux/amd64 -t converter-audio .
docker run --rm -p 3000:3000 converter-audio
```
Abre `http://localhost:3000`.
La imagen ya incluye los binarios `bin/ffmpeg` y `bin/ffprobe` copiados del repo, por lo que no necesitas instalar nada en el host (solo Docker).
En Macs Apple Silicon usa el flag `--platform=linux/amd64` para que coincida con el binario incluido.
