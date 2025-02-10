
# A network-available persistent Key/Value system

 
This is a network-available persistent Key/Value system written in Typescript + Express and exposes the following endpoints.

1. Put(Key, Value)
2. Read(Key)
3. ReadKeyRange(StartKey, EndKey)
4. BatchPut(..keys, ..values)
5. Delete(key)


## Implemenatation and Trade offs
This implementation optimizes for fast writes, durability, and scalability while trading off some read efficiency, which can be improved with indexing and background compaction. 
### Low Latency Reads/Writes 
Memtable (in-memory) enables fast writes and lookups.

**Tradeoff**: Reads may require scanning multiple SSTables if key isn't in memtable.

### High Throughput for Random Writes 

Write-Ahead Log (WAL) ensures durability before flushing.
LSM-Tree structure writes sequentially to SSTables, avoiding random disk I/O.

**Tradeoff** : Read performance can degrade over time without compaction.
### Scales Beyond RAM Without Degradation 

SSTables (sorted, immutable files) store large datasets on disk.

**Tradeoff**: Querying cold data requires scanning multiple SSTables.
### Crash Recovery & Data Durability 

WAL ensures no data loss before memtable flush.

**Tradeoff**: Slight overhead from WAL writes, but necessary for reliability.
### Predictable Behavior Under Heavy Load 

Sequential writes optimize disk I/O, preventing fragmentation.

**Tradeoff**: Read performance can slow down without efficient indexing (e.g., Bloom filters).

## Run

To run this project, navigate to project directory and run

```bash
 npm i
```

Once all dependencies are installed, run  

```bash
 npm run dev
```
To test the endpoints using [autocannon](https://github.com/mcollina/autocannon) run 

```bash
 npm run test
```


## API Reference

#### Post Key and Value

```http
  POST /put
```

| Parameter | Type     | Description                |
| :-------- | :------- | :------------------------- |
| `key` | `JSON` | **Required**.  |
| `value` | `JSON` | **Required**. |

#### Get item

```http
  GET /read/${key}
```

| Parameter | Type     | Description                       |
| :-------- | :------- | :-------------------------------- |
| `key`      | `string` | **Required**. key of value to fetch |


#### Get range

```http
  GET /readrange/${startkey}/${endkey}
```

| Parameter | Type     | Description                       |
| :-------- | :------- | :-------------------------------- |
| `startkey`      | `string` | **Required**. start key of range to fetch |
| `endkey`      | `string` | **Required**. end key of range to fetch |


#### Batch post keys and values

```http
  POST /batchput
```

| Parameter | Type     | Description                |
| :-------- | :------- | :------------------------- |
| `key` | `JSON Array` | **Required**.  |
| `value` | `JSON Array` | **Required**. |


```
  example request:
  {
    "keys":["key1","key2","key3", "key4", "key5"],
    "values": ["value1","value2","value3","value4", "value5"]
  }
```

#### Delete value

```http
  DELETE /delete/${key}
```

| Parameter | Type     | Description                       |
| :-------- | :------- | :-------------------------------- |
| `key`      | `string` | **Required**. key of value to delete |

