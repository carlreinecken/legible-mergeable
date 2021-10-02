* readme
* mergeOrFail
* manual order
* NICE TO HAVE: research how to compress modification dates if there are extacly same of multiple properties
* NICE TO HAVE: throw error if the new date in `set()` is before the previous mod date (relative to the wall clock) (but this could be wanted) OR throw error if dates in merging are in the past relative to wall clock (this would make the merge coupled with outside info tho)

## readme

lazy vmodel!

soft delete: encourage "soft delete" in readme: use some flag in your own object to hide the item. that way users can undo a delete and changes that were done after the "deletion" are still applied

## mergeOrFail

  try {
    legibleMergeable.mergeOrFail(docA, docB)
  } catch (error) {
    if (error instanceof legibleMergeable.NOTHING_CHANGED_ERROR) {
      // do stuff
    }
  }

### use case: detect change in formular to disable "save"

no need, modification dates don't matter

* compare stringified base()

### use case: prevent upload ("will a merge change sonething?")

* merge itself returns a boolean whether something was changed
* merge itself throws error if nothing was changed
* before merge: deep comparison of all modification dates?

## manual order

options which wouldn't need to alter the merge function:

1. ordered ids as own array in list as atomic value. What happens to added properties from other clients while someone else overwrites the order? this problem makes it basically impossible to make the order a single atomic value.
2. keep the positions as nested mergeable in the list. which would make things really weird cause a key would be tracked twice; once as object property and once its position.
3. put the position in the list element itself. the `id_key` would need to be saved inside the list anyway, it could also save a `position_key`, so the list knows where to look when ordering. user would need to use `insert` instead of `set` so a position is generated...

### option 1 (not possible)

    const list = legibleMergeable.fromList([
      1,
      2,
      {
        ^lm: { 1: ..., '^lm.order': date },
        ^lm.order: [1, 2]
      },
    ], { objectKey: 'id' })

gets transformed to

    {
      1,
      2,
      ^lm: { 1: ..., '^lm.order': date },
      ^lm.order: [1, 2]
    }

every key that starts with the MARKER will get merged (except the MARKER itself), but gets ignored when iterating with helper functions over the object

new helper functions

* order, shortcut to `.set(tasks, '^lm.order', val)`. if no value is given, it returns the already existing order property

functions need to be extended

* set, needs to push key into order
* delete, needs to delete key from order
* base, return an array sorted by order property

---

    arrayToObject (array, customIndex) {
      return array.reduce((acc, value, i) => {
        const key = customIndex == null ? i : customIndex

        acc[value[key]] = value

        return acc
      }, {})
    }
