export const MERGEABLE_MARKER = '^lm'

// TODO: Evaluate where this needs to be implemented: Property keys starting
// with the MARKER are ignored when iterating over the mergeable.
export const POSITION_KEY = MERGEABLE_MARKER + '.position'

export const OPERATIONS = {
  ADD: 'ADD',
  REMOVE: 'REMOVE',
  RECOVER: 'RECOVER',
  CHANGE: 'CHANGE',
  MERGE: 'MERGE'
}
