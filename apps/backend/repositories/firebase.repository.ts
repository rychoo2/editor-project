import firebase from '../firebase'
import { Note, NoteInfo } from '../models'

export class FirebaseRepository {
  public async getNotes(): Promise<Array<NoteInfo>> {
    const result = await firebase
      .collection('notes')
      .select('id', 'title')
      .get()
    const notes = result.docs.map((doc) => doc.data() as NoteInfo)
    return notes
  }

  public async getNote(id: string): Promise<Note> {
    const result = await firebase.collection('notes').doc(id).get()
    const note = result.data() as Note
    return note
  }

  public async updateNote(note: Note) {
    await firebase.collection('notes').doc(note.id).set(note)
  }
}
