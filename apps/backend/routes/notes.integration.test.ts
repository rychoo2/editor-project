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
import { NoteUpdateRequest } from './notes'
import { NotePatch } from '../ot/colaborative-note'

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
    it('gets ititial value from firestore', async () => {
      const { client, messages } = await createSocketClient(
        PORT,
        '/api/notes/n1',
        1
      )
      client.send('')
      await waitForSocketState(client, client.CLOSED)
      const msg = messages[0] as unknown as NotePatch
      expect(msg.snapshot).toEqual(NOTE_1)
    })

    it('saves new value to firestore', async () => {
      const { client, messages } = await createSocketClient(
        PORT,
        '/api/notes/n1',
        1
      )
      const udpateRequest: NoteUpdateRequest = {
        newValue: { ...NOTE_1, title: 'Another Test Title' },
        lastKnownVersion: 0
      }
      client.send(JSON.stringify(udpateRequest))
      await waitForSocketState(client, client.CLOSED)
      const doc = await firebase.collection('notes').doc(NOTE_1.id).get()
      expect(doc.data()).toHaveProperty('title', 'Another Test Title')
    })

    it('returnes updated note value when update sent to websocket', async () => {
      const { client, messages } = await createSocketClient(
        PORT,
        '/api/notes/n1',
        1
      )
      const udpateRequest: NoteUpdateRequest = {
        newValue: { ...NOTE_1, title: 'Another Test Title' },
        lastKnownVersion: 0
      }
      client.send(JSON.stringify(udpateRequest))
      await waitForSocketState(client, client.CLOSED)
      expect(messages).toHaveLength(1)
      const msg = messages[0] as unknown as NotePatch
      expect(msg.snapshot).toHaveProperty('title', 'Another Test Title')
    })

    it('includes changes from others in the update response', async () => {
      const { client: client1, messages: messages1 } = await createSocketClient(
        PORT,
        '/api/notes/n1',
        1
      )
      const { client: client2, messages: messages2 } = await createSocketClient(
        PORT,
        '/api/notes/n1',
        1
      )

      const updatedNote1 = _.cloneDeep(NOTE_1) as any
      updatedNote1.content[0].children[0].text = 'AAA'

      const updatedNote2 = _.cloneDeep(NOTE_1) as any
      updatedNote1.content[2].children[0].text = 'BBB'

      client1.send(
        JSON.stringify({ newValue: updatedNote1, lastKnownVersion: 0 })
      )
      await waitForSocketState(client1, client1.CLOSED)

      client2.send(
        JSON.stringify({ newValue: updatedNote2, lastKnownVersion: 0 })
      )

      await waitForSocketState(client2, client2.CLOSED)
      const msg = messages2[0] as unknown as NotePatch
      expect(msg.snapshot.content[2].children[0].text).toEqual('BBB')
      expect(msg.snapshot.content[0].children[0].text).toEqual('AAA')
    })

    it.skip('sends updated value immediately to all connected clients', async () => {
      const { client: client1, messages: messages1 } = await createSocketClient(
        PORT,
        '/api/notes/n1',
        1
      )
      const { client: client2, messages: messages2 } = await createSocketClient(
        PORT,
        '/api/notes/n1',
        1
      )
      const udpateRequest: NoteUpdateRequest = {
        newValue: { ...NOTE_1, title: 'Updated Test Title' },
        lastKnownVersion: 0
      }
      client1.send(JSON.stringify(udpateRequest))
      await waitForSocketState(client1, client1.CLOSED)
      await waitForSocketState(client2, client2.CLOSED)
      expect(messages2).toHaveLength(1)
      const msg = messages2[0] as unknown as NotePatch

      expect(msg.snapshot).toHaveProperty('title', 'Updated Test Title')
    })

    it.skip('broadcast updated note content when modified directly on firebase', async () => {
      const { client, messages } = await createSocketClient(
        PORT,
        '/api/notes/n1',
        1
      )
      await firebase
        .collection('notes')
        .doc(NOTE_1.id)
        .set({ ...NOTE_1, title: 'New Test Title' })
      await waitForSocketState(client, client.CLOSED)
      expect(messages).toHaveLength(1)
      const msg = messages[0] as unknown as NotePatch
      expect(msg.snapshot).toHaveProperty('title', 'New Test Title')
    })
  })
})

async function createTestData() {
  for (let n of [NOTE_1, NOTE_2]) {
    await firebase.collection('notes').doc(n.id).set(n)
  }
}
