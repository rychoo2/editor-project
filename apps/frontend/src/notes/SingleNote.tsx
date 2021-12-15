import React, { useEffect, useState } from 'react'
import { Editor } from '../editor'
import { useNote } from './hooks'
import { ReadyState } from 'react-use-websocket'

import { Paper, TextField, Badge, BadgeTypeMap } from '@mui/material'
import { NotePatch } from '../../../backend/ot/colaborative-note'
import { NoteUpdateRequest } from '../../../backend/routes/notes'
import _ from 'lodash'

interface SingleNoteProps {
  id: string
}

const Home: React.FC<SingleNoteProps> = ({ id }) => {
  const { note: remoteNote, readyState, sendMessage } = useNote(id)

  const connectionStatusColor = {
    [ReadyState.CONNECTING]: 'info',
    [ReadyState.OPEN]: 'success',
    [ReadyState.CLOSING]: 'warning',
    [ReadyState.CLOSED]: 'error',
    [ReadyState.UNINSTANTIATED]: 'error',
  }[readyState] as BadgeTypeMap['props']['color']

  const [localNote, setLocalNote] = useState({} as NotePatch);

  useEffect(() => {
    if (localNote) {
      if(!_.isEqual(remoteNote?.snapshot, localNote?.snapshot)){
        const noteUpdateRequest: NoteUpdateRequest = {lastKnownVersion: localNote.version, newValue: localNote.snapshot}
        sendMessage(JSON.stringify(noteUpdateRequest))
        console.log("content update", localNote)
      }
    }
  }, [localNote])

  useEffect(() => {
    if(remoteNote){
      if(!_.isEqual(remoteNote?.snapshot, localNote?.snapshot)){
        setLocalNote(remoteNote)
      }
    }
  }, [remoteNote])

  function setTitle(title: string) {
    setLocalNote({...localNote, snapshot: {...localNote.snapshot, title}})
  }

  function setContent(content: any) {
    setLocalNote({...localNote, snapshot: {...localNote.snapshot, content}})
  }


  return localNote?.snapshot ? (
    <>
      <Badge color={connectionStatusColor} variant="dot" sx={{ width: '100%' }}>
        <TextField
          value={localNote.snapshot.title}
          onChange={e => setTitle(e.target.value)}
          variant="standard"
          fullWidth={true}
          inputProps={{ style: { fontSize: 32, color: '#666' } }}
          sx={{ mb: 2 }}
        />
      </Badge>
      <Paper
        sx={{
          p: 2,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Editor value={localNote.snapshot.content} onChange={setContent} />
      </Paper>
    </>
  ) : null
}

export default Home