import express, { RequestHandler, Response } from 'express'
import { WebsocketRequestHandler } from 'express-ws'
import { Descendant } from 'slate'
import firebase from '../firebase'

// Patch `express.Router` to support `.ws()` without needing to pass around a `ws`-ified app.
// https://github.com/HenningM/express-ws/issues/86
// eslint-disable-next-line @typescript-eslint/no-var-requires
const patch = require('express-ws/lib/add-ws-method')
patch.default(express.Router)

const router = express.Router()

export interface NoteInfo {
  id: string
  title: string
}

export interface NotesResponse {
  notes: Array<NoteInfo>
}

export interface NoteResponse extends NoteInfo {
  content: Array<Descendant>
}

const notesHandler: RequestHandler = async (
  _req,
  res: Response<NotesResponse>
) => {
  const notes = await firebase.collection('notes').select('id', 'title').get()
  const result = notes.docs.map((doc) => doc.data() as NoteInfo)
  res.json({
    notes: result
  })
}

const noteHandler: WebsocketRequestHandler = (ws, req) => {
  const document = firebase.collection('notes').doc(req.params.id)
  const closeHandle = document.onSnapshot((doc) => {
    const result = doc.data() as NoteResponse
    return ws.send(JSON.stringify(result))
  })

  ws.on('message', async (data) => {
    const msg = data.toString()
    if (msg) {
      const note = JSON.parse(msg) as NoteResponse
      await document.set(note)
    } else {
      const doc = await document.get()
      ws.send(JSON.stringify(doc.data()))
    }
  })

  ws.on('close', () => {
    closeHandle()
  })
}

router.get('/', notesHandler)
router.ws('/:id', noteHandler)

export default router
