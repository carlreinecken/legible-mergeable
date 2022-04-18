/* eslint-disable no-unused-vars */
/* eslint-disable no-unused-expressions */

import chai from 'chai'
import lm from '../src/main.js'

const { expect } = chai
const MARKER = lm.MERGEABLE_MARKER
const newDate = date => (new Date(date)).toISOString()

describe('basics', function () {
  describe('base', function () {
    it('of an object', function () {
      const item = {
        id: 1,
        name: 'Oatmilk',
        price: 140
      }

      const base = { ...item }

      expect(lm.base(item)).to.eql(base)
    })

    it('of an object with modification marker', function () {
      const original = {
        id: 1,
        name: 'Oatmilk',
        price: 140,
        [MARKER]: {
          price: newDate('2020-08-26')
        }
      }

      const expectedBase = { ...original }
      delete expectedBase[MARKER]

      const base = lm.base(original)

      expect(base).to.eql(expectedBase)
      expect(base[MARKER]).to.be.undefined
      expect(lm.modifications(original)).to.eql(original[MARKER])
    })

    it('of an object with null values', function () {
      const item = {
        id: 44,
        name: null,
        price: 90
      }

      const base = { ...item }

      expect(lm.base(item)).to.eql(base)
    })

    it('base of non object', function () {
      expect(lm.base(null)).to.eql({})
      expect(lm.base('hi bob')).to.eql({})
    })

    it('clone of non object', function () {
      expect(lm.clone(null)).to.eql({})
      expect(lm.clone('hi bob')).to.eql({})
    })

    it('touch a non object', function () {
      expect(() => lm.touch(null)).to.throw(lm.OBJECT_EXPECTED)
      expect(() => lm.touch('hi bob')).to.throw(lm.OBJECT_EXPECTED)
    })

    it('size of mergeable', function () {
      const mergeable = {
        U: 'hi',
        I: 'bye',
        [MARKER]: { U: '2021-11-06', I: '2021-11-07' }
      }

      expect(lm.size(mergeable)).to.be.eql(2)
    })

    it('keys', function () {
      const item = {
        id: 22,
        name: 'Edward',
        price: 45,
        [MARKER]: { age: '2022-04-19', id: '2022-04-19' }
      }

      expect(lm.keys(item)).to.be.eql(['id', 'name', 'price'])
    })

    it('compare', function () {
      const itemA = { A: 'aa', B: 'bb', C: 'cc' }
      const itemB = { B: 'bb', D: 'dd', [MARKER]: {} }

      const result1 = { missing: ['A', 'C'], added: ['D'] }
      const result2 = { missing: ['D'], added: ['A', 'C'] }

      expect(lm.compare(itemA, itemB)).to.be.eql(result1)
      expect(lm.compare(itemB, itemA)).to.be.eql(result2)
    })
  })

  describe('modifications', function () {
    it('set modifications', function () {
      const mergeable = {}

      const mods = lm.modifications(mergeable, { U: '2021-11-06', I: '2021-11-07' })

      const expectedModifications = { U: '2021-11-06', I: '2021-11-07' }
      expect(mergeable).to.be.eql({ [MARKER]: expectedModifications })
      expect(mods).to.be.eql(expectedModifications)
    })

    it('get modifications', function () {
      const mergeable = {
        U: 'hi',
        I: 'bye',
        [MARKER]: { U: '2021-11-06', I: '2021-11-07' }
      }

      const mods = lm.modifications(mergeable)
      const expectedModifications = { U: '2021-11-06', I: '2021-11-07' }

      expect(mergeable).to.be.eql({
        U: 'hi',
        I: 'bye',
        [MARKER]: { U: '2021-11-06', I: '2021-11-07' }
      })
      expect(mods).to.be.eql(expectedModifications)
    })

    it('get modifications of mergeable with no modifications', function () {
      const mergeable = { U: 'hi', I: 'bye' }

      const mods = lm.modifications(mergeable)

      expect(mergeable).to.be.eql({ U: 'hi', I: 'bye' })
      expect(mods).to.be.eql({})
    })

    it('get modifications of non object', function () {
      const mods = lm.modifications('')

      expect(mods).to.be.eql({})
    })
  })

  describe('manipulate', function () {
    it('an unmodified object', function () {
      const date = newDate('2021-10-01')

      const item = {
        id: 1,
        name: 'Oatmilk',
        price: 140
      }

      lm.set(item, 'price', 135, { date })
      lm.set(item, 'isOpen', false, { date })

      const expected = {
        id: 1,
        name: 'Oatmilk',
        price: 135,
        isOpen: false,
        [MARKER]: { price: date, isOpen: date }
      }

      expect(item).to.eql(expected)
    })

    it('a mergeable object with changes', function () {
      const date = newDate('2020-09-06')

      const item = {
        id: 1,
        name: 'Oatmilk',
        price: 240,
        isOpen: true,
        [MARKER]: {
          name: newDate('2020-08-03'),
          isOpen: newDate('2020-08-05'),
          price: newDate('2020-09-01')
        }
      }

      if (item.price > 200) {
        lm.set(item, 'name', 'Almondmilk', { date })
        lm.drop(item, 'isOpen', { date })
      }

      lm.set(item, 'isCold', !item.isOpen, { date })

      const expected = {
        id: 1,
        name: 'Almondmilk',
        price: 240,
        isCold: true,
        [MARKER]: { price: newDate('2020-09-01'), name: date, isOpen: date, isCold: date }
      }

      expect(item).to.eql(expected)
    })

    it('renew a key', function () {
      const item = { name: 'oatmilk', price: 140 }

      lm.renew(item, 'name', { date: '2021-10-23' })

      const expected = { name: 'oatmilk', price: 140, [MARKER]: { name: '2021-10-23' } }
      expect(item).to.eql(expected)
    })

    it('set a key of a non object', function () {
      const setFn = () => lm.set('hello', 'name', 'bob')

      expect(setFn).to.throw('Cannot create property \'name\' on string \'hello\'')
    })

    it('renew multiple keys', function () {
      const item = { name: 'almondmilk', price: 210 }
      const date = '2021-10-23'

      lm.renew(item, ['name', 'price'], { date })

      const expected = {
        name: 'almondmilk',
        price: 210,
        [MARKER]: { name: date, price: date }
      }

      expect(item).to.eql(expected)
    })
  })

  describe('merge', function () {
    it('a cloned and changed object', function () {
      const replicaA = {
        name: 'Oatmilk',
        price: 120,
        isCold: true,
        isOpen: false,
        [MARKER]: {
          name: '2020-08-03',
          isCold: '2020-08-05'
        }
      }

      const replicaB = lm.clone(replicaA)

      const date = '2020-08-04'

      lm.set(replicaB, 'name', 'Almondmilk', { date })
      lm.set(replicaB, 'isCold', false, { date })
      lm.drop(replicaB, 'price', { date })

      const replicaC1 = lm.merge(replicaA, replicaB)
      const replicaC2 = lm.merge(replicaB, replicaA)

      const expected = {
        name: 'Almondmilk',
        isCold: true,
        isOpen: false,
        [MARKER]: { name: date, price: date, isCold: '2020-08-05' }
      }

      expect(replicaA).to.not.eql(replicaB)
      expect(replicaC1).to.eql(replicaC2)
      expect(replicaC1).to.eql(expected)
    })
  })

  describe('recursive', function () {
    const getSample = () => ({
      7: { uid: 7, name: 'gustav', [MARKER]: {} },
      foo: {
        uid: 'foo',
        age: 8,
        nested: {
          list: [1, 2, 4, 8, 16, 32, 64],
          [MARKER]: { list: newDate('2020-08-05') }
        },
        [MARKER]: {}
      },
      noMergeable: { uid: 'bar', age: 21 }
    })

    it('change properties of nested objects', function () {
      const item = getSample()

      lm.drop(item[7], 'name')
      lm.set(item.foo, 'age', 10)
      lm.set(item.foo.nested, 'age', 44)

      expect(item[7].name).to.be.undefined
      expect(item.foo.age).to.be.eql(10)
      expect(item.foo.nested.age).to.be.eql(44)
    })

    it('get base', function () {
      const item = getSample()

      const expectedBase = {
        7: { uid: 7, name: 'gustav' },
        foo: { uid: 'foo', age: 8, nested: { list: [1, 2, 4, 8, 16, 32, 64] } },
        noMergeable: { uid: 'bar', age: 21 }
      }

      expect(lm.base(item)).to.eql(expectedBase)
    })

    it('clone', function () {
      const item = getSample()

      const itemClone = lm.clone(item)

      expect(item).to.eql(itemClone).but.to.not.equal(itemClone)
    })

    it('merge', function () {
      const replicaOriginal = {
        1: {
          name: 'Thriller', price: 9.99, authors: ['Peter'], [MARKER]: { name: '2021-08-03', price: '2021-08-01' }
        },

        2: {
          name: 'Novel', price: 5.99, authors: ['Fridolin', 'Gustav'], [MARKER]: { name: '2021-08-03', price: '2021-08-01' }
        },

        3: {
          name: 'Crime', price: 7.0, authors: ['Donald'], [MARKER]: { name: '2021-07-07', price: '2021-07-14' }
        },

        noMergePlease: { name: 'Not mergeable' },
        [MARKER]: { 1: '2021-08-01' }
      }

      const replicaClone = lm.clone(replicaOriginal)
      const date = '2021-08-10'

      lm.set(replicaClone[2], 'authors', ['Bob'], { date })
      lm.drop(replicaClone, 2, { date })
      lm.set(replicaClone[1], 'name', 'Scifi', { date })

      lm.set(replicaClone[3], 'price', replicaClone[3].price * 0.9, { date })
      lm.set(replicaClone[3], 'authors', [...replicaClone[3].authors, 'Daisy'], { date })
      lm.drop(replicaClone[3], 'name', { date })

      const replicaResultA = lm.merge(replicaOriginal, replicaClone)
      const replicaResultB = lm.merge(replicaClone, replicaOriginal)

      const expected = {
        1: {
          name: 'Scifi', price: 9.99, authors: ['Peter'], [MARKER]: { name: '2021-08-10', price: '2021-08-01' }
        },

        3: {
          price: 6.3, authors: ['Donald', 'Daisy'], [MARKER]: { name: '2021-08-10', price: '2021-08-10', authors: '2021-08-10' }
        },

        noMergePlease: { name: 'Not mergeable' },
        [MARKER]: { 1: '2021-08-01', 2: date }
      }

      expect(replicaOriginal).to.not.eql(replicaClone)
      expect(replicaResultA).to.eql(replicaResultB)
      expect(replicaResultA).to.eql(expected)
    })
  })
})
