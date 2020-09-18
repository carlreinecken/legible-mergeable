const expect = require('chai').expect
const generate = require('../dist/legible-mergeable.js')._positionFunctions.generatePosition
const compare = require('../dist/legible-mergeable.js')._positionFunctions.comparePositions

describe('position', function () {
  it('generate', function () {
    const result = generate(['f3'], ['99'])
    expect(result.length).to.equal(1)
    expect(typeof result[0]).to.equal('string')
  })

  it('generate and add new nested identifier', function () {
    const result = generate(['3h'], ['3j'])
    expect(result.length).to.equal(2)
    expect(result[0]).to.equal('3h')
    expect(typeof result[1]).to.equal('string')
  })

  it('generate and add new nested identifier in nested', function () {
    const result = generate(['x0', 'i'], ['x0', 'k'])
    console.log('result', result)
    expect(result.length).to.equal(3)
    expect(result[0]).to.equal('x0')
    expect(result[1]).to.equal('i')
    expect(typeof result[2]).to.equal('string')
  })

  xit('fail generate when no space in between', function () {
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

  it('compare', function () {
    expect(compare(['f3'], ['99'])).to.equal(1)
    expect(compare(['0'], ['zz'])).to.equal(-1)
    expect(compare(['4f', '66'], ['4g'])).to.equal(-1)
    expect(compare(['a2', 'fg'], ['a2'])).to.equal(1)
    expect(compare(['rr', 'g1'], ['rr', 'g1'])).to.equal(0)
  })
})
