export function queueObject(id, method, payload, token) {
  return JSON.stringify({
    id,
    method,
    token,
    payload,
  })
}

export function messageObject(message) {
  let object = message
  delete object.token

  return JSON.stringify(object)
}
