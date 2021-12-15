import express, { RequestHandler, Response } from 'express'
import { WebsocketRequestHandler } from 'express-ws'

import { Note, NoteInfo } from '../models'
import { CollaborativeNote, NotePatch } from '../ot/colaborative-note'
import { FirebaseRepository } from '../repositories/firebase.repository'

// Patch `express.Router` to support `.ws()` without needing to pass around a `ws`-ified app.
// https://github.com/HenningM/express-ws/issues/86
// eslint-disable-next-line @typescript-eslint/no-var-requires
const patch = require('express-ws/lib/add-ws-method')
patch.default(express.Router)

const router = express.Router()
const repo = new FirebaseRepository()
const notesStorage: { [id: string]: CollaborativeNote } = {}

export interface NotesResponse {
  notes: Array<NoteInfo>
}

export interface NoteUpdateRequest {
  newValue: Note
  lastKnownVersion: number
}

const notesHandler: RequestHandler = async (
  _req,
  res: Response<NotesResponse>
) => {
  const notes = await repo.getNotes()
  res.json({
    notes
  })
}

const noteHandler: WebsocketRequestHandler = async (ws, req) => {
  ws.on('message', async (data) => {
    const msg = data.toString()
    const noteState: CollaborativeNote = await getNoteState(req.params.id)
    var lastNoteVersion: NotePatch
    if (msg) {
      const noteUpdate = JSON.parse(msg) as NoteUpdateRequest
      lastNoteVersion = noteState.update(
        noteUpdate.newValue,
        noteUpdate.lastKnownVersion
      )
      repo.updateNote(lastNoteVersion.snapshot).then()
    } else {
      lastNoteVersion = noteState.get()
    }
    console.log('sending update', lastNoteVersion)
    if (lastNoteVersion) {
      ws.send(JSON.stringify(lastNoteVersion))
    }
  })
}

async function getNoteState(id: string): Promise<CollaborativeNote> {
  notesStorage[id] =
    notesStorage[id] || new CollaborativeNote(await repo.getNote(id))
  return notesStorage[id]
}

router.get('/', notesHandler)
router.ws('/:id', noteHandler)

export default router
