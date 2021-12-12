import WebSocket from 'ws'

function waitForSocketState(socket: WebSocket, state: number) {
  return new Promise((resolve: (value?: any) => void) => {
    setTimeout(function () {
      if (socket.readyState === state) {
        resolve()
      } else {
        waitForSocketState(socket, state).then(resolve)
      }
    }, 5)
  })
}
async function createSocketClient(
  port: number,
  endpoint: string,
  closeAfter: number
) {
  const client = new WebSocket(`ws://localhost:${port}${endpoint}`)
  await waitForSocketState(client, client.OPEN)
  const messages: Array<WebSocket.RawData> = []
  client.on('message', (data: string) => {
    console.log('socket received message', data)
    messages.push(JSON.parse(data))
    if (messages.length === closeAfter) {
      client.close()
    }
  })
  return { client, messages }
}

export { waitForSocketState, createSocketClient }
