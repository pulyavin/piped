import generateUuid from 'uuid/v4'
import WebSocket from 'ws'
import logger from './logger'

const connections = {}

export function connectionsCounter() {
  const countUsers = Object.keys(connections).length

  let countConnections = 0

  for (const token in connections) {
    countConnections += Object.keys(connections[token]).length
  }

  return { countUsers, countConnections }
}

export function hasConnection(token) {
  if (!token) {
    return false
  }

  return token in connections
}

export function addConnection(token, connection) {
  const connectionId = `connection-${generateUuid()}`

  if (!(token in connections)) {
    connections[token] = {}
  }

  connections[token][connectionId] = connection

  return connectionId
}

export function closeConnection(token, connectionId) {
  if (!token) {
    return
  }

  if (!(token in connections)) {
    return
  }

  const connection = connections[token][connectionId]

  if (connection) {
    connection.close()
  }

  delete connections[token][connectionId]

  if (Object.keys(connections[token]).length === 0) {
    delete connections[token]
  }
}

export function sendTo(token, message) {
  if (!token) {
    return
  }

  if (!(token in connections)) {
    return
  }

  for (const connectionId in connections[token]) {
    const connection = connections[token][connectionId]

    // TODO if connection null - close and remove
    if (!connection) {
      closeConnection(token, connectionId)

      return
    }

    if (connection.readyState !== WebSocket.OPEN) {
      closeConnection(token, connectionId)

      continue
    }

    try {
      connection.send(message, function ack(e) {
        if (e === undefined) {
          return
        }

        logger.error(`Error in socket ack ${e}`)

        closeConnection(token, connectionId)
      })
    } catch (e) {
      logger.error(`Error in socket send ${e}`)

      closeConnection(token, connectionId)
    }
  }
}
