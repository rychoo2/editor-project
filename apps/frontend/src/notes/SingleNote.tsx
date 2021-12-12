import React, { useEffect, useState } from 'react'
import { Editor } from '../editor'
import { useNote } from './hooks'
import { ReadyState } from 'react-use-websocket'

import { Paper, TextField, Badge, BadgeTypeMap } from '@mui/material'
import { Descendant } from 'slate'
import { preventOverflow } from '@popperjs/core'
import { off } from 'process'

interface SingleNoteProps {
  id: string
}

const Home: React.FC<SingleNoteProps> = ({ id }) => {
  const { note, readyState, sendMessage } = useNote(id)

  const connectionStatusColor = {
    [ReadyState.CONNECTING]: 'info',
    [ReadyState.OPEN]: 'success',
    [ReadyState.CLOSING]: 'warning',
    [ReadyState.CLOSED]: 'error',
    [ReadyState.UNINSTANTIATED]: 'error',
  }[readyState] as BadgeTypeMap['props']['color']

  const [title, setTitle] = useState('')
  const [content, setContent] = useState([] as Descendant[]);

  useEffect(() => {
    if (note) {
      if(note.title != title){
        note.title = title;
        sendMessage(JSON.stringify(note))
        console.log("content update", note)
      }
    }
  }, [title])

  useEffect(() => {
    if(note){
      console.log("content update from outside", note)
      setTitle(note.title)
      setContent(note.content)
    }
  }, [note])

  return content && title ? (
    <>
      <Badge color={connectionStatusColor} variant="dot" sx={{ width: '100%' }}>
        <TextField
          value={title}
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
        <Editor initialValue={content} onChange={setContent} />
      </Paper>
    </>
  ) : null
}

export default Home