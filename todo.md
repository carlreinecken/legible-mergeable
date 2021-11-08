* dirty directive instead of proxy in v-model
* soft delete
* NICE TO HAVE: research how to compress modification dates if there are extacly same of multiple properties
* sorting tiebraker (e.g. key)
* merging tiebraker
* reposition

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
