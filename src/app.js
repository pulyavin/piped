import express from 'express'
import commandLineArgs from 'command-line-args'
import {} from 'dotenv/config'
import enableWs from 'express-ws'
import bodyParser from 'body-parser'
import metricsRouter from './metrics'
import handler from './handler'
import rabbit from './rabbit'
import logger from './logger'

const optionDefinitions = [
  { name: 'port', alias: 'p', type: Number },
  { name: 'nodeId', alias: 'n', type: Number },
]
const options = commandLineArgs(optionDefinitions)

;(async () => {
  try {
    if (!options.port) {
      throw 'You must specify port number with --port flag!'
    }

    if (!options.nodeId) {
      throw 'You must specify nodeId number with --nodeId flag!'
    }

    await rabbit.connect(options.nodeId)

    const app = express()
    enableWs(app)

    app.use(bodyParser.json())

    app.ws('/api/:token', handler)

    app.use('/metrics', metricsRouter)

    app.listen(options.port)
  } catch (e) {
    logger.error(e)
  }
})()
