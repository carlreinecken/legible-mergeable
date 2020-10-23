import util from './util'
import { DEFAULT_ID_KEY, MODIFICATIONS_KEY } from './constants'
import position from './position'
import mergeObjectFunction from './merge-object'

function parseObject (object) {
  let changes = {}
  const state = util.deepCopy(object)

  if (util.hasKey(state, MODIFICATIONS_KEY)) {
    changes = util.parseChangeDates(state[MODIFICATIONS_KEY])
    delete state[MODIFICATIONS_KEY]
  }

  return { changes, state }
}

function mergeObjects (a, b) {
  a = parseObject(a)
  b = parseObject(b)

  const merged = mergeObjectFunction(a.state, a.changes, b.state, b.changes)
  if (Object.keys(merged.changes).length === 0) {
    return merged.content
  }

  return {
    ...merged.content,
    [MODIFICATIONS_KEY]: merged.changes
  }
}

function getModifications (a, b) {
  const result = {
    inserted: {},
    deleted: {},
    moved: {}
  }

  for (const [id, change] of Object.entries(a.changes)) {
    if (!util.hasKey(b.changes, id) && !b.values.has(id) && a.values.has(id)) {
      result.inserted[id] = {
        val: a.values.get(id),
        pos: a.positions[id],
        mod: change
      }
      continue
    }

    // abort if the other lists has a newer change
    // this is also important to enusre that only the newest deletion is considered
    if (change < (b.changes[id] || null)) {
      continue
    }

    if (!a.values.has(id)) {
      result.deleted[id] = change
      continue
    }

    if (a.values.has(id) &&
      b.values.has(id) &&
      a.positions[id] !== b.positions[id]
    ) {
      result.moved[id] = {
        pos: a.positions[id],
        mod: change
      }
    }
  }

  return result
}

function getAllModifications (a, b) {
  const modA = getModifications(a, b)
  const modB = getModifications(b, a)

  return {
    inserted: { ...modA.inserted, ...modB.inserted },
    deleted: { ...modA.deleted, ...modB.deleted },
    moved: { ...modA.moved, ...modB.moved }
  }
}

function getIdsMap (doc) {
  return new Map(doc.map(item => [item[DEFAULT_ID_KEY], item]))
}

export default function merge (docA, docB) {
  const input = {
    a: { positions: docA.pos, changes: docA.mod, values: getIdsMap(docA.val) },
    b: { positions: docB.pos, changes: docB.mod, values: getIdsMap(docB.val) }
  }

  const modifications = getAllModifications(input.a, input.b)
  // console.log(modifications)

  const ids = [...new Set([].concat(
    Array.from(input.a.values.keys()),
    Array.from(input.b.values.keys()),
    Object.keys(input.a.changes),
    Object.keys(input.b.changes)
  ))]
  // console.log(ids)

  /*
   * Build result values
   */

  const result = { val: [], mod: {}, pos: {} }

  for (const id of ids) {
    if (util.hasKey(modifications.deleted, id)) {
      result.mod[id] = modifications.deleted[id]
      continue
    }

    if (util.hasKey(modifications.inserted, id)) {
      result.val.push(modifications.inserted[id].val)
      if (modifications.inserted[id].pos) {
        result.pos[id] = modifications.inserted[id].pos
      }
      result.mod[id] = modifications.inserted[id].mod
      continue
    }

    if (util.hasKey(modifications.moved, id)) {
      result.val.push(mergeObjects(input.a.values.get(id), input.b.values.get(id)))
      if (modifications.moved[id].pos) {
        result.pos[id] = modifications.moved[id].pos
      }
      result.mod[id] = modifications.moved[id].mod
      continue
    }

    /*
     * No array action:
     * However the objects are either different or are the same.
     */

    let source
    if (input.a.values.has(id)) source = 'a'
    if (input.b.values.has(id)) source = 'b'
    if (!source) continue

    if (input.a.values.has(id) && input.b.values.has(id)) {
      result.val.push(mergeObjects(input.a.values.get(id), input.b.values.get(id)))
    } else {
      result.val.push(input[source].values.get(id))
    }

    if (input[source].positions[id]) {
      result.pos[id] = input[source].positions[id]
    }
    if (util.hasKey(input[source].changes, id)) {
      result.mod[id] = input[source].changes[id]
    }
  }

  /*
   * Order elements by position
   */

  if (Object.keys(result.pos).length > 0) {
    result.val.sort((a, b) => position.compare(
      result.pos[a[DEFAULT_ID_KEY]],
      result.pos[b[DEFAULT_ID_KEY]]
    ))
  }

  return result
}
