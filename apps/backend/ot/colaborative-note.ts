import firebase from '../firebase'
import * as jsonpatch from 'fast-json-patch'
import JSONPatchOT, { Operation } from '@threads/json-patch-ot'
import { Note } from '../models'

export interface NoteVersion {
  value: Note
  version: number
}

interface NotePatch extends NoteVersion {
  patch?: any
}

export class CollaborativeNote {
  private versions: NotePatch[]

  constructor(initialValue: Note) {
    const initVersion = { value: initialValue, version: 0 }
    this.versions = [initVersion]
  }

  public get(): NoteVersion {
    return this.getLastValue()
  }

  public update(note: Note, lastKnownVersionId: number): NoteVersion {
    const baseNoteState = this.versions[lastKnownVersionId]
    const previousValue = baseNoteState.value
    const patch = jsonpatch.compare(previousValue, note)
    const unknownPatches = this.versions
      .slice(lastKnownVersionId + 1)
      .map((n) => n.patch)
    const transformedPatch = JSONPatchOT(unknownPatches, patch as Operation[])

    console.log('transformedPatch', transformedPatch)
    const newValue = jsonpatch.applyPatch(
      previousValue,
      jsonpatch.deepClone(transformedPatch)
    )
    const newPatch = {
      patch: transformedPatch,
      version: this.versions.length,
      value: newValue.newDocument
    }
    this.versions.push(newPatch)
    return newPatch
  }

  private getLastValue(): NoteVersion {
    return this.versions[this.versions.length - 1]
  }
}
