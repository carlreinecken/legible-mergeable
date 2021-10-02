/* eslint-disable no-unused-vars */
/* eslint-disable no-unused-expressions */

import chai from 'chai'
import legibleMergeable from '../src/legibleMergeable.js'

const lm = legibleMergeable
const { expect } = chai
const MARKER = legibleMergeable.MERGEABLE_MARKER
const newDate = date => (new Date(date)).toISOString()

describe('api', function () {
  describe('get base', function () {
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

    it('a mergeable object with the proxy via the use getter', function () {
      const date = new Date()

      const item = legibleMergeable.createProxy({
        id: 7,
        name: 'Oatmilk',
        price: 140
      }, { date })

      item.price = 42
      item.isOpen = true
      delete item.name

      const expected = {
        id: 7,
        price: 42,
        isOpen: true
      }

      const expectedMarkerDates = { price: date, isOpen: date, name: date }

      expect(item).to.eql(expected)
      expect(item[MARKER]).to.eql(expectedMarkerDates)
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

      const date = newDate('2020-08-04')

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

      const replicaResultA = legibleMergeable.merge(replicaOriginal, replicaClone)
      const replicaResultB = legibleMergeable.merge(replicaClone, replicaOriginal)

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

  describe('proxy', function () {
    it('manipulate', function () {
      const date = '2021-09-07'
      const task = lm.createProxy({
        title: 'Life Support',
        done: false,
        daysUntilWeekend: ['Friday'],
        foo: {},
        subtasks: {
          1: lm.touch({ title: 'Shower', done: false }),
          eat: { title: 'Eat', done: false, ingredients: ['Pasta'] },
          3: { title: 'Sleep', done: false, [MARKER]: {} },
          [MARKER]: {}
        }
      }, { date })

      task.subtasks[4] = lm.touch({ title: 'Code' })
      task.subtasks[1].title = task.subtasks[1].title + '!'

      for (const id in task.subtasks) {
        task.subtasks[id].done = true
      }

      // Array functions are still available
      task.subtasks.eat.ingredients.push('Tofu')

      const subtasks = task.subtasks

      // This is expected behaviour, but may be confusing: The following changes
      // don't trigger a modification date, cause it happens in its own object
      // scope. Removing the element of an array is the same as changing the
      // property of a nested Mergeable, where the parent also doesn't track
      // the change.
      task.daysUntilWeekend.shift()
      task.foo.bar = 'foo bar'
      // You would need to do an assignment to track it
      task.foo = { bar: 'bar' }

      if (3 in subtasks) {
        delete subtasks[3]
      }

      const subtaskValues = Object.values(subtasks)
      const isAllDone = subtaskValues.filter(t => t.done).length === subtaskValues.length

      if (isAllDone) {
        task.done = true
      }

      const expected = {
        title: 'Life Support',
        done: true,
        daysUntilWeekend: [],
        foo: { bar: 'bar' },
        subtasks: {
          1: { title: 'Shower!', done: true },
          4: { title: 'Code', done: true },
          eat: { title: 'Eat', done: true, ingredients: ['Pasta', 'Tofu'] }
        }
      }

      expect(task).to.eql(expected)
      expect(task[MARKER]).to.eql({ done: date, foo: date })
      expect(task.subtasks[MARKER]).to.eql({ 3: date, 4: date })
      expect(task.subtasks[1][MARKER]).to.eql({ done: date, title: date })
      expect(task.subtasks[4][MARKER]).to.eql({ done: date })
    })

    it('base', function () {
      const original = {
        id: 1,
        name: 'Milk',
        price: 90,
        [MARKER]: { name: '2021-02-02', price: '2021-05-05' }
      }

      const proxy = legibleMergeable.createProxy(original)
      const based = legibleMergeable.base(proxy)

      delete original[MARKER]

      expect(based).to.be.eql(original)
    })

    it('clone', function () {
      const original = {
        id: 1,
        name: 'Milk',
        price: 90,
        [MARKER]: { name: '2021-02-02', price: '2021-05-05' }
      }

      const proxy = legibleMergeable.createProxy(original)
      const cloned = legibleMergeable.clone(proxy)

      expect(cloned).to.be.eql(original)
    })

    it('merge', function () {
      const docA = {
        id: 1,
        name: 'Milk',
        price: 90,
        [MARKER]: { name: '2021-02-02', price: '2021-05-05' }
      }

      const docB = legibleMergeable.createProxy({
        id: 1,
        name: 'Oatmilk',
        price: 140,
        ingredients: { oats: 5, [MARKER]: { oats: '2021-10-02' } },
        [MARKER]: { name: '2021-09-30', ingredients: '2021-10-02' }
      })

      const merged1 = legibleMergeable.merge(docA, docB)
      const merged2 = legibleMergeable.merge(docB, docA)

      const expected = {
        id: 1,
        name: 'Oatmilk',
        price: 90,
        ingredients: { oats: 5, [MARKER]: { oats: '2021-10-02' } },
        [MARKER]: { name: '2021-09-30', price: '2021-05-05', ingredients: '2021-10-02' }
      }

      expect(merged1).to.eql(merged2)
      expect(merged1).to.eql(expected)
    })
  })

  describe('array like functions', function () {
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

    it('filter by modification date')

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
  })
})
