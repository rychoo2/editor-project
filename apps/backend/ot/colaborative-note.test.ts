import _ from 'lodash'
import { NOTE_1 } from '../fixtures/notes'
import { CollaborativeNote } from './colaborative-note'

test('expect changes to be applied', () => {
  const note = new CollaborativeNote(NOTE_1)

  expect(note.get().value.title).toBe('TODO')

  let noteVersion = note.update({ ...NOTE_1, title: 'TODO LIST' }, 0)
  expect(noteVersion.value.title).toBe('TODO LIST')
  expect(noteVersion.version).toBe(1)

  noteVersion = note.update({ ...NOTE_1, title: 'TODO LIST 2' }, 0)
  expect(noteVersion.value.title).toBe('TODO LIST 2')
  expect(noteVersion.version).toBe(2)

  noteVersion = note.update({ ...NOTE_1, title: 'TODO LIST 3' }, 2)
  expect(noteVersion.value.title).toBe('TODO LIST 3')
  expect(noteVersion.version).toBe(3)
})

test('expect changes to be applied collaboratively', () => {
  const note = new CollaborativeNote(NOTE_1)

  expect(note.get().value.content[0].children[0].text).toBe('Action Items')

  let newNote = _.cloneDeep(NOTE_1) as any
  newNote.content[0].children[0].text = 'Action Items for Today'
  let noteVersion = note.update(newNote, 0)

  expect(noteVersion.value.content[0].children[0].text).toBe(
    'Action Items for Today'
  )
  expect(noteVersion.version).toBe(1)

  newNote = _.cloneDeep(NOTE_1) as any
  newNote.content[1].children[0].text = 'Get bread'
  noteVersion = note.update(newNote, 0)

  expect(noteVersion.value.content[1].children[0].text).toBe('Get bread')
  expect(noteVersion.value.content[0].children[0].text).toBe(
    'Action Items for Today'
  )
  expect(noteVersion.version).toBe(2)

  newNote = _.cloneDeep(noteVersion.value) as any
  newNote.content[0].children[0].text = 'Action Items for Today!'
  noteVersion = note.update(newNote, 1)

  expect(noteVersion.value.content[1].children[0].text).toBe('Get bread')
  expect(noteVersion.value.content[0].children[0].text).toBe(
    'Action Items for Today!'
  )
  expect(noteVersion.version).toBe(3)

  newNote = _.cloneDeep(noteVersion.value) as any
  newNote.content.push({
    type: 'list-item',
    children: [{ text: 'Call car workshop' }]
  })
  newNote.content[0].children[0].text = 'Action Items for Today Morning!'
  noteVersion = note.update(newNote, 2)

  expect(noteVersion.value.content[0].children[0].text).toBe(
    'Action Items for Today Morning!'
  )
  expect(noteVersion.value.content[4].children[0].text).toBe(
    'Call car workshop'
  )
  expect(noteVersion.version).toBe(4)
})
