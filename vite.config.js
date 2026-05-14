import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'
import multer from 'multer'

// Carpeta de subidas local (reporte fotográfico): uploads/reporte
const UPLOAD_REPORTE_DIR = path.resolve(process.cwd(), 'uploads', 'reporte')

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // En desarrollo: POST /api/upload guarda en uploads/reporte (sin necesidad del backend 4001)
    {
      name: 'local-upload-api',
      configureServer(server) {
        if (!fs.existsSync(UPLOAD_REPORTE_DIR)) {
          fs.mkdirSync(UPLOAD_REPORTE_DIR, { recursive: true })
        }
        const storage = multer.diskStorage({
          destination: (_req, _file, cb) => cb(null, UPLOAD_REPORTE_DIR),
          filename: (_req, file, cb) => {
            const ext = path.extname(file.originalname) || '.jpg'
            const name = Date.now() + '-' + Math.round(Math.random() * 1e9) + ext
            cb(null, name)
          },
        })
        const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } })
        server.middlewares.use((req, res, next) => {
          if (req.url !== '/api/upload' || req.method !== 'POST') return next()
          upload.single('file')(req, res, (err) => {
            if (err) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: err.message || 'Error al subir' }))
              return
            }
            if (!req.file) {
              res.statusCode = 400
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'No file uploaded' }))
              return
            }
            const url = '/uploads/reporte/' + req.file.filename
            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ url, filename: req.file.filename }))
          })
        })
      },
    },
    // Servir archivos estáticos desde uploads/ (incluye uploads/reporte)
    {
      name: 'serve-uploads-local',
      configureServer(server) {
        const uploadsDir = path.resolve(process.cwd(), 'uploads')
        server.middlewares.use('/uploads', (req, res, next) => {
          if (req.method !== 'GET' && req.method !== 'HEAD') return next()
          const subpath = (req.url || '').replace(/\?.*$/, '').replace(/^\//, '')
          if (!subpath) return next()
          const filePath = path.join(uploadsDir, subpath)
          const resolved = path.resolve(filePath)
          const base = path.resolve(uploadsDir) + path.sep
          if (!resolved.startsWith(base) || !fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) return next()
          const ext = path.extname(subpath).toLowerCase()
          const mime = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif' }[ext] || 'application/octet-stream'
          res.setHeader('Content-Type', mime)
          fs.createReadStream(resolved).on('error', next).pipe(res)
        })
      },
    },
  ],
  server: {
    port: 3005,
    host: true,
    strictPort: false,
    // Solo proxy de /api/ai al backend 4001; /api/upload lo maneja el plugin local-upload-api
    proxy: {
      '/api/ai': {
        target: 'http://localhost:4001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
