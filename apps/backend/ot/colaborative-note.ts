import firebase from '../firebase'
import * as jsonpatch from 'fast-json-patch'
import JSONPatchOT, { Operation } from '@threads/json-patch-ot'
import { Note } from '../models'
import EventEmitter from 'events'

export interface NotePatch {
  snapshot: Note
  version: number
  patch?: any
}

export class CollaborativeNote {
  private versions: NotePatch[]

  constructor(initialValue: Note) {
    const initVersion = { snapshot: initialValue, version: 0 }
    this.versions = [initVersion]
  }

  private noteUpdated: EventEmitter = new EventEmitter()

  public get(): NotePatch {
    return this.getLastValue()
  }

  public update(note: Note, lastKnownVersionId: number): NotePatch {
    const baseNoteState = this.versions[lastKnownVersionId]
    const previousValue = jsonpatch.deepClone(baseNoteState.snapshot)
    const patch = jsonpatch.compare(previousValue, note)
    const unknownPatches = this.versions
      .slice(lastKnownVersionId + 1)
      .map((n) => n.patch)
      .reduce((p1, p) => [...p1, ...p], [])
    const transformedPatch = JSONPatchOT(unknownPatches, patch as Operation[])

    console.log('transformedPatch', transformedPatch)
    const newValue = jsonpatch.applyPatch(
      previousValue,
      jsonpatch.deepClone([...unknownPatches, ...transformedPatch])
    )
    const newVersion = {
      patch: transformedPatch,
      version: this.versions.length,
      snapshot: newValue.newDocument
    }
    this.versions.push(newVersion)

    const patchToApply = jsonpatch.compare(note, newValue.newDocument)

    this.noteUpdated.emit('update', newVersion)
    return {
      ...newVersion,
      patch: patchToApply
    }
  }

  public onUpdate(eventHandler: (newVersion: NotePatch) => void) {
    this.noteUpdated.on('update', eventHandler)
  }

  private getLastValue(): NotePatch {
    return this.versions[this.versions.length - 1]
  }
}
