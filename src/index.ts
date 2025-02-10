import express from 'express';
import fs from 'fs';
import path from 'path';

const app = express();
app.use(express.json());

const DATA_DIR = path.join(__dirname, 'data');
const MEMTABLE_LIMIT = 100;
const memtable: Map<string, string> = new Map();
let sstables: string[] = [];
const WAL_FILE = path.join(DATA_DIR, 'wal.log');

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR);
}

// Write-Ahead Logging (WAL) for crash recovery
function appendToWAL(key: string, value: string) {
    fs.appendFileSync(WAL_FILE, `${key}=${value}\n`, 'utf-8');
}

function loadFromWAL() {
    if (!fs.existsSync(WAL_FILE)) return;
    const lines = fs.readFileSync(WAL_FILE, 'utf-8').split('\n');
    for (const line of lines) {
        if (line.trim() === '') continue;
        const [key, value] = line.split('=');
        memtable.set(key, value);
    }
}

// Flush memtable to SSTable file and clear WAL
function flushMemtable() {
    if (memtable.size === 0) return;
    const sortedEntries = Array.from(memtable.entries()).sort(([a], [b]) => a.localeCompare(b));
    const filename = path.join(DATA_DIR, `sstable-${Date.now()}.txt`);
    fs.writeFileSync(filename, sortedEntries.map(([k, v]) => `${k}=${v}`).join('\n'), 'utf-8');
    sstables.push(filename);
    memtable.clear();
    fs.writeFileSync(WAL_FILE, '', 'utf-8'); // Clear WAL after flushing
}

// Insert key-value pair with WAL
function put(key: string, value: string) {
    appendToWAL(key, value);
    memtable.set(key, value);
    if (memtable.size >= MEMTABLE_LIMIT) {
        flushMemtable();
    }
}

// Read key from memtable or SSTables
function get(key: string): string | null {
    if (memtable.has(key)) return memtable.get(key) || null;
    for (const sstable of sstables.reverse()) {
        const lines = fs.readFileSync(sstable, 'utf-8').split('\n');
        for (const line of lines) {
            const [k, v] = line.split('=');
            if (k === key) return v;
        }
    }
    return null;
}

// Read a range of keys
function getKeyRange(startKey: string, endKey: string): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [key, value] of memtable.entries()) {
        if (key >= startKey && key <= endKey) {
            result[key] = value;
        }
    }
    for (const sstable of sstables) {
        const lines = fs.readFileSync(sstable, 'utf-8').split('\n');
        for (const line of lines) {
            const [key, value] = line.split('=');
            if (key >= startKey && key <= endKey) {
                result[key] = value;
            }
        }
    }
    return result;
}

// Delete key from memtable
function deleteKey(key: string) {
    memtable.delete(key);
    appendToWAL(key, ''); // Append delete marker to WAL
}

// Recover from WAL on startup
loadFromWAL();

app.post('/put', (req, res) => {
    const { key, value } = req.body;
    if (!key || !value) return res.status(400).send('Key and value required');
    put(key, value);
    res.send('OK');
});

app.get('/read/:key', (req, res) => {
    const key = req.params.key;
    const value = get(key);
    if (value === null) return res.status(404).send('Not Found');
    res.send(value);
});

app.get('/readrange/:startKey/:endKey', (req, res) => {
    const { startKey, endKey } = req.params;
    const result = getKeyRange(startKey, endKey);
    res.json(result);
});

app.post('/batchput', (req, res) => {
    const { keys, values } = req.body;
    if (!Array.isArray(keys) || !Array.isArray(values) || keys.length !== values.length) {
        return res.status(400).send('Invalid request');
    }
    keys.forEach((key, i) => put(key, values[i]));
    res.send('OK');
});

app.delete('/delete/:key', (req, res) => {
    const key = req.params.key;
    deleteKey(key);
    res.send('OK');
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
