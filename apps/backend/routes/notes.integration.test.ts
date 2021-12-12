import request from 'supertest'

import { createServer } from '../server'
import firebase from '../firebase'
import { NOTE_1, NOTE_2 } from '../fixtures/notes'
import { Server } from 'http'
import {
  createSocketClient,
  waitForSocketState
} from '../helpers/webSocketTestUtils'
import _ from 'lodash'

const PORT = 3002

describe('Notes controller', () => {
  let server: Server

  beforeAll(() => {
    server = createServer({ port: PORT })
  })
  afterAll(async () => {
    await server.close()
  })

  beforeEach(async () => {
    await createTestData()
  })

  describe('GET /api/notes', () => {
    it('returns 200 including available notes', (done) => {
      request(server)
        .get(`/api/notes`)
        .expect('Content-Type', /json/)
        .expect(200)
        .end((err, res) => {
          if (err) return done(err)
          expect(res.body).toHaveProperty('notes')
          expect(res.body.notes).toContainEqual({
            id: NOTE_1.id,
            title: NOTE_1.title
          })
          expect(res.body.notes).toContainEqual({
            id: NOTE_2.id,
            title: NOTE_2.title
          })
          done()
        })
    })
  })

  describe('WS /api/notes/{id}', () => {
    it('gets ititial note content when sending empty message', async () => {
      const { client, messages } = await createSocketClient(
        PORT,
        '/api/notes/n1',
        1
      )
      client.send('')
      await waitForSocketState(client, client.CLOSED)
      client.close()
      expect(messages).toContainEqual(NOTE_1)
    })

    it('gets updated note content when modified from outside', async () => {
      const { client, messages } = await createSocketClient(
        PORT,
        '/api/notes/n1',
        2
      )
      await firebase
        .collection('notes')
        .doc(NOTE_1.id)
        .set({ ...NOTE_1, title: 'New Test Title' })
      await waitForSocketState(client, client.CLOSED)
      expect(messages).toHaveLength(2)
      expect(messages[1]).toHaveProperty('title', 'New Test Title')
    })

    it('saves new value sent to websocket if non empty', async () => {
      const { client, messages } = await createSocketClient(
        PORT,
        '/api/notes/n1',
        2
      )
      client.send(JSON.stringify({ ...NOTE_1, title: 'Another Test Title' }))
      await waitForSocketState(client, client.CLOSED)
      expect(messages).toHaveLength(2)
      expect(messages[1]).toHaveProperty('title', 'Another Test Title')
    })

    it('sends updated value to other connected clients', async () => {
      const { client: client1, messages: messages1 } = await createSocketClient(
        PORT,
        '/api/notes/n1',
        2
      )
      const { client: client2, messages: messages2 } = await createSocketClient(
        PORT,
        '/api/notes/n1',
        2
      )
      client1.send(JSON.stringify({ ...NOTE_1, title: 'Updated Test Title' }))
      await waitForSocketState(client1, client1.CLOSED)
      await waitForSocketState(client2, client2.CLOSED)
      expect(messages2).toHaveLength(2)
      expect(messages2[1]).toHaveProperty('title', 'Updated Test Title')
    })

    it('merges simultanous changes from connected clients', async () => {
      const { client: client1, messages: messages1 } = await createSocketClient(
        PORT,
        '/api/notes/n1',
        3
      )
      const { client: client2, messages: messages2 } = await createSocketClient(
        PORT,
        '/api/notes/n1',
        3
      )

      const updatedNote1 = _.cloneDeep(NOTE_1) as any
      updatedNote1.content[0].children[0].text = 'AAA'

      const updatedNote2 = _.cloneDeep(NOTE_1) as any
      updatedNote1.content[2].children[0].text = 'BBB'

      client1.send(JSON.stringify(updatedNote1))
      client2.send(JSON.stringify(updatedNote2))

      await waitForSocketState(client1, client1.CLOSED)
      await waitForSocketState(client2, client2.CLOSED)
      expect(messages1).toHaveLength(3)
      expect(messages2).toHaveLength(3)
      expect(messages1[2]).toEqual(messages2[2])
      expect((messages1[2] as any).content[2].children[0].text).toEqual('BBB')
      expect((messages1[2] as any).content[0].children[0].text).toEqual('AAA')
    })
  })
})

async function createTestData() {
  for (let n of [NOTE_1, NOTE_2]) {
    await firebase.collection('notes').doc(n.id).set(n)
  }
}
