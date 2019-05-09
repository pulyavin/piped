import amqp from 'amqplib'
import {} from 'dotenv/config'
import { getDsn } from './utils/rabbit'
import logger from './logger'
import { sendTo } from './connections'
import { messageObject } from './builders/object-builder'

let RECONNECTION_TIME = 60000
if ('RABBIT_RECONNECTION_TIME' in process.env) {
  RECONNECTION_TIME = process.env.RABBIT_RECONNECTION_TIME * 1000
}

class rabbit {
  constructor() {
    this.connection = null
    this.nodeId = null
  }

  isConnected() {
    if (!this.connection) {
      return false
    }

    const { readable, writable } = this.connection.connection.stream
    return readable && writable ? 1 : 0
  }

  async connect(nodeId) {
    if (nodeId) {
      this.nodeId = nodeId
    }

    try {
      logger.info(`Trying to connect to rabbit with dsn "${getDsn()}"`)
      this.connection = await amqp.connect(getDsn())

      await this.createBindings()
      await this.consumeMessage()

      logger.info(`Connection to rabbit established with dsn "${getDsn()}"`)
    } catch (error) {
      logger.error(`Rabbit error with primary connect "${error.message}"`)

      setTimeout(async () => {
        logger.info(`Trying to rabbit reconnect with dsn "${getDsn()}"`)

        await this.connect()
      }, RECONNECTION_TIME)

      return
    }

    this.connection.on('close', async () => {
      logger.error(`Connection to rabbit closed`)

      setTimeout(async () => {
        logger.info(`Reconnecting to rabbit with dsn "${getDsn()}"`)

        await this.connect()
      }, RECONNECTION_TIME)

      return
    })
  }

  async createBindings() {
    const channel = await this.connection.createChannel()

    // mass exchange
    await channel.assertExchange(
      process.env.RABBIT_MASS_EXHANGE_NAME,
      'fanout',
      { durable: true }
    )
    // in exchange
    await channel.assertExchange(
      `${process.env.RABBIT_PREFIX_EXCHANGE_IN}${this.nodeId}`,
      'fanout',
      { durable: true }
    )
    // out exchange
    await channel.assertExchange(
      `${process.env.RABBIT_PREFIX_EXCHANGE_OUT}${this.nodeId}`,
      'fanout',
      { durable: true }
    )

    // in queue
    await channel.assertQueue(
      `${process.env.RABBIT_PREFIX_QUEUE_IN}${this.nodeId}`,
      { durable: true }
    )
    // out queue
    await channel.assertQueue(
      `${process.env.RABBIT_PREFIX_QUEUE_OUT}${this.nodeId}`,
      { durable: true }
    )

    // in queue to exchange
    await channel.bindQueue(
      `${process.env.RABBIT_PREFIX_QUEUE_IN}${this.nodeId}`,
      `${process.env.RABBIT_PREFIX_EXCHANGE_IN}${this.nodeId}`
    )
    // out queue to exchange
    await channel.bindQueue(
      `${process.env.RABBIT_PREFIX_QUEUE_OUT}${this.nodeId}`,
      `${process.env.RABBIT_PREFIX_EXCHANGE_OUT}${this.nodeId}`
    )

    // mass exchange to in exchange
    await channel.bindExchange(
      `${process.env.RABBIT_PREFIX_EXCHANGE_IN}${this.nodeId}`,
      process.env.RABBIT_MASS_EXHANGE_NAME
    )

    await channel.close()
  }

  async sendMessage(message) {
    const channel = await this.connection.createChannel()

    console.log(message)
    await channel.publish(
      `${process.env.RABBIT_PREFIX_EXCHANGE_OUT}${this.nodeId}`,
      '',
      Buffer.from(message)
    )

    await channel.close()
  }

  async consumeMessage() {
    logger.info(
      `Start consuming queue ${process.env.RABBIT_PREFIX_QUEUE_IN}${
        this.nodeId
      }`
    )

    const channel = await this.connection.createChannel()

    channel.prefetch(1)

    channel.consume(
      `${process.env.RABBIT_PREFIX_QUEUE_IN}${this.nodeId}`,
      async data => {
        try {
          const message = JSON.parse(data.content.toString())
          const { token } = message

          sendTo(token, messageObject(message))
        } catch (error) {
          logger.error(`An error occurred in consuming deploys "${error}"`)
        }

        await channel.ack(data)
      }
    )
  }
}

export default new rabbit()
