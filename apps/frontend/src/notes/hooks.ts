/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { useEffect, useMemo } from 'react'
import useSWR from 'swr'
import { NotesResponse } from '../../../backend/routes/notes'

import useWebSocket, { ReadyState } from 'react-use-websocket'
import { Note } from '../../../backend/models'
import { NotePatch } from '../../../backend/ot/colaborative-note'

// If you want to use GraphQL API or libs like Axios, you can create your own fetcher function.
// Check here for more examples: https://swr.vercel.app/docs/data-fetching
const fetcher = async (input: RequestInfo, init: RequestInit) => {
  const res = await fetch(input, init)
  return res.json()
}

export const useNotesList = () => {
  const { data, error } = useSWR<NotesResponse>(
    'http://localhost:3001/api/notes',
    fetcher
  )

  return {
    notesList: data?.notes,
    isLoading: !error && !data,
    isError: error
  }
}

export const useNote = (id: string) => {
  const { readyState, lastMessage, sendMessage } = useWebSocket(
    `ws://localhost:3001/api/notes/${id}`
  )
  // Send a message when ready on first load
  useEffect(() => {
    if (readyState === ReadyState.OPEN && lastMessage === null) {
      sendMessage('')
    }
  }, [readyState, lastMessage])

  return {
    note: useMemo(
      () => lastMessage && (JSON.parse(lastMessage.data) as NotePatch),
      [lastMessage]
    ),
    readyState,
    sendMessage
  }
}
