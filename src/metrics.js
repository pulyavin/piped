import express from 'express'
import rabbit from './rabbit'
import { connectionsCounter } from './connections'

const metricsRouter = express.Router({})

metricsRouter.get('/', async function(request, response) {
  let isRabbitConnected = rabbit.isConnected()

  const { countUsers, countConnections } = connectionsCounter()

  let self = 0
  if (isRabbitConnected && countConnections) {
    self = 1
  }

  const metrics = `
service_rabbitmq{service="pipe"} ${isRabbitConnected}
service_connections{service="pipe"} ${countConnections}
service_users{service="pipe"} ${countUsers}
service_self{service="pipe"} ${self}`

  response.send(metrics)
})

export default metricsRouter
