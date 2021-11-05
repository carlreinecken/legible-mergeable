* dirty directive instead of proxy in v-model
* soft delete
* manual order
* NICE TO HAVE: research how to compress modification dates if there are extacly same of multiple properties

## dirty

    <input
      v-model="task.title"
      type="text"
      v-dirty="dirty.push('title')"
    />

and later

    task.renew(this.task, this.dirty)

or instead of `dirty` a changed/modified directive could be used. as demo this would be a bit complicated...

## soft delete

encourage "soft delete" in readme: use some flag in your own object to hide the item. that way users can undo a delete and changes that were done after the "deletion" are still applied

## manual order

options which wouldn't need to alter the merge function:

### option 3: put the position in the list element itself.

user would need to use `insert` instead of `set` so a position is generated... ~~however this has one problem: if the items are shared across different lists and every list should have its own ordering.~~ this can be easily abstracted through referencing the content instead of including it as tree.

    {
      1: { position: pos1 },
      2: { position: pos2 },
      ^lm: { 1: date1, 2: date2 },
    }

now this would somehow need to be parsed to

    [
        { id: 1, position: pos1 },
        { id: 2, position: pos2 },
    ]

e.g. with

    const list = lm.toArray(mergeable, { indexKey: 'id', positionKey: 'position' })

the option positionKey is required to correctly order the array. the indexKey is optional if the business logic makes sure the elements have an unique identifier. however the indexKey does not need to exist inside the object. if an indexKey was passed, the array elements in the output get the property index of the mergeable as property with the key defined in `indexKey`.

    const list = lm.fromArray(array, { indexKey: 'id', dropIndexKey: false })

the option indexKey is required, because the value is needed for the new object keys. the option dropIndexKey is optional and by default true. if it is false, the property specified in indexKey is removed from the element (without tracking if the object is a mergeable).

### option 2: keep the positions as nested mergeable in the list

which would make things really weird cause a key would be tracked three times: modification date, position and the modification date of the position 🤯

    {
      1: {},
      2: {},
      ^lm: {
        1: date,
        2: date,
        ^lm.positions': date,
      },
      ^lm.positions: {
        1: pos,
        2: pos,
        ^lm: {
          1: date,
          2: date,
        }
      }
    }

---


### option 1 (somewhat hard to do deterministically): ordered ids as own array in list as atomic value

Problem: What happens to added properties from other clients while someone else overwrites the order?

After a merge the order array would need to be refreshed: Deleted ids are removed and missing ids are pushed at the end, sorted deterministically. Why not just use `lm.order()` for that?

    {
      1,
      2,
      ^lm: { 1: ..., '^lm.order': date },
      ^lm.order: [1, 2]
    }

every key that starts with the MARKER will get merged (except the MARKER itself), but gets ignored when iterating with helper functions over the object

new helper functions

* order, shortcut to `.set(tasks, '^lm.order', val)`. if no value is given, it returns the already existing order property
* push, needs to push key into order, deletePosition, needs to delete key from order (do we really need those functions)
* toArray, return an array sorted by order property
* fromArray

    const list = legibleMergeable.fromArray([
      1,
      2,
      {
        ^lm: { 1: ..., '^lm.order': date },
        ^lm.order: [1, 2]
      },
    ], { indexKey: 'id' })

    const list = legibleMergeable.toArray(lm, { indexKey: 'id' })
