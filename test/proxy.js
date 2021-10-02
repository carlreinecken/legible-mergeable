/* eslint-disable no-unused-vars */
/* eslint-disable no-unused-expressions */

import chai from 'chai'
import lm from '../src/main.js'

const { expect } = chai
const MARKER = lm.MERGEABLE_MARKER

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

    const proxy = lm.createProxy(original)
    const based = lm.base(proxy)

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

    const proxy = lm.createProxy(original)
    const cloned = lm.clone(proxy)

    expect(cloned).to.be.eql(original)
  })

  it('merge', function () {
    const docA = {
      id: 1,
      name: 'Milk',
      price: 90,
      [MARKER]: { name: '2021-02-02', price: '2021-05-05' }
    }

    const docB = lm.createProxy({
      id: 1,
      name: 'Oatmilk',
      price: 140,
      ingredients: { oats: 5, [MARKER]: { oats: '2021-10-02' } },
      [MARKER]: { name: '2021-09-30', ingredients: '2021-10-02' }
    })

    const merged1 = lm.merge(docA, docB)
    const merged2 = lm.merge(docB, docA)

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
