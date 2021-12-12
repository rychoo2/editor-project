export interface NoteInfo {
  id: string
  title: string
}

export interface Note extends NoteInfo {
  content: Array<any>
}
