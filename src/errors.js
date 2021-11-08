export class MergeableError extends Error {
  constructor (message) {
    super(message)
    this.name = this.constructor.name
  }
}

export class MergeResultIdenticalError extends MergeableError {
  constructor () {
    super('Result of merge is identical.')
  }
}

export class MergeableExpectedObjectError extends MergeableError {
  constructor () {
    super('Wrong type given, expected value of type object.')
  }
}

export class KeyNotFoundInMergableError extends MergeableError {
  constructor (payload) {
    super(`Could not find id ${payload.key} in mergeable.`)
    this.payload = payload
  }
}

export class PositionMissingInMergableError extends MergeableError {
  constructor (payload) {
    super(`Position key ${payload.positionKey} is missing on property.`)
    this.payload = payload
  }
}

export class PositionHasNoRoomError extends MergeableError {
  constructor () {
    super('Failed to generate new position, no room left.')
  }
}
