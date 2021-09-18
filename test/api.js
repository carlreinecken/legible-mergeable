import chai from 'chai'
import legibleMergeable from '../src/legibleMergeable.js'

const { expect } = chai
const MARKER = legibleMergeable.MERGEABLE_MARKER
const newDate = date => (new Date(date)).toISOString()

/* eslint-disable no-unused-vars */
/* eslint-disable no-unused-expressions */

describe('api', function () {
  describe('create', function () {
    it('an empty object', function () {
      const item = legibleMergeable.create()

      // console.log('item', item.dump())

      expect(item.base()).to.eql({})
      expect(item.dump()).to.eql({ [MARKER]: {} })
    })

    it('a mergeable object', function () {
      const base = {
        id: 1,
        name: 'Oatmilk',
        price: 140
      }

      const item = legibleMergeable.create(base)

      expect(item.base()).to.eql(base)

      base[MARKER] = {}
      expect(item.dump()).to.eql(base)
    })

    it('a mergeable object with changes', function () {
      const original = {
        id: 1,
        name: 'Oatmilk',
        price: 140,
        [MARKER]: {
          price: newDate('2020-08-26')
        }
      }

      const item = legibleMergeable.create(original)
      expect(item.dump()).to.eql(original)

      delete original[MARKER]
      expect(item.base()).to.eql(original)
    })
  })

  describe('manipulate', function () {
    it('a mergeable object', function () {
      const date = newDate(new Date())
      const item = legibleMergeable.create({
        id: 1,
        name: 'Oatmilk',
        price: 140
      })

      item.set('price', 135, { date })
      item.set('isOpen', false, { date })

      const dump = item.dump()
      const changes = dump[MARKER]
      delete dump[MARKER]

      const expected = {
        id: 1,
        name: 'Oatmilk',
        price: 135,
        isOpen: false
      }

      expect(dump).to.eql(expected)
      expect(changes.isOpen).to.equal(date)
      expect(changes.price).to.equal(date)
      expect(changes.name).to.be.undefined
      expect(changes.id).to.be.undefined
    })

    it('a mergeable object with the proxy via the use getter', function () {
      const item = legibleMergeable.create({
        id: 7,
        name: 'Oatmilk',
        price: 140
      })

      const proxy = item._proxy

      proxy.price = 42
      proxy.isOpen = true
      delete proxy.name

      const dump = item.dump()
      const changes = dump[MARKER]
      delete dump[MARKER]

      const expected = {
        id: 7,
        price: 42,
        isOpen: true
      }

      expect(dump).to.eql(expected)
      expect(item._proxy.isOpen).to.eql(true)
      expect(item._proxy.price).to.eql(42)
      expect(item._proxy.name).to.be.undefined
      expect(changes.isOpen).to.be.not.null
      expect(changes.price).to.be.not.null
      expect(changes.name).to.be.not.null
      expect(changes.id).to.be.undefined
    })

    it('a mergeable object with changes', function () {
      const date = newDate('2020-09-06')
      const original = {
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
      const item = legibleMergeable.create(original)

      if (item.get('price') > 200) {
        item.set('name', 'Almondmilk', { date })
        item.delete('isOpen', { date })
      }
      if (!item.has('isOpen')) {
        item.set('isCold', true, { date })
      }

      const dump = item.dump()
      const changes = dump[MARKER]
      delete dump[MARKER]

      const expected = {
        id: 1,
        name: 'Almondmilk',
        price: 240,
        isCold: true
      }

      expect(dump).to.eql(expected)
      expect(changes.name).to.equal(date)
      expect(changes.isCold).to.equal(date)
      expect(changes.isOpen).to.equal(date)
      expect(changes.price).to.equal(newDate('2020-09-01'))
      expect(changes.id).to.be.undefined
    })
  })

  describe('merge', function () {
    it('a cloned and changed object', function () {
      const replicaA = legibleMergeable.create({
        name: 'Oatmilk',
        price: 120,
        isCold: true,
        isOpen: false,
        [MARKER]: {
          name: '2020-08-03',
          isCold: '2020-08-05'
        }
      })

      const replicaB = replicaA.clone()
      const date = newDate('2020-08-04')
      replicaB.set('name', 'Almondmilk', { date })
      replicaB.set('isCold', false, { date })
      replicaB.delete('price', { date })

      const replicaC1 = legibleMergeable.merge(replicaA, replicaB)
      const replicaC2 = replicaB.merge(replicaA)

      const dump = replicaC1.dump()
      const changes = dump[MARKER]
      delete dump[MARKER]

      const expected = {
        name: 'Almondmilk',
        isCold: true,
        isOpen: false
      }

      expect(replicaC1.base()).to.eql(replicaC2.base())
      expect(dump).to.eql(expected)
      expect(replicaA.size()).to.equal(4)
      expect(replicaB.size()).to.equal(3)
      expect(changes.name).to.equal(date)
      expect(changes.price).to.equal(date)
      expect(changes.isCold).to.equal('2020-08-05')
      expect(changes.isOpen).to.be.undefined
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

    it('get nested objects', function () {
      const item = legibleMergeable.create(getSample())

      expect(item.get(7).__isMergeable).to.be.true
      expect(item.get('foo').__isMergeable).to.be.true
      expect(item.get('foo').get('nested').__isMergeable).to.be.true
      expect(item.get('noMergeable').__isMergeable).to.be.undefined
    })

    it('change properties of nested objects', function () {
      const item = legibleMergeable.create(getSample())

      item.get(7).delete('name')
      item.get('foo').set('age', 10)
      item.get('foo').get('nested').set('age', 44)

      expect(item.get(7).get('name')).to.be.undefined
      expect(item.get('foo').get('age')).to.be.eql(10)
      expect(item.get('foo').get('nested').get('age')).to.be.eql(44)
    })

    it('get base', function () {
      const raw = getSample()
      const item = legibleMergeable.create(raw)

      const expectedBase = {
        7: { uid: 7, name: 'gustav' },
        foo: { uid: 'foo', age: 8, nested: { list: [1, 2, 4, 8, 16, 32, 64] } },
        noMergeable: { uid: 'bar', age: 21 }
      }

      expect(item.base()).to.eql(expectedBase).but.to.not.equal(expectedBase)
    })

    it('get base and dump', function () {
      const raw = getSample()
      const item = legibleMergeable.create(raw)

      const expectedDump = raw
      expectedDump[MARKER] = {}

      expect(item.dump()).to.eql(expectedDump).but.to.not.equal(expectedDump)
    })

    it('clone', function () {
      const item = legibleMergeable.create(getSample())
      item.refresh(7)
      item.foo.refresh('age')

      // console.log(item.dump())
      // console.log('-----')

      const itemClone = item.clone().dump()

      // console.log(item.clone().dump())

      // expect(item.dump()).to.eql(itemClone)
      expect(item.dump()).to.eql(itemClone).but.to.not.equal(itemClone)
    })

    it('merge', function () {
      const replicaOriginal = legibleMergeable.create({
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
      })

      const replicaClone = replicaOriginal.clone()
      const date = '2021-08-10'

      replicaClone.get(2).set('authors', ['Bob'], { date })
      replicaClone.delete(2, { date })
      replicaClone.get(1).set('name', 'Scifi', { date })
      replicaClone.get(3).modify(ob => (ob.price = ob.price * 0.9), { date })
      replicaClone.get(3).modify(ob => (ob.authors = [...ob.authors, 'Daisy']), { date })
      replicaClone.get('3').delete('name', { date })

      const replicaResultStatic = legibleMergeable.merge(replicaOriginal, replicaClone)
      const replicaResult = replicaClone.merge(replicaOriginal)

      const dump = replicaResultStatic.dump()

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

      expect(replicaResultStatic).to.eql(replicaResult)
      expect(dump).to.eql(expected)
    })
  })

  it('proxy', function () {
    const task = legibleMergeable.create({
      title: 'Life Support',
      done: false,
      daysUntilWeekend: ['Friday'],
      foo: {},
      subtasks: legibleMergeable.create({
        1: legibleMergeable.create({ title: 'Shower', done: false }),
        eat: { title: 'Eat', done: false, ingredients: ['Pasta'] },
        3: { title: 'Sleep', done: false }
      })
    })

    const date = '2021-09-07'

    task.modify(task => {
      task.subtasks[4] = legibleMergeable.create({ title: 'Code' })
      task.subtasks[1].title = task.subtasks[1].title + '!'

      for (const id in task.subtasks) {
        task.subtasks[id].done = true
      }

      // Array functions are still available
      task.subtasks.eat.ingredients.push('Tofu')

      const subtasks = task.subtasks

      // This is expected behaviour, but may be confusing: The following change
      // don't trigger a modification date, cause it happens in its own object
      // scope. Removing the element of an array is the same as changing the
      // property of a nested Mergeable, where the parent also doesn't track
      // the change.
      task.daysUntilWeekend.shift()
      task.foo.bar = 'foo bar'
      // You would need to do an assignment to track it
      task.foo = {}

      if (3 in subtasks) {
        delete subtasks[3]
      }

      const subtaskValues = Object.values(subtasks)
      const isAllDone = subtaskValues.filter(t => t.done).length === subtaskValues.length

      if (isAllDone) {
        task.done = true
      }
    }, { date })

    const expected = {
      title: 'Life Support',
      done: true,
      daysUntilWeekend: [],
      foo: {},
      subtasks: {
        1: { title: 'Shower!', done: true, [MARKER]: { title: '2021-09-07', done: '2021-09-07' } },
        4: { title: 'Code', done: true, [MARKER]: { done: '2021-09-07' } },
        eat: { title: 'Eat', done: true, ingredients: ['Pasta', 'Tofu'] },
        [MARKER]: { 3: '2021-09-07', 4: '2021-09-07' }
      },
      [MARKER]: { done: '2021-09-07', foo: '2021-09-07' }
    }

    expect(task.dump()).to.eql(expected)
  })

  describe('compare', function () {
    // TODO
    xit('same docs', function () {
    })

    xit('with a doc that has one changed property', function () {
    })

    xit('with a doc that has one added property', function () {
    })

    it('whatsup with nested')
  })

  xdescribe('array like functions', function () {
    it('filter simple state', function () {
      const doc = legibleMergeable.create({ 0: 'Abc', 1: 'df', 2: 'g', 3: '' })

      const filteredByStringLength = doc.filter(item => item.length > 1)
      const filteredById = doc.filter((_, key) => key > 1)

      expect(filteredByStringLength).to.be.eql({ 0: 'Abc', 1: 'df' })
      expect(filteredById).to.be.eql({ 2: 'g', 3: '' })
    })

    it('filter nested', function () {
      const doc = legibleMergeable.create()

      doc.set(100, { age: 12 }, { mergeable: false })
      doc.set(101, { age: 23 }, { mergeable: true })

      const item102 = legibleMergeable.create({ age: 72 })
      doc.set(102, item102)

      const filteredNormal = doc.filter(item => item.age % 3 === 0, { proxy: false })
      const filteredWithProxy = doc.filter(item => item.age % 3 === 0, { proxy: true })

      expect(filteredNormal).to.be.eql({ 100: { age: 12 } })
      expect(filteredWithProxy).to.be.eql({ 100: { age: 12 }, 102: item102 })
    })

    it('filter by modification date')

    it('map nested', function () {
      const doc = legibleMergeable.create({
        hqm: { base: 2, multiplier: 3, [MARKER]: {} },
        owz: { base: -56, multiplier: 0.9, [MARKER]: {} },
        vpt: { base: 7, multiplier: 21, [MARKER]: {} },
        hox: { base: 24, multiplier: 2 }
      })

      const mappedNormal = doc.map(item => item.base * item.multiplier, { proxy: false })
      const mappedWithProxy = doc.map(item => item.base * item.multiplier, { proxy: true, toArray: true })

      expect(mappedNormal).to.be.eql({ hox: 48, hqm: NaN, owz: NaN, vpt: NaN })
      expect(mappedWithProxy).to.be.eql([6, -50.4, 147, 48])
    })
  })
})
