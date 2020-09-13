const expect = require('chai').expect
const generate = require('../dist/legible-mergeable.js')._positionFunction.generatePosition
const compare = require('../dist/legible-mergeable.js')._positionFunction.comparePositions

describe('position', function () {
  it('generate', function () {
    const result = generate(['f3'], ['99'])
    expect(result.length).to.equal(1)
    expect(typeof result[0]).to.equal('string')
  })

  it('compare', function () {
    expect(compare(['f3'], ['99'])).to.equal(1)
    expect(compare(['0'], ['zz'])).to.equal(-1)
    expect(compare(['4f', '66'], ['4g'])).to.equal(-1)
    expect(compare(['a2', 'fg'], ['a2'])).to.equal(1)
    expect(compare(['rr', 'g1'], ['rr', 'g1'])).to.equal(0)
  })
})
