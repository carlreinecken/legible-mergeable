# legible-mergeable

This is a CRDT (Conflict-free Replicated Data Type), but a really *really* simple one. It can just represent an arbitrary object or a tree of objects with atomic non-CRDT (JSON) values. Atomic values are strings, numbers, booleans, null, arrays and non-CRDT objects.

It's not designed for realtime data input, like realtime text collaboration. Rather it's purpose is to have an easy solution to sync between multiple devices, where it's really improbable that a property was modified at the *same* time.

The main goal for driving this project was readability: The serialized JSON you get when saving the document on disk or to sent it somewhere over the network, looks almost like the foundational object representation, with just a little meta data.

Only complete states are saved and merged, there is no sense of a "diff". Conflicts are resolved by Last-Write-Wins (LWW). It doesn't matter in which order different modified states are applied (associative, commutive and idompotent), conflicting changes will always be deterministically resolved. It will always prefer the newest change.

> Currently it uses UTC Timestamps to track versions. It is strongly advised to not use the wall-clock, as it can be easily manipulated, be wrong or is just not exact enough. However the alternative would be to use a Hybrid Logical Clock (HLC), but I think this would make my current use of the library in personal projects a bit more complicated. I'm interested in pursuing this further and maybe implement it later (maybe even backwards compatible?). However as mentioned before: The purpose of this CRDT was never for realtime concurrent editing. Just to enable seamless offline data editing with a bit smarter merging capabilities. For that expectations I think a timestamp is enough for the time being.

Anyway judge for yourself, I gather this is rather legible:

```json
{
  1: {
    "id": 1,
    "title": "Buy Broccoli",
    "done": false,
    "^lm": { "title": "2021-10-02T15:50:02.064Z" }
  },

  2: {
    "id": 2,
    "title": "Change Lightbulb",
    "done": true,
    "^lm": { "done": "2020-10-01T10:12:44.061Z" }
  },

  "^lm": {
    1: "2021-09-21T10:00:00.000Z",
    2: "2021-09-21T10:00:00.000Z"
  },
}
```

A few notes:

* These are nested mergeables. The root object here is used as unordered list.
* In the real world where you have multiple clients that can add an object, you probably should use some form of UUID (like nanoid) as id to prevent collisions.
* The `"id"` is not necessary, all properties here are by the user of the library, except the `^lm`.
* The "marker" `^lm`:
    * Is the modification identifier and denotes that the current object is a mergeable and holds all modification dates of all properties of that object.
    * It can also have an empty object as value. Which just means, that no property was modified yet.
    * An object is only a mergeable and gets only parsed and merged if it has the marker. Otherwise it would be handled as atomic object.
* If a date for a property exists but there is no value, it means that it was deleted (Also called tombstone). This information has to be kept, in case the document is merged with some older one, that doesn't know yet of the deletion.

## Usage

    lm.set(mergeable, '', value [, { date }])
    lm.drop(mergeable, key, value [, { date }])
    lm.renew(mergeable, key [, { date }])
    lm.touch(mergeable)
    lm.clone(mergeable)

### Merging

    lm.merge(mergeableA, mergeableB)
    lm.mergeOrFail(mergeableA, mergeableB)
    // throws error with name lm.MERGE_RESULT_IS_IDENTICAL if modifications don't differ

### Info

    lm.size(mergeable)
    lm.base(mergeable)
    lm.modifications(mergeable)

    lm.MERGEABLE_MARKER

### Proxy

    lm.createProxy(mergeable [, { date }])

### Array like functions

    lm.filter(mergeable, fn(item, key, modification))
    lm.map(mergeable, fn(item, key, modification))

## Vue Implementation

This uses proxies, so `v-model` can be used. If `list` is a mergeable, it could also be proxy, So it wouldn't iterate over the marker. For a full example implementation checkout the [demo.html](demo.html).

```html
<div v-for="item in list" :key="item.id">
    <input type="checkbox" v-model="item.done" />
    <input type="text" v-model.lazy="item.title" />
    <button @click="lm.drop(list, item.id)">Delete</button>
</div>
```

