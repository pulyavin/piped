export function pongEvent() {
  return JSON.stringify({
    type: 'event',
    event: 'pong',
  })
}

export function errorEvent(message) {
  return JSON.stringify({
    type: 'event',
    event: 'error',
    payload: {
      message,
    },
  })
}
