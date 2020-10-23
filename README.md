# legibleMergeable

Make an array with simple objects as items conflict-free mergeable. Simple means only JSON datatypes are allowed.

Not for use in production. I use it only for an app for my acquaintances and myself.

It doesn't matter in which order different customized states are applied (associativ, commutive and idompotent), conflicting changes will always be deterministically resolved. It will always prefer the newest change. Currently it uses UTC Timestamps for this, which is flawed and should probably be replaced by some logical clock or hybrid.

The merge will not merge strings, it will "only" merge array additions, movements, deletions and added, deleted and changed properties of the array objects. Currently a deletion of an array object always overwrites any modification inside the object.

When exporting the mergeable array or object as JSON it stays an array with objects which have additionally objects or properties and thus stays legible.

This is rather legible, isn't it?

```json
[
  {
    "id": 1,
    "title": "Buy Sugar",
    "done": false,
    "^m": { "title": "2020-10-23T15:50:02.064Z" }
  },
  {
    "id": 2,
    "title": "Change Lightbulb",
    "done": true,
    "^m": { "done": "2020-10-23T15:50:02.064Z" }
  },
  {
    "^m": { 1: "2020-10-21T10:00:00.000Z", 2: "2020-10-21T10:00:00.000Z" },
    "^p": { 1: "4ka5n", 2: "ga2ru" }
  }
]
```

Inside the array and object are properties included for modification dates and positions: `^m` and `^p` respectively.

## Usage MergeableArray

All list elements are expected to be a simple JSON object with at least an unique `id`. The objects can have any arbitrary properties and values. The JSON datatypes are allowed: string, number, boolean, arrays and objects.

Manipulating methods can be passed optionally a date timestamp to specify when it was modified. When not provided it will take the current time, this option shouldn't be needed.

### Create

Create a mergeable array with or without an exisiting normal array or mergeable array as parsed JSON.

```javascript
const alice = legibleMergeable.Array()
const bob = legibleMergeable.Array([
    { id: randomId(), title: 'Test', done: false }
])
```

The method `legibleMergeable.Array([payload[, options]]) can be passed options. Following options are available:

* `positions`: NOT IMPLEMENTED YET! Disable positions with `{ positions: false }`. No positions will be generated, no positions are considered when merging and existing positions are discarded. This can be useful when the array is supposed to be sorted by a property and not manually.
* `identifier`: NOT IMPLEMENTED YET! Define own name for identifier in the objects instead of the default `id`.

### Add Element

Add an element at the end of the array with `push(element[, date])` or after another item `insert(element, afterId[, date])`.

```javascript
alice.insert.push({
    id: randomId(),
    done: false,
    title: 'Change Lightbulb'
})

bob.insert.insert({
    id: randomId(),
    done: true,
    title: 'Buy Oatmilk'
})
```

### Get

```javascript
state()
has(id)
get(id)
```

### `move(id, afterId[, date])`

```javascript
bob.move(1, 2)
```

### `delete(id[, date])`

```javascript
bob.delete(1)
```

### `reposition()`

NOT IMPLEMENTED YET!

Re-computes the position. Takes the order of the array and computes new positions. Can be useful when positions got very long. Business logic should make sure that all states have synchronized and/or older ones are ignored. All modification dates are set to the current timestamp.

### `clone()`

```javascript
const caroline = alice.clone()
```

### `merge(MergeableArray)`

```javascript
alice.merge(bob)

const caroline = legibleMergeable.merge(bob, caroline)
```

### Helper

```javascript
size()
first()
last()
base()
meta()
```

### Dump

```javascript
dump()
toString()
```

## Usage MergableObject

```
legibleMergeable.Object()
has(key)
get(key)
set(key, value[, date])
delete(key, value[, date])
id()
size()
base()
dump()
toString()
clone()
merge()
```

## Vue Implementation

For an example implementation check out the `demo.html`.

```html
<div v-for="item in list.state()"
     :key="item.id()">
    <input type="checkbox"
           :checked="item.get('done')"
           @change="item.set('done', $event.target.checked)" />

    <input type="text"
           :value="item.get('title')"
           @input="item.set('title', $event.target.value)" />

    <button class="item-delete"
            @click="list.delete(item.id())">
        X
    </button>
</div>
```
