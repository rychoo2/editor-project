import _ from 'lodash'
import { NOTE_1 } from '../fixtures/notes'
import { CollaborativeNote } from './colaborative-note'

test('expect changes to be applied', () => {
  const note = new CollaborativeNote(NOTE_1)

  expect(note.get().snapshot.title).toBe('TODO')

  let noteVersion = note.update({ ...NOTE_1, title: 'TODO LIST' }, 0)
  expect(noteVersion.snapshot.title).toBe('TODO LIST')
  expect(noteVersion.version).toBe(1)
  expect(noteVersion.patch).toEqual([])

  noteVersion = note.update({ ...NOTE_1, title: 'TODO LIST 2' }, 0)
  expect(noteVersion.snapshot.title).toBe('TODO LIST 2')
  expect(noteVersion.version).toBe(2)
  expect(noteVersion.patch).toEqual([])

  noteVersion = note.update({ ...NOTE_1, title: 'TODO LIST 3' }, 2)
  expect(noteVersion.snapshot.title).toBe('TODO LIST 3')
  expect(noteVersion.version).toBe(3)
  expect(noteVersion.patch).toEqual([])
})

test('expect changes to be applied collaboratively', () => {
  const note = new CollaborativeNote(_.cloneDeep(NOTE_1))

  expect(note.get().snapshot.content[0].children[0].text).toBe('Action Items')

  let newNote = _.cloneDeep(NOTE_1) as any
  newNote.content[0].children[0].text = 'Action Items for Today'
  let noteVersion = note.update(newNote, 0)

  expect(noteVersion.snapshot.content[0].children[0].text).toBe(
    'Action Items for Today'
  )
  expect(noteVersion.version).toBe(1)
  expect(noteVersion.patch).toEqual([])

  newNote = _.cloneDeep(NOTE_1) as any
  newNote.content[1].children[0].text = 'Get bread'
  noteVersion = note.update(newNote, 0)

  expect(noteVersion.snapshot.content[1].children[0].text).toBe('Get bread')
  expect(noteVersion.snapshot.content[0].children[0].text).toBe(
    'Action Items for Today'
  )
  expect(noteVersion.version).toBe(2)
  expect(noteVersion.patch).toEqual([
    {
      op: 'replace',
      path: '/content/0/children/0/text',
      value: 'Action Items for Today'
    }
  ])
})
