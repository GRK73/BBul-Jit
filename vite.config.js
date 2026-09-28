import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 로컬 개발에서도 /api/*.js(Vercel 함수)를 그대로 실행한다. 배포에는 영향 없음.
const localApi = () => ({
  name: 'local-vercel-api',
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      const url = new URL(req.url, 'http://localhost')
      const match = url.pathname.match(/^\/api\/([a-z]+)$/)
      if (!match) return next()
      try {
        const { default: handler } = await server.ssrLoadModule(`/api/${match[1]}.js`)
        req.query = Object.fromEntries(url.searchParams)
        res.status = code => { res.statusCode = code; return res }
        res.json = body => {
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(body))
        }
        await handler(req, res)
      } catch (error) {
        next(error)
      }
    })
  }
})

export default defineConfig({
  plugins: [react(), localApi()],
  base: './'
})
