import express from 'express'
import cors from 'cors'
import expressWs from 'express-ws'

import apiRoutes from './routes'
const DEFAULT_PORT = 3001

export function createServer(config: { port?: number } = {}) {
  const app = express()
  expressWs(app)

  app.use(express.json())
  app.use(express.urlencoded({ extended: false }))
  app.use(cors())

  app.use('/api', apiRoutes)
  const port = config.port || DEFAULT_PORT
  return app.listen(port, () => {
    console.log(`⚡️[server]: Server is running at https://localhost:${port}`)
  })
}
