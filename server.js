import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import express from 'express';
import multer from 'multer';
import cors from 'cors';
import archiver from 'archiver';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

const upload = multer({ dest: path.join(os.tmpdir(), 'conv-upload') });

function which(cmd) {
  const extra = [path.join(__dirname, 'bin')];
  const paths = [...extra, ...process.env.PATH.split(path.delimiter)];
  for (const p of paths) {
    const candidate = path.join(p, cmd);
    try {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        return candidate;
      }
    } catch {
      // ignore invalid paths
    }
  }
  return null;
}

function pickTool() {
  const ffmpeg = which('ffmpeg');
  const flac = which('flac');
  if (ffmpeg) return { tool: 'ffmpeg', path: ffmpeg };
  if (flac) return { tool: 'flac', path: flac };
  return null;
}

// Single-file conversion
app.post('/convert', upload.single('file'), (req, res) => {
  const tool = pickTool();
  if (!tool) {
    fs.unlink(req.file.path, () => {});
    return res.status(500).json({ error: 'No se encontró ffmpeg ni flac en el PATH del servidor.' });
  }

  const src = req.file.path;
  const dst = path.join(os.tmpdir(), `${path.parse(req.file.originalname).name}-${Date.now()}.aiff`);

  const onFinish = (code, signal) => {
    fs.unlink(src, () => {});
    if (code !== 0) {
      fs.unlink(dst, () => {});
      return res.status(500).json({ error: `Error al convertir (codigo ${code || signal})` });
    }
    res.setHeader('Content-Type', 'audio/aiff');
    res.setHeader('Content-Disposition', `attachment; filename="${path.parse(req.file.originalname).name}.aiff"`);
    const stream = fs.createReadStream(dst);
    stream.on('close', () => fs.unlink(dst, () => {}));
    stream.pipe(res);
  };

  if (tool.tool === 'ffmpeg') {
    // Force CD-compatible 44.1 kHz, 16-bit big-endian PCM
    const proc = spawn(tool.path, [
      '-y',
      '-i', src,
      '-ar', '44100',
      '-sample_fmt', 's16',
      '-map_metadata', '0',
      '-c:a', 'pcm_s16be',
      dst,
    ]);
    proc.on('close', onFinish);
  } else {
    fs.unlink(src, () => {});
    return res.status(500).json({ error: 'Se necesita ffmpeg para forzar 16 bits / 44.1 kHz. Instálalo y reinicia.' });
  }
});

// Multi-file conversion -> returns ZIP
app.post('/convert-multi', upload.array('files', 50), async (req, res) => {
  const tool = pickTool();
  if (!tool || tool.tool !== 'ffmpeg') {
    // Require ffmpeg to ensure 16/44.1
    req.files?.forEach(f => fs.unlink(f.path, () => {}));
    return res.status(500).json({ error: 'Se requiere ffmpeg en el PATH para convertir múltiples archivos a 16 bits / 44.1 kHz.' });
  }

  // Prepare temp outputs
  const outputs = [];
  try {
    for (const f of req.files) {
      const dst = path.join(os.tmpdir(), `${path.parse(f.originalname).name}-${Date.now()}-${Math.random().toString(16).slice(2)}.aiff`);
      await new Promise((resolve, reject) => {
        const proc = spawn(tool.path, [
          '-y',
          '-i', f.path,
          '-ar', '44100',
          '-sample_fmt', 's16',
          '-map_metadata', '0',
          '-c:a', 'pcm_s16be',
          dst,
        ]);
        proc.on('close', (code, signal) => {
          fs.unlink(f.path, () => {});
          if (code === 0) {
            outputs.push({ path: dst, name: `${path.parse(f.originalname).name}.aiff` });
            resolve();
          } else {
            reject(new Error(`Error en ${f.originalname} (codigo ${code || signal})`));
          }
        });
      });
    }
  } catch (err) {
    outputs.forEach(o => fs.unlink(o.path, () => {}));
    return res.status(500).json({ error: err.message });
  }

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', 'attachment; filename=\"convertidos-aiff.zip\"');

  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.on('error', err => {
    outputs.forEach(o => fs.unlink(o.path, () => {}));
    res.status(500).end();
  });
  archive.on('end', () => {
    outputs.forEach(o => fs.unlink(o.path, () => {}));
  });

  archive.pipe(res);
  for (const o of outputs) {
    archive.file(o.path, { name: o.name });
  }
  archive.finalize();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Converter web app en http://localhost:${PORT}`));
