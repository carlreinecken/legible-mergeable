function isObject (object) {
  return Object.prototype.toString.call(object) === '[object Object]'
}

function normalizeArray (array) {
  return array
    .map(value => {
      if (isObject(value)) return normalizeObject(value)

      if (Array.isArray(value)) return normalizeArray(value)

      return value
    })
}

function normalizeObject (object) {
  return Object
    .entries(object)
    .map(([key, value]) => {
      if (isObject(value)) return [key, normalizeObject(value)]

      if (Array.isArray(value)) return [key, normalizeArray(value)]

      return [key, value]
    })
    .sort()
}

export function normalizeJson (json) {
  if (typeof json === 'string') {
    json = JSON.parse(json)
  } else {
    json = JSON.parse(JSON.stringify(json))
  }

  if (Array.isArray(json)) {
    return normalizeArray(json)
  }

  if (isObject(json)) {
    return normalizeObject(json)
  }

  return json
}

// xit('normalize object', function () {
//   const norm = legibleMergeable._normalizeObject

//   const a = norm({ cc: 1, b: 2, a: 3.3, nested: { lol: [8, 4, { b: 'b', a: 'a' }, 2, 1], peter: null, gustav: 'gustav' } })
//   const b = norm({ f: () => true, nested: { gustav: 'gustav', lol: [8, 4, { a: 'a', b: 'b' }, 2, 1], peter: null }, b: 2, a: 3.3, cc: 1 })

//   expect(a).to.be.not.undefined
//   expect(a).to.be.eql(b)

//   // console.log(a)
//   console.log(JSON.stringify(a, null, 2))
// })
