import {} from 'dotenv/config'

export function getDsn() {
  let dsn = 'amqp://'

  if ('RABBIT_LOGIN' in process.env) {
    dsn += `${process.env.RABBIT_LOGIN}:${process.env.RABBIT_PASSWORD}@`
  }

  dsn += process.env.RABBIT_HOST

  if ('RABBIT_PORT' in process.env) {
    dsn += `:${process.env.RABBIT_PORT}`
  }

  dsn += '/'

  if ('RABBIT_VHOST' in process.env) {
    dsn += process.env.RABBIT_VHOST
  }

  if ('RABBIT_HEARTBEAT' in process.env) {
    dsn += `?heartbeat=${process.env.RABBIT_HEARTBEAT}`
  }

  return dsn
}
