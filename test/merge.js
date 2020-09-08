const legibleMergeable = require('../dist/legible-mergeable.js')
const expect = require('chai').expect

/*
 * This wrapper function protects me to change hundreds of lines of TEST code.
 * This merge functions/tests were not supposed to handle the high level API.
 * It's completely unecessary to include the _changes inside
 * the arrays and objects themself. #sorrynotsorry
 */
function merge (docA, docB) {
  const hasKey = (object, key) => Object.prototype.hasOwnProperty.call(object, key)

  if (Array.isArray(docA)) {
    const changesA = docA.find(item => hasKey(item, '_changes'))._changes
    const changesB = docB.find(item => hasKey(item, '_changes'))._changes

    const result = legibleMergeable.mergeDumps().mergeArray(docA, changesA, docB, changesB)
    result.content.push({ _changes: result.changes })
    return result.content
  } else if (typeof docA === 'object') {
    const result = legibleMergeable.mergeDumps().mergeObject(docA, docA._changes, docB, docB._changes)
    return { ...result.content, _changes: result.changes }
  }
}

function parseChangeDates (changes) {
  return Object.keys(changes).reduce((acc, key) => {
    return { ...acc, [key]: new Date(changes[key]) }
  }, {})
}

describe('merge objects', function () {
  it('two with changed properties', function () {
    const docA = {
      name: 'gustav',
      age: 22,
      hungry: false,
      pet: 'pig',
      _changes: parseChangeDates({ hungry: '2020-07-14', pet: '2020-09-01' })
    }

    const docB = {
      name: 'gustav',
      age: 44,
      hungry: null,
      pet: 'dog',
      _changes: parseChangeDates({ age: '2020-07-02', hungry: '2020-07-02', pet: '2020-08-31' })
    }

    const expected = {
      name: 'gustav',
      age: 44,
      hungry: false,
      pet: 'pig',
      _changes: parseChangeDates({ hungry: '2020-07-14', pet: '2020-09-01', age: '2020-07-02' })
    }

    expect(merge(docA, docB)).to.eql(expected)
    expect(merge(docB, docA)).to.eql(expected)
    expect(merge(docA, docA)).to.eql(docA)
    expect(merge(docB, docB)).to.eql(docB)
  })

  it('two with new and deleted properties', function () {
    const docA = { age: 13, _changes: { pet: new Date('2020-09-01') } }

    const docB = {
      name: 'gustav',
      age: 13,
      pet: 'dog',
      _changes: parseChangeDates({ name: '2020-08-09', pet: '2020-08-31' })
    }

    const expected = {
      name: 'gustav',
      age: 13,
      _changes: parseChangeDates({ name: '2020-08-09', pet: '2020-09-01' })
    }

    expect(merge(docA, docB)).to.eql(expected)
    expect(merge(docB, docA)).to.eql(expected)
    expect(merge(docA, docA)).to.eql(docA)
    expect(merge(docB, docB)).to.eql(docB)
  })

  it('three', function () {
    const docA = {
      name: 'alice',
      age: 42,
      hungry: false,
      pet: 'pig',
      _changes: parseChangeDates({ hungry: '2020-07-14', pet: '2020-06-30' })
    }

    const docB = {
      name: 'alice',
      age: 42,
      hungry: false,
      pet: 'goat',
      _changes: parseChangeDates({ hungry: '2020-07-02', pet: '2020-07-24' })
    }

    const docC = {
      name: 'alice',
      age: 19,
      hungry: true,
      pet: 'dog',
      _changes: { age: new Date('2020-07-02') }
    }

    const expected = {
      name: 'alice',
      age: 19,
      hungry: false,
      pet: 'goat',
      _changes: parseChangeDates({ age: '2020-07-02', hungry: '2020-07-14', pet: '2020-07-24' })
    }

    expect(merge(docA, merge(docB, docC))).to.eql(expected)
    expect(merge(merge(docB, docA), docC)).to.eql(expected)
    expect(merge(docB, merge(docC, docA))).to.eql(expected)
    expect(merge(docB, merge(docB, docB))).to.eql(docB)

    expect(merge(docA, docA)).to.eql(docA)
    expect(merge(docB, docB)).to.eql(docB)
    expect(merge(docC, docC)).to.eql(docC)
  })
})

describe('merge arrays', function () {
  it('first example', function () {
    const docA = [
      { id: '6A' }, { id: 'ED' }, { id: 'W9' }, { id: 'X2' }, { id: '77' },
      { _changes: { 44: new Date('2020-07-14'), W9: new Date('2020-06-09') } }
    ]

    const docB = [
      { id: '6A' }, { id: 'ED' }, { id: '77' }, { id: 'X2' }, { id: '44' },
      { _changes: { 77: new Date('2020-07-14') } }
    ]

    const expected = [
      { id: '6A' }, { id: 'ED' }, { id: 'W9' }, { id: '77' }, { id: 'X2' },
      {
        _changes: {
          44: new Date('2020-07-14'),
          W9: new Date('2020-06-09'),
          77: new Date('2020-07-14')
        }
      }
    ]

    expect(merge(docA, docB)).to.eql(expected)
    expect(merge(docB, docA)).to.eql(expected)
    expect(merge(docA, docA)).to.eql(docA)
    expect(merge(docB, docB)).to.eql(docB)
  })

  it('multiple insertions by one replica', function () {
    const docA = [
      { id: 'ED' }, { id: '6A' }, { id: 'W9' },
      { id: 'X2' }, { id: '77' }, { id: '44' },
      {
        _changes: {
          ED: new Date('2020-07-14'),
          W9: new Date('2020-06-09'),
          X2: new Date('2020-08-11'),
          77: new Date('2020-07-30')
        }
      }
    ]

    const docB = [{ id: '6A' }, { id: '44' }, { _changes: {} }]

    const expected = [
      { id: 'ED' }, { id: '6A' }, { id: 'W9' },
      { id: 'X2' }, { id: '77' }, { id: '44' },
      {
        _changes: {
          ED: new Date('2020-07-14'),
          W9: new Date('2020-06-09'),
          X2: new Date('2020-08-11'),
          77: new Date('2020-07-30')
        }
      }
    ]

    expect(merge(docA, docB)).to.eql(expected)
    expect(merge(docB, docA)).to.eql(expected)
    expect(merge(docA, docA)).to.eql(docA)
    expect(merge(docB, docB)).to.eql(docB)
  })

  it('multiple insertions by both replicas', function () {
    const docA = [
      { id: '44' }, { id: 'ED' }, { id: '6A' }, { id: 'W9' },
      {
        _changes: {
          ED: '2020-07-14',
          W9: '2020-06-09'
        }
      }
    ]

    const docB = [
      { id: 'X2' }, { id: '77' }, { id: '44' }, { id: '6A' },
      {
        _changes: {
          X2: '2020-08-11',
          77: '2020-07-30'
        }
      }
    ]

    const expected = [
      { id: 'X2' }, { id: '77' }, { id: '44' },
      { id: 'ED' }, { id: '6A' }, { id: 'W9' },
      {
        _changes: {
          ED: new Date('2020-07-14'),
          W9: new Date('2020-06-09'),
          X2: new Date('2020-08-11'),
          77: new Date('2020-07-30')
        }
      }
    ]

    expect(merge(docA, docB)).to.eql(expected)
    expect(merge(docB, docA)).to.eql(expected)
  })

  xit('multiple insertions by both replicas after deleting everything', function () {
    const docA = [
      { id: 'ED' }, { id: 'YY' }, { id: 'A6' },
      {
        _changes: {
          W9: '2020-07-01',
          ED: '2020-07-05',
          A6: '2020-07-09',
          44: '2020-07-04'
        }
      }
    ]

    const docB = [
      { id: 'X2' }, { id: 'YY' }, { id: '77' },
      {
        _changes: {
          W9: '2020-07-09',
          44: '2020-07-10',
          X2: '2020-07-11',
          77: '2020-07-30'
        }
      }
    ]

    const expected = [
      { id: 'ED' },
      { id: 'X2' },
      { id: 'YY' },
      { id: 'A6' },
      { id: '77' },
      {
        _changes: {
          ED: new Date('2020-07-05'),
          A6: new Date('2020-07-09'),
          W9: new Date('2020-07-09'),
          44: new Date('2020-07-10'),
          X2: new Date('2020-07-11'),
          77: new Date('2020-07-30')
        }
      }
    ]

    expect(merge(docA, docB)).to.eql(expected)
    expect(merge(docB, docA)).to.eql(expected)
  })

  it('multiple deletions by one replica', function () {
    const replicaA = [
      { id: '44' }, { id: '6A' },
      {
        _changes: {
          ED: '2020-07-14',
          T5: '2020-02-23',
          W9: '2020-06-09'
        }
      }
    ]

    const replicaB = [
      { id: 'ED' }, { id: 'T5' }, { id: '44' }, { id: '6A' }, { id: 'W9' },
      { _changes: {} }
    ]

    const expected = [
      { id: '44' }, { id: '6A' },
      {
        _changes: {
          ED: new Date('2020-07-14'),
          T5: new Date('2020-02-23'),
          W9: new Date('2020-06-09')
        }
      }
    ]

    expect(merge(replicaA, replicaB)).to.eql(expected)
    expect(merge(replicaB, replicaA)).to.eql(expected)
  })

  it('multiple deletions by both replicas', function () {
    const replicaA = [
      { id: 'V8' }, { id: 'S4' }, { id: 'RC' }, { id: '6A' },
      {
        _changes: {
          ED: new Date('2020-07-14'),
          T5: new Date('2020-02-23'),
          W9: new Date('2020-06-09')
        }
      }
    ]

    const replicaB = [
      { id: 'S4' }, { id: '6A' }, { id: 'T5' }, { id: 'W9' },
      {
        _changes: {
          ED: new Date('2020-07-13'),
          V8: new Date('2020-01-18'),
          RC: new Date('2020-09-01')
        }
      }
    ]

    const expected = [
      { id: 'S4' }, { id: '6A' },
      {
        _changes: {
          ED: new Date('2020-07-14'),
          T5: new Date('2020-02-23'),
          W9: new Date('2020-06-09'),
          V8: new Date('2020-01-18'),
          RC: new Date('2020-09-01')
        }
      }
    ]

    expect(merge(replicaA, replicaB)).to.eql(expected)
    expect(merge(replicaB, replicaA)).to.eql(expected)
    expect(merge(replicaA, replicaA)).to.eql(replicaA)
    expect(merge(replicaB, replicaB)).to.eql(replicaB)

    expect(merge(replicaA, merge(replicaA, replicaB))).to.eql(expected)
    expect(merge(replicaB, merge(replicaB, replicaA))).to.eql(expected)
  })

  it('multiple insertions and deletions by both replicas', function () {
    const replicaA = [
      { id: 'S4' }, { id: 'RC' }, { id: '6A' }, { id: 'ZG' }, { id: 'ED' }, { id: 'W9' },
      {
        _changes: {
          V8: '2020-07-14',
          T5: '2020-07-23',
          W9: '2020-07-09',
          '3C': '2020-07-20'
        }
      }
    ]

    const replicaB = [
      { id: 'V8' }, { id: 'HH' }, { id: 'S4' }, { id: 'RC' }, { id: '6A' },
      { id: 'ZG' }, { id: '3C' }, { id: 'T5' }, { id: 'ED' },
      {
        _changes: {
          HH: '2020-07-15',
          '3C': '2020-07-01'
        }
      }
    ]

    const expected = [
      { id: 'HH' }, { id: 'S4' }, { id: 'RC' },
      { id: '6A' }, { id: 'ZG' }, { id: 'ED' }, { id: 'W9' },
      {
        _changes: {
          V8: new Date('2020-07-14'),
          T5: new Date('2020-07-23'),
          W9: new Date('2020-07-09'),
          HH: new Date('2020-07-15'),
          '3C': new Date('2020-07-20')
        }
      }
    ]

    expect(merge(replicaA, replicaB)).to.eql(expected)
    expect(merge(replicaB, replicaA)).to.eql(expected)
  })

  it('one reorder by one replica', function () {
    const replicaA = [
      { id: 'V8' }, { id: 'ZG' }, { id: 'RC' }, { id: 'T5' }, { id: 'ED' },
      { _changes: { RC: '2020-07-14' } }
    ]

    const replicaB = [
      { id: 'V8' }, { id: 'RC' }, { id: 'ZG' }, { id: 'T5' }, { id: 'ED' },
      { _changes: {} }
    ]

    const expected = [
      { id: 'V8' }, { id: 'ZG' }, { id: 'RC' }, { id: 'T5' }, { id: 'ED' },
      { _changes: { RC: new Date('2020-07-14') } }
    ]

    expect(merge(replicaA, replicaB)).to.eql(expected)
    expect(merge(replicaB, replicaA)).to.eql(expected)
  })

  it('multiple reorders by one replica', function () {
    const replicaA = [
      { id: 'ZG' }, { id: 'RC' }, { id: 'V8' }, { id: 'T5' }, { id: 'ED' },
      {
        _changes: {
          RC: '2020-09-01',
          V8: '2020-09-03',
          T5: '2020-09-05'
        }
      }
    ]

    const replicaB = [
      { id: 'V8' }, { id: 'RC' }, { id: 'ZG' }, { id: 'T5' }, { id: 'ED' },
      { _changes: {} }
    ]

    const expected = [
      { id: 'ZG' }, { id: 'RC' }, { id: 'V8' }, { id: 'T5' }, { id: 'ED' },
      {
        _changes: {
          RC: new Date('2020-09-01'),
          V8: new Date('2020-09-03'),
          T5: new Date('2020-09-05')
        }
      }
    ]

    expect(merge(replicaA, replicaB)).to.eql(expected)
    expect(merge(replicaB, replicaA)).to.eql(expected)
  })

  it('multiple reorders by both replica', function () {
    const replicaA = [
      { id: 'V8' }, { id: 'ZG' }, { id: 'RC' }, { id: 'T5' }, { id: 'ED' },
      {
        _changes: {
          RC: '2020-09-01',
          V8: '2020-09-03'
        }
      }
    ]

    const replicaB = [
      { id: 'RC' }, { id: 'ED' }, { id: 'ZG' }, { id: 'T5' }, { id: 'V8' },
      {
        _changes: {
          V8: '2020-09-04',
          ED: '2020-09-02'
        }
      }
    ]

    const expected = [
      { id: 'ED' }, { id: 'ZG' }, { id: 'RC' }, { id: 'T5' }, { id: 'V8' },
      {
        _changes: {
          RC: new Date('2020-09-01'),
          V8: new Date('2020-09-04'),
          ED: new Date('2020-09-02')
        }
      }
    ]

    expect(merge(replicaA, replicaB)).to.eql(expected)
    expect(merge(replicaB, replicaA)).to.eql(expected)
  })

  it('a replica reverses the whole list', function () {
    const replicaA = [
      { id: 'ZG' }, { id: 'V8' }, { id: 'RC' }, { id: 'T5' }, { id: 'ED' },
      { _changes: {} }
    ]

    const replicaB = [
      { id: 'ED' }, { id: 'T5' }, { id: 'RC' }, { id: 'V8' }, { id: 'ZG' },
      {
        _changes: {
          V8: '2020-09-04',
          ZG: '2020-09-04',
          ED: '2020-09-02',
          RC: '2020-09-02',
          T5: '2020-09-02'
        }
      }
    ]

    const expected = [
      { id: 'ED' }, { id: 'T5' }, { id: 'RC' }, { id: 'V8' }, { id: 'ZG' },
      {
        _changes: {
          V8: new Date('2020-09-04'),
          ZG: new Date('2020-09-04'),
          ED: new Date('2020-09-02'),
          RC: new Date('2020-09-02'),
          T5: new Date('2020-09-02')
        }
      }
    ]

    expect(merge(replicaA, replicaB)).to.eql(expected)
    expect(merge(replicaB, replicaA)).to.eql(expected)
  })

  it('a replica reverses the whole list while the other reorders one element', function () {
    const replicaA = [
      { id: 'ZG' }, { id: 'RC' }, { id: 'V8' }, { id: 'T5' }, { id: 'ED' },
      {
        _changes: {
          RC: '2020-09-05'
        }
      }
    ]

    const replicaB = [
      { id: 'ED' }, { id: 'T5' }, { id: 'V8' }, { id: 'ZG' }, { id: 'RC' },
      {
        _changes: {
          V8: '2020-09-04',
          ZG: '2020-09-04',
          ED: '2020-09-02',
          RC: '2020-09-02',
          T5: '2020-09-02'
        }
      }
    ]

    const expected = [
      { id: 'ED' }, { id: 'T5' }, { id: 'V8' }, { id: 'ZG' }, { id: 'RC' },
      {
        _changes: {
          RC: new Date('2020-09-05'),
          V8: new Date('2020-09-04'),
          ZG: new Date('2020-09-04'),
          ED: new Date('2020-09-02'),
          T5: new Date('2020-09-02')
        }
      }
    ]

    expect(merge(replicaA, replicaB)).to.eql(expected)
    expect(merge(replicaB, replicaA)).to.eql(expected)
  })

  xit('multiple reorders by three replicas', function () {
    const replicaA = [
      { id: 'V8' }, { id: 'ZG' }, { id: 'RC' }, { id: 'T5' }, { id: 'ED' },
      {
        _changes: {
          RC: '2020-09-01',
          V8: '2020-09-03'
        }
      }
    ]

    const replicaB = [
      { id: 'RC' }, { id: 'ED' }, { id: 'ZG' }, { id: 'T5' }, { id: 'V8' },
      {
        _changes: {
          V8: '2020-09-04',
          ED: '2020-09-02'
        }
      }
    ]

    const replicaC = [
      { id: 'ZG' }, { id: 'T5' }, { id: 'V8' }, { id: 'ED' }, { id: 'RC' },
      {
        _changes: {
          RC: '2020-09-06',
          ED: '2020-08-31'
        }
      }
    ]

    const expected = [
      // { id: 'ED' }, { id: 'ZG' }, { id: 'RC' }, { id: 'T5' }, { id: 'V8' },
      { id: 'ZG' }, { id: 'T5' }, { id: 'ED' }, { id: 'V8' }, { id: 'RC' },
      {
        _changes: {
          ED: new Date('2020-09-02'),
          RC: new Date('2020-09-06'),
          V8: new Date('2020-09-04')
        }
      }
    ]

    expect(merge(replicaA, merge(replicaB, replicaC))).to.eql(expected)
    expect(merge(replicaB, merge(replicaA, replicaC))).to.eql(expected)
    // expect(merge(replicaB, replicaA)).to.eql(expected)
  })

  xit('multiple insertions and deletions by three replicas', function () {
    const replicaA = [
      { id: 'S4' }, { id: 'RC' }, { id: 'W9' }, { id: 'ED' },
      {
        _changes: {
          W9: new Date('2020-07-09')
        }
      }
    ]

    const replicaB = [
      { id: 'S4' }, { id: 'ED' },
      {
        _changes: {
          RC: new Date('2020-07-15')
        }
      }
    ]

    const replicaC = [
      { id: 'S4' }, { id: 'RC' }, { id: 'UQ' }, { id: 'ED' },
      {
        _changes: {
          UQ: new Date('2020-09-05')
        }
      }
    ]

    const expected = [
      { id: 'S4' }, { id: 'W9' }, { id: 'UQ' }, { id: 'ED' },
      {
        _changes: {
          RC: new Date('2020-07-15'),
          W9: new Date('2020-07-09'),
          UQ: new Date('2020-09-05')
        }
      }
    ]

    expect(merge(replicaA, replicaA)).to.eql(replicaA)
    expect(merge(replicaB, replicaB)).to.eql(replicaB)
    expect(merge(replicaC, replicaC)).to.eql(replicaC)
    expect(merge(replicaB, merge(replicaA, replicaC))).to.eql(expected)
    expect(merge(replicaC, merge(replicaB, replicaA))).to.eql(expected)
    expect(merge(replicaA, merge(replicaB, replicaC))).to.eql(expected)
  })
})
