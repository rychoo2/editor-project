import request from 'supertest'

import { createServer } from '../server'
import firebase from '../firebase'
import { NOTE_1, NOTE_2 } from '../fixtures/notes'
import { Server } from 'http'
import {
  createSocketClient,
  waitForSocketState
} from '../helpers/webSocketTestUtils'

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
  })
})

async function createTestData() {
  for (let n of [NOTE_1, NOTE_2]) {
    await firebase.collection('notes').doc(n.id).set(n)
  }
}
