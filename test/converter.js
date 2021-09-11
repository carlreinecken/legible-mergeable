const expect = require('chai').expect

const legibleMergeable = require('../dist/legible-mergeable.js')
const converter = legibleMergeable._converter
const MODS_KEY = legibleMergeable.MERGEABLE_MARKER
const __isMergeable = true

/* eslint-disable no-unused-expressions */

describe('converter', function () {
  it('dump to transfer', function () {
    const dump = { abc: 'def', [MODS_KEY]: { abc: '2021-09-11' } }
    const transfer = { _state: { abc: 'def' }, _modifications: { abc: '2021-09-11' }, __isMergeable }

    const result = converter.fromDump(dump)

    expect(result).to.eql(transfer)
  })

  it('dump to transfer (nested)', function () {
    const dump = {
      abc: 'def',
      ghi: { jkl: 'mno', [MODS_KEY]: { jkl: '2021-09-12' } },
      [MODS_KEY]: { abc: '2021-09-11' }
    }

    const transfer = {
      _state: {
        abc: 'def',
        ghi: {
          _state: { jkl: 'mno' },
          _modifications: { jkl: '2021-09-12' },
          __isMergeable
        }
      },
      _modifications: { abc: '2021-09-11' },
      __isMergeable
    }

    const result = converter.fromDump(dump)

    expect(result).to.eql(transfer)
  })

  it('dump to mergeable (nested)', function () {
    const dump = {
      abc: 'def',
      ghi: { jkl: 'mno', [MODS_KEY]: { jkl: '2021-09-12' } },
      [MODS_KEY]: { abc: '2021-09-11' }
    }

    const result = converter.fromDump(dump, (property) => new legibleMergeable.Mergeable(property))

    expect(result).instanceof(legibleMergeable.Mergeable)
    expect(result._state.ghi).instanceof(legibleMergeable.Mergeable)
  })

  it('transfer to dump', function () {
    const transfer = {
      _state: {
        abc: 'def'
      },
      _modifications: { abc: '2021-09-11' },
      __isMergeable
    }

    const dump = {
      abc: 'def',
      [MODS_KEY]: { abc: '2021-09-11' }
    }

    const result = converter.toDump(transfer)

    expect(result).to.eql(dump)
  })

  it('transfer to dump (nested)', function () {
    const transfer = {
      _state: {
        abc: 'def',
        ghi: {
          _state: { jkl: 'mno' },
          _modifications: { jkl: '2021-09-12' },
          __isMergeable
        }
      },
      _modifications: { abc: '2021-09-11' },
      __isMergeable
    }

    const dump = {
      abc: 'def',
      ghi: { jkl: 'mno', [MODS_KEY]: { jkl: '2021-09-12' } },
      [MODS_KEY]: { abc: '2021-09-11' }
    }

    const result = converter.toDump(transfer)

    expect(result).to.eql(dump)
  })

  it('transfer to mergeable (nested)', function () {
    const transfer = {
      _state: {
        abc: 'def',
        ghi: {
          _state: { jkl: 'mno' },
          _modifications: { jkl: '2021-09-12' },
          __isMergeable
        }
      },
      _modifications: { abc: '2021-09-11' },
      __isMergeable
    }

    const result = converter.fromTransfer(transfer, (property) => new legibleMergeable.Mergeable(property))

    expect(result).instanceof(legibleMergeable.Mergeable)
    expect(result._state.ghi).instanceof(legibleMergeable.Mergeable)
  })
})
