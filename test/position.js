const expect = require('chai').expect
const generate = require('../dist/legible-mergeable.js')._positionFunctions.generatePosition
const compare = require('../dist/legible-mergeable.js')._positionFunctions.comparePositions

const encodeBase36 = (number) => number.toString(36)
const decodeBase36 = (string) => parseInt(string, 36)
const encodeBase36Array = (list) => list.map(value => encodeBase36(value))

describe('generate position', function () {
  it('add new ', function () {
    const result = generate(['f3'], ['99'])
    expect(result.length).to.equal(1)
    expect(typeof result[0]).to.equal('string')
  })

  it('add new nested identifier', function () {
    const result = generate(['3h'], ['3j'])
    expect(result.length).to.equal(2)
    expect(result[0]).to.equal('3h')
    expect(typeof result[1]).to.equal('string')
  })

  it('add new nested identifier in nested', function () {
    const result = generate(['x0', 'i'], ['x0', 'k'])
    expect(result.length).to.equal(3)
    expect(result[0]).to.equal('x0')
    expect(result[1]).to.equal('i')
    expect(typeof result[2]).to.equal('string')
  })

  it('add NO new nested identifier, because difference is just about the threshold', function () {
    const result = generate(encodeBase36Array([3000, 10]), encodeBase36Array([3000, 20]))
    expect(result.length).to.equal(2)
    expect(decodeBase36(result[0])).to.equal(3000)
    expect(decodeBase36(result[1])).to.be.within(10, 20)
  })

  it('fail when no space in between', function () {
    try {
      generate(['da8'], ['da8'])
    } catch (error) {
      expect(error.message).to.contain('no space')
    }

    try {
      generate(['da8', '1'], ['da8', '1'])
    } catch (error) {
      expect(error.message).to.contain('no space')
    }
  })
})

describe('compare position', function () {
  it('compare', function () {
    expect(compare(['f3'], ['99'])).to.equal(1)
    expect(compare(['0'], ['zz'])).to.equal(-1)
    expect(compare(['4f', '66'], ['4g'])).to.equal(-1)
    expect(compare(['a2', 'fg'], ['a2'])).to.equal(1)
    expect(compare(['rr', 'g1'], ['rr', 'g1'])).to.equal(0)
  })
})
