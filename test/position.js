const expect = require('chai').expect
const generateO = require('../dist/legible-mergeable.js')._positionFunctions.generatePosition
const compare = require('../dist/legible-mergeable.js')._positionFunctions.comparePositions

function generate (prevPos, nextPos) {
  prevPos = prevPos.map(n => n.toString(36))
  nextPos = nextPos.map(n => n.toString(36))

  const result = generateO(prevPos, nextPos)
  // console.log('generate position between', prevPos, nextPos, '>', result)

  return result.map(s => parseInt(s, 36))
}

describe('compare position', function () {
  it('compare', function () {
    expect(compare(['f3'], ['99'])).to.equal(1)
    expect(compare(['0'], ['zz'])).to.equal(-1)
    expect(compare(['4f', '66'], ['4g'])).to.equal(-1)
    expect(compare(['a2', 'fg'], ['a2'])).to.equal(1)
    expect(compare(['rr', 'g1'], ['rr', 'g1'])).to.equal(0)
  })
})

describe('generate position', function () {
  it('with one new identifier', function () {
    const result = generate([543], [333])
    expect(result.length).to.equal(1)
    expect(typeof result[0]).to.equal('number')
    expect(result[0]).to.be.within(333, 543)
  })

  it('with a new nesting level', function () {
    const result = generate([124], [125])
    expect(result.length).to.equal(2)
    expect(result[0]).to.equal(124)
    expect(typeof result[1]).to.equal('number')
  })

  it('with a new nesting level in nested level', function () {
    const result = generate([1188, 18], [1188, 20])
    expect(result.length).to.equal(3)
    expect(result[0]).to.equal(1188)
    expect(result[1]).to.equal(18)
    expect(typeof result[2]).to.equal('number')
  })

  it('with NO new nesting level, because difference is just about the threshold', function () {
    const result = generate([3000, 10], [3000, 20])
    expect(result.length).to.equal(2)
    expect(result[0]).to.equal(3000)
    expect(result[1]).to.be.within(10, 20)
  })

  it('with no nesting level, because first level has large enough difference', function () {
    const result = generate([100, 42], [3000, 44])
    expect(result.length).to.equal(1)
    expect(result[0]).to.be.within(100, 3000)
  })

  it('fail when no space in between', function () {
    try {
      generate([17216], [17216])
    } catch (error) {
      expect(error.message).to.contain('no space')
    }
  })

  it('fail when no space in between nested', function () {
    try {
      generate([17216, 1], [17216, 1])
    } catch (error) {
      expect(error.message).to.contain('no space')
    }
  })

  it('with a new nesting level in nested level', function () {
    const result = generate([1188, 18], [1188, 20])
    expect(result.length).to.equal(3)
    expect(result[0]).to.equal(1188)
    expect(result[1]).to.equal(18)
    expect(typeof result[2]).to.equal('number')
  })

  it('with a new nesting level in two nested levels', function () {
    const result = generate([4861, 631], [4861, 632])
    expect(result.length).to.equal(3)
    expect(result[0]).to.equal(4861)
    expect(result[1]).to.equal(631)
    expect(typeof result[2]).to.equal('number')
  })
})
