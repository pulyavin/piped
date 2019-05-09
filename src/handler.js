import {} from 'dotenv/config'
import { addConnection, closeConnection, sendTo } from './connections'
import { errorEvent, pongEvent } from './builders/events-builder'
import { queueObject } from './builders/object-builder'
import logger from './logger'
import rabbit from './rabbit'

let serverPing = 5
if (process.env.SERVER_PING) {
  serverPing = process.env.SERVER_PING
}

export default async function handler(connection, request) {
  try {
    const token = request.params.token

    const connectionId = addConnection(token, connection)

    let pingTimerId = null

    // ping-pong mechanism
    const pingFunction = async () => {
      try {
        connection.ping()
      } catch (error) {
        await disconnect(token, connectionId, pingTimerId)

        logger.info(
          `Error event with ping/pong in ${token} ${error} with message ${
            error.message
          }`
        )

        return
      }

      pingTimerId = setTimeout(pingFunction, serverPing * 1000)
    }

    pingTimerId = setTimeout(pingFunction, serverPing * 1000)

    // onMessage
    connection.on('message', async data => {
      try {
        data = JSON.parse(data)
      } catch (error) {
        sendTo(token, errorEvent(`Can not parse json ${data}`))

        return
      }

      if (!data.method) {
        sendTo(token, errorEvent(`Method is not specified in json ${data}`))

        return
      }

      const requestId = data.id
      const method = data.method
      const payload = data.payload

      // send to rabbit
      if (method == 'ping') {
        setImmediate(async () => {
          sendTo(token, pongEvent())
        })
      } else {
        rabbit.sendMessage(queueObject(requestId, method, payload, token))
      }
    })

    // onClose
    connection.on('close', async error => {
      logger.debug(
        `connection ${error.wasClean} closed with code ${
          error.code
        } and reason '${error.reason}'`
      )

      await disconnect(token, connectionId, pingTimerId)
    })

    // onError
    connection.on('error', async error => {
      logger.error(
        `Error event in ${token} ${error} with message ${error.message}`
      )

      await disconnect(token, connectionId, pingTimerId, isMember)
    })
  } catch (error) {
    logger.error(`Error in connection ${error}`)
  }
}

async function disconnect(token, connectionId, pingTimerId) {
  clearTimeout(pingTimerId)
  closeConnection(token, connectionId)
}
