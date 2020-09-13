import util from './util'

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
        val: a.values.get(id),
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

function getIdsMap (doc, idKey) {
  return new Map(doc.map(item => [item[idKey], item]))
}

export default function merge (docA, docB) {
  const ID_KEY = 'id'
  const result = { val: [], mod: {}, pos: {} }
  const input = {
    a: { positions: docA.pos, changes: docA.mod, values: getIdsMap(docA.val, ID_KEY) },
    b: { positions: docB.pos, changes: docB.mod, values: getIdsMap(docB.val, ID_KEY) }
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

  for (const id of ids) {
    if (util.hasKey(modifications.deleted, id)) {
      result.mod[id] = modifications.deleted[id]
      continue
    }

    if (util.hasKey(modifications.inserted, id)) {
      result.val.push(modifications.inserted[id].val)
      result.pos[id] = modifications.inserted[id].pos
      result.mod[id] = modifications.inserted[id].mod
      continue
    }

    if (util.hasKey(modifications.moved, id)) {
      result.val.push(modifications.moved[id].val)
      result.pos[id] = modifications.moved[id].pos
      result.mod[id] = modifications.moved[id].mod
      continue
    }

    let source
    if (input.a.values.has(id)) source = 'a'
    if (input.b.values.has(id)) source = 'b'
    if (!source) continue

    result.val.push(input[source].values.get(id))
    result.pos[id] = input[source].positions[id]
    if (util.hasKey(input[source].changes, id)) {
      result.mod[id] = input[source].changes[id]
    }
  }

  result.val.sort((a, b) => {
    return result.pos[a[ID_KEY]] - result.pos[b[ID_KEY]]
    // TODO: if not same id and substraction is 0, then compare mod dates
  })

  return result
}
