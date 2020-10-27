const legibleMergeable = require('../dist/legible-mergeable.js')
const expect = require('chai').expect
const MODIFICATIONS_KEY = legibleMergeable.KEY.MODIFICATIONS
const POSITIONS_KEY = legibleMergeable.KEY.POSITIONS

/* eslint-disable no-unused-expressions */

describe('api', function () {
  describe('create', function () {
    it('a mergeable object', function () {
      const base = {
        id: 1,
        name: 'Oatmilk',
        price: 140
      }

      const item = legibleMergeable.Object(base)

      expect(item.base()).to.eql(base)
      expect(item.dump()).to.eql(base)
    })

    it('a mergeable array base by constructor')

    it('a mergeable array', function () {
      const date = new Date('2020-09-13').toISOString()
      const list = legibleMergeable.Array()
      const item = {
        id: 1,
        name: 'Hazelnutmilk',
        purchased: false
      }

      list.push(item, date)

      expect(list.base()).to.eql([item])
      const meta = list.meta()
      expect(meta[MODIFICATIONS_KEY]).to.eql({ [item.id]: date })
      expect(typeof meta[POSITIONS_KEY][item.id]).to.equal('string')
    })

    it('a mergeable object with changes', function () {
      const original = {
        id: 1,
        name: 'Oatmilk',
        price: 140,
        [MODIFICATIONS_KEY]: {
          price: new Date('2020-08-26')
        }
      }

      const item = legibleMergeable.Object(original)
      expect(item.dump()).to.eql(original)

      delete original[MODIFICATIONS_KEY]
      expect(item.base()).to.eql(original)
    })
  })

  describe('manipulate', function () {
    it('a mergeable object', function () {
      const date = new Date()
      const item = legibleMergeable.Object({
        id: 1,
        name: 'Oatmilk',
        price: 140
      })

      item.set('price', 135, date)
      item.set('isOpen', false, date)

      const dump = item.dump()
      const changes = dump[MODIFICATIONS_KEY]
      delete dump[MODIFICATIONS_KEY]

      const expected = {
        id: 1,
        name: 'Oatmilk',
        price: 135,
        isOpen: false
      }

      expect(dump).to.eql(expected)
      expect(changes.isOpen.getTime()).to.equal(date.getTime())
      expect(changes.price.getTime()).to.equal(date.getTime())
      expect(changes.name).to.be.undefined
      expect(changes.id).to.be.undefined
    })

    it('a mergeable object with changes', function () {
      const date = new Date('2020-09-06')
      const original = {
        id: 1,
        name: 'Oatmilk',
        price: 240,
        isOpen: true,
        [MODIFICATIONS_KEY]: {
          name: new Date('2020-08-03'),
          isOpen: new Date('2020-08-05'),
          price: new Date('2020-09-01')
        }
      }
      const item = legibleMergeable.Object(original)

      if (item.get('price') > 200) {
        item.set('name', 'Almondmilk', date)
        item.delete('isOpen', date)
      }
      if (!item.has('isOpen')) {
        item.set('isCold', true, date)
      }

      const dump = item.dump()
      const changes = dump[MODIFICATIONS_KEY]
      delete dump[MODIFICATIONS_KEY]

      const expected = {
        id: 1,
        name: 'Almondmilk',
        price: 240,
        isCold: true
      }

      expect(dump).to.eql(expected)
      expect(changes.name.getTime()).to.equal(date.getTime())
      expect(changes.isCold.getTime()).to.equal(date.getTime())
      expect(changes.isOpen.getTime()).to.equal(date.getTime())
      expect(changes.price.getTime()).to.equal((new Date('2020-09-01').getTime()))
      expect(changes.id).to.be.undefined
    })

    it('a mergeable array by pushing multiple items, checking and getting elements', function () {
      const date = new Date('2020-09-20').toISOString()
      const list = legibleMergeable.Array()
      const item9 = { id: 9, name: 'Hazelnutmilk', purchased: false }
      const item11 = { id: 11, name: 'Almondmilk', purchased: true }
      const item20 = { id: 20, name: 'Soymilk' }

      list.push(item9, date)
      list.push(item11, date)
      if (list.has(item9.id)) {
        item20.purchased = item9.purchased
        list.push(item20, date)
      }

      expect(list.base()).to.eql([item9, item11, item20])
    })

    it('a mergeable array by inserting multiple items and one in between', function () {
      const date = new Date('2020-09-20').toISOString()
      const list = legibleMergeable.Array()
      const item1 = { id: 44, name: 'Oatmilk', purchased: true }
      const item2 = { id: 11, name: 'Almondmilk', purchased: false }
      const item3 = { id: 20, name: 'Soymilk', purchased: false }
      const item4 = { id: 1, name: 'Water', purchased: false }
      const item5 = { id: 3, name: 'Soup', purchased: true }

      list.insert(item1, null, date)
      list.insert(item2, 44, date)
      list.insert(item3, 44, date)
      list.push(item4, date)
      list.insert(item5, null, date)

      expect(list.base()).to.eql([item5, item1, item3, item2, item4])
    })

    it('a mergeable array by moving multiple items', function () {
      const rye = { id: 1, name: 'Rye', season: 'cool' }
      const wheat = { id: 2, name: 'Wheat', season: 'cool' }
      const barley = { id: 3, name: 'Barley', season: 'cool' }
      const oat = { id: 4, name: 'Oat', season: 'cool' }
      const millet = { id: 5, name: 'Millet', season: 'warm' }
      const maize = { id: 6, name: 'Maize', season: 'warm' }

      const grains = legibleMergeable.Array([
        rye, wheat, barley, oat, millet, maize
      ])

      grains.move(rye.id, barley.id)
      grains.move(rye.id, barley.id)
      grains.move(barley.id, rye.id)
      grains.move(maize.id, rye.id)
      grains.move(oat.id, null)
      grains.move(wheat.id, grains.last().id())

      expect(grains.base()).to.eql([oat, rye, maize, barley, millet, wheat])
    })

    it('a mergeable array by moving multiple items', function () {
      const rye = { id: 'qox', name: 'Rye', season: 'cool' }
      const wheat = { id: 'a71', name: 'Wheat', season: 'cool' }
      const barley = { id: '2is', name: 'Barley', season: 'cool' }

      const grains = legibleMergeable.Array([rye, wheat, barley])

      grains.delete(rye.id)
      grains.delete(barley.id)

      expect(grains.base()).to.eql([wheat])
    })

    it('a mergeable array by moving multiple items to the beginning', function () {
      const rye = { id: 'qox', name: 'Rye' }
      const wheat = { id: 'a71', name: 'Wheat' }
      const barley = { id: '2is', name: 'Barley' }

      const grains = legibleMergeable.Array([rye, wheat, barley])

      grains.move(barley.id, null)
      grains.move(wheat.id, null)
      grains.move(rye.id, null)

      expect(grains.base()).to.eql([rye, wheat, barley])

      // The array is only sorted when merging. Which means the positions
      // could not mean the same as the actual array order.
      expect(grains.merge(grains).base()).to.eql([rye, wheat, barley])
    })
  })

  describe('merge', function () {
    it('a cloned and changed object', function () {
      const replicaA = legibleMergeable.Object({
        name: 'Oatmilk',
        price: 120,
        isCold: true,
        isOpen: false,
        [MODIFICATIONS_KEY]: {
          name: '2020-08-03',
          isCold: '2020-08-05'
        }
      })

      const replicaB = replicaA.clone()
      const date = new Date('2020-08-04')
      replicaB.set('name', 'Almondmilk', date)
      replicaB.set('isCold', false, date)
      replicaB.delete('price', date)

      const replicaC1 = legibleMergeable.merge(replicaA, replicaB)
      const replicaC2 = replicaB.merge(replicaA)

      const dump = replicaC1.dump()
      const changes = dump[MODIFICATIONS_KEY]
      delete dump[MODIFICATIONS_KEY]

      const expected = {
        name: 'Almondmilk',
        isCold: true,
        isOpen: false
      }

      expect(replicaC1).to.eql(replicaC2)
      expect(dump).to.eql(expected)
      expect(replicaA.size()).to.equal(4)
      expect(replicaB.size()).to.equal(3)
      expect(changes.name.getTime()).to.equal(date.getTime())
      expect(changes.price.getTime()).to.equal(date.getTime())
      expect(changes.isCold.getTime()).to.equal((new Date('2020-08-05')).getTime())
      expect(changes.isOpen).to.be.undefined
    })
  })

  it('a modified array')

  it('an empty array')

  it('two modified arrays with modified objects', function () {
    const item1 = { id: 1, title: 'Buy Flour', done: true }
    const item2 = { id: 2, title: 'Change Lightbulb', done: false }
    const item3 = { id: 3, title: 'Cook spicy meal', done: false }

    const todosAlice = legibleMergeable.Array([item1, item2, item3])
    const todosBob = todosAlice.clone()

    const date = (new Date('2020-10-27')).toISOString()

    todosBob.get(1).set('title', 'Buy Sugar', date)
    todosBob.get(3).set('done', true, date)
    todosAlice.get(2).set('due', '2030-12-31', date)
    todosAlice.delete(3, date)

    const expected = [
      { id: 1, title: 'Buy Sugar', done: true, [MODIFICATIONS_KEY]: { title: date } },
      { id: 2, title: 'Change Lightbulb', done: false, due: '2030-12-31', [MODIFICATIONS_KEY]: { due: date } }
    ]

    todosBob.merge(todosAlice)
    todosAlice.merge(todosBob)

    expect(todosBob.base()).to.eql(expected)
    expect(todosAlice.base()).to.eql(expected)
  })
})
