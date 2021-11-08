/* eslint-disable no-unused-vars */
/* eslint-disable no-unused-expressions */

import chai from 'chai'
import lm from '../src/main.js'

const { expect } = chai
const MARKER = lm.MERGEABLE_MARKER
const POS_KEY = lm.POSITION_KEY

describe('array', function () {
  it('filter simple state', function () {
    const elements = { 0: 'Abc', 1: 'df', 2: 'g', 3: '' }

    const filteredByStringLength = lm.filter(elements, item => item.length > 1)
    const filteredById = lm.filter(elements, (_, key) => key > 1)

    expect(filteredByStringLength).to.be.eql(['Abc', 'df'])
    expect(filteredById).to.be.eql(['g', ''])
  })

  it('filter nested', function () {
    const list = { 100: { age: 12 } }

    lm.set(list, 101, { age: 23 })
    lm.set(list, 102, { age: 72 })

    const filtered = lm.filter(list, item => item.age % 3 === 0)

    expect(filtered).to.be.eql([{ age: 12 }, { age: 72 }])
  })

  it('filter by modifications')

  it('filter without callback gives back array without marker', function () {
    const elements = { 0: 'Abc', 2: 'g', 3: '', [MARKER]: {} }

    const filtered = lm.filter(elements)

    expect(filtered).to.be.eql(['Abc', 'g', ''])
  })

  it('map nested', function () {
    const list = {
      hqm: { base: 2, multiplier: 3, [MARKER]: {} },
      owz: { base: -56, multiplier: 0.9, [MARKER]: {} },
      vpt: { base: 7, multiplier: 21, [MARKER]: {} },
      hox: { base: 24, multiplier: 2 }
    }

    const mapped = lm.map(list, item => item.base * item.multiplier)

    expect(mapped).to.be.eql([6, -50.4, 147, 48])
  })

  describe('array transform', function () {
    it('mergeable to sorted array with index key', function () {
      const mergeable = {
        1: { pos: [8] },
        2: { pos: [2] },
        [MARKER]: { 1: '2021-10-30' }
      }

      const array = lm.sorted(mergeable, { indexKey: 'id', positionKey: 'pos' })

      expect(array).to.be.eql([
        { id: '2', pos: [2] },
        { id: '1', pos: [8] }
      ])
    })

    it('mergeable to sorted array without index key (no way to revert transformation)', function () {
      const mergeable = {
        7: { [POS_KEY]: [24], this: 'that' },
        19: { key: '19', [POS_KEY]: [3, 1, 2] },
        [MARKER]: { 19: '2021-10-30' }
      }

      const array = lm.sorted(mergeable)

      expect(array).to.be.eql([
        { key: '19', [POS_KEY]: [3, 1, 2] },
        { [POS_KEY]: [24], this: 'that' }
      ])
    })

    it('array to mergeable and not keeping index key', function () {
      const array = [
        { id: 2, [POS_KEY]: [2] },
        { id: 1, [POS_KEY]: [8] }
      ]

      const mergeable = lm.fromArray(array, 'id', { dropIndexKey: true })

      expect(mergeable).to.be.eql({
        1: { [POS_KEY]: [8] },
        2: { [POS_KEY]: [2] }
      })
    })

    it('array to mergeable and keeps index key', function () {
      const array = [
        { ad: 'H', [POS_KEY]: [44], name: 'Rolf' },
        { ad: 'U', [POS_KEY]: [9, 1] }
      ]

      const mergeable = lm.fromArray(array, 'ad')

      expect(mergeable).to.be.eql({
        H: { ad: 'H', [POS_KEY]: [44], name: 'Rolf' },
        U: { ad: 'U', [POS_KEY]: [9, 1] }
      })
    })

    it('to sorted array and back without any markers', function () {
      const mergeable = {
        100: { id: 100, p: [7] },
        95: { id: 95, p: [3] }
      }

      const array = lm.sorted(mergeable, { positionKey: 'p' })

      const mergeableOfArray = lm.fromArray(array, 'id')

      expect(mergeable).to.be.eql(mergeableOfArray)
      expect(mergeableOfArray).to.be.eql({
        100: { id: 100, p: [7] },
        95: { id: 95, p: [3] }
      })
      expect(array).to.be.eql([
        { id: 95, p: [3] },
        { id: 100, p: [7] }
      ])
    })

    it('array of non objects to mergeable', function () {
      const mergeable = lm.fromArray(['H', 'U'])

      expect(mergeable).to.be.eql({ H: 'H', U: 'U' })
    })
  })

  describe('manipulate', function () {
    it('move new property in empty mergeable', function () {
      const mergeable = {}
      const date = '2021-10-30'

      lm.set(mergeable, 51, { name: 'Bob' }, { date })
      lm.move(mergeable, 51, null, { date })

      expect(mergeable[51].name).to.be.eql('Bob')
      expect(mergeable[51][POS_KEY][0]).that.is.a('number')
      expect(mergeable[MARKER]).to.be.eql({ 51: date })
      expect(mergeable[51][MARKER]).to.be.eql({ [POS_KEY]: date })
    })

    it('move new property to the start', function () {
      const mergeable = {
        51: { name: 'Bob', p: [100] },
        29: { name: 'Joe', p: [13130355] }
      }

      const date = '2021-10-30'

      lm.set(mergeable, 73, { name: 'Alice' }, { date })
      lm.move(mergeable, 73, null, { date, positionKey: 'p' })

      expect(mergeable[73].name).to.be.eql('Alice')
      expect(mergeable[73].p[0]).that.is.below(mergeable[51].p[0])
      expect(mergeable[MARKER]).to.be.eql({ 73: date })
      expect(mergeable[73][MARKER]).to.be.eql({ p: date })
    })

    it('move existing property in the middle', function () {
      const mergeable = {
        51: { name: 'Bob', p: [100] },
        29: { name: 'Joe', p: [1355] },
        73: { name: 'Alice', p: [1355, 4011] }
      }

      lm.move(mergeable, 73, 51, { positionKey: 'p' })

      expect(mergeable[73].name).to.be.eql('Alice')
      expect(mergeable[73].p[0]).to.be.above(100)
    })

    it('move property to the same position', function () {
      const mergeable = {
        51: { name: 'Bob', p: [100] },
        73: { name: 'Alice', p: [400] },
        29: { name: 'Joe', p: [1355] }
      }

      lm.move(mergeable, 73, 51, { positionKey: 'p' })

      expect(mergeable[73].name).to.be.eql('Alice')
      expect(mergeable[73].p[0]).to.be.above(100)
    })

    it('push new property to the end', function () {
      const mergeable = {
        73: { name: 'Alice', p: [1355, 4011] }
      }

      lm.set(mergeable, 112, { name: 'Carol' })
      lm.push(mergeable, 112, { positionKey: 'p' })

      expect(mergeable[112].name).to.be.eql('Carol')
      expect(mergeable[112].p[0]).that.is.above(1355)
    })

    it('push new property to empty mergeable', function () {
      const mergeable = {}

      lm.set(mergeable, 113, { name: 'Carol' })
      lm.push(mergeable, 113, { positionKey: 'p' })

      expect(mergeable[113].name).to.be.eql('Carol')
      expect(mergeable[113].p[0]).that.is.above(0)
    })

    it('get last element of mergeable', function () {
      const mergeable = {
        81: { p: [44155, 111] },
        73: { p: [1355, 4011] },
        111: { p: [44155, 71] }
      }

      const last = lm.last(mergeable, { positionKey: 'p' })

      expect(last.p).to.be.eql([44155, 111])
    })

    it('get last element of empty mergeable', function () {
      expect(lm.last({})).to.be.undefined
    })

    it('get last element of mergeable with element with no positions', function () {
      const mergeable = { 81: { name: 'Giesela' }, 73: { p: [416] } }
      expect(lm.last(mergeable)).to.be.eql({ p: [416] })
    })

    it('get first element of mergeable', function () {
      const positionKey = 'p'
      const mergeable = { 81: { p: [155, 111] }, 73: { p: [416] }, 111: { p: [155, 71] } }
      expect(lm.first(mergeable, { positionKey }).p).to.be.eql([155, 71])
    })

    it('get first element of mergeable with element with no positions', function () {
      const mergeable = { 81: { name: 'Giesela' }, 73: { p: [416] } }
      expect(lm.first(mergeable)).to.be.eql({ p: [416] })
    })

    it('get first element of empty mergeable', function () {
      expect(lm.first({})).to.be.undefined
    })
  })
})
