#!/usr/bin/env node
// Analyze a Hermes/V8-format heap snapshot (.heaptimeline / .heapsnapshot)
const fs = require('fs');

const file = process.argv[2];
if (!file) {
  console.error('usage: node heap_analyze.js <file>');
  process.exit(1);
}

console.error('reading', file);
const raw = fs.readFileSync(file, 'utf8');
console.error('parsing JSON (', (raw.length / 1e6).toFixed(1), 'MB )');
const snap = JSON.parse(raw);

const meta = snap.snapshot.meta;
const nodeFields = meta.node_fields;
const nodeTypes = meta.node_types[0]; // first field is the type enum
const NF = nodeFields.length;
const I_type = nodeFields.indexOf('type');
const I_name = nodeFields.indexOf('name');
const I_id = nodeFields.indexOf('id');
const I_self = nodeFields.indexOf('self_size');
const I_edgec = nodeFields.indexOf('edge_count');

const nodes = snap.nodes;
const strings = snap.strings;
const nodeCount = nodes.length / NF;

console.error('node fields:', nodeFields.join(','));
console.error('node types:', nodeTypes.join(','));
console.error('node count:', nodeCount);

// 1. total self_size and breakdown by type
const byType = new Map();
let total = 0;
for (let i = 0; i < nodes.length; i += NF) {
  const t = nodes[i + I_type];
  const self = nodes[i + I_self];
  total += self;
  const tn = nodeTypes[t] || ('type' + t);
  const cur = byType.get(tn) || { size: 0, count: 0 };
  cur.size += self;
  cur.count += 1;
  byType.set(tn, cur);
}

console.log('\n=== TOTAL JS HEAP self_size ===');
console.log((total / 1e6).toFixed(1), 'MB across', nodeCount, 'nodes');

console.log('\n=== BY NODE TYPE ===');
const typeArr = [...byType.entries()].sort((a, b) => b[1].size - a[1].size);
for (const [t, v] of typeArr) {
  console.log(
    (v.size / 1e6).toFixed(2).padStart(9),
    'MB',
    String(v.count).padStart(9),
    'nodes ',
    t
  );
}

// 2. aggregate by name (groups same-named objects/strings/closures)
//    For strings the name IS the content; for objects/closures it's the class/fn name.
const byName = new Map();
for (let i = 0; i < nodes.length; i += NF) {
  const t = nodes[i + I_type];
  const tn = nodeTypes[t] || ('type' + t);
  const self = nodes[i + I_self];
  const nameIdx = nodes[i + I_name];
  const name = strings[nameIdx] ?? '';
  const key = tn + ' :: ' + name;
  const cur = byName.get(key) || { size: 0, count: 0 };
  cur.size += self;
  cur.count += 1;
  byName.set(key, cur);
}

console.log('\n=== TOP 60 BY (type::name) AGGREGATE self_size ===');
const nameArr = [...byName.entries()].sort((a, b) => b[1].size - a[1].size).slice(0, 60);
for (const [k, v] of nameArr) {
  let label = k;
  if (label.length > 90) label = label.slice(0, 90) + '…';
  console.log(
    (v.size / 1e6).toFixed(2).padStart(9),
    'MB',
    String(v.count).padStart(8),
    'x ',
    label.replace(/\n/g, '\\n')
  );
}

// 3. largest individual nodes
console.log('\n=== TOP 40 LARGEST INDIVIDUAL NODES ===');
const idx = [];
for (let i = 0; i < nodes.length; i += NF) idx.push(i);
idx.sort((a, b) => nodes[b + I_self] - nodes[a + I_self]);
for (let n = 0; n < 40; n++) {
  const i = idx[n];
  const t = nodeTypes[nodes[i + I_type]];
  let name = strings[nodes[i + I_name]] ?? '';
  if (name.length > 80) name = name.slice(0, 80) + '…';
  console.log(
    (nodes[i + I_self] / 1e6).toFixed(3).padStart(8),
    'MB ',
    String(t).padStart(14),
    ' id=' + nodes[i + I_id],
    ' ',
    name.replace(/\n/g, '\\n')
  );
}
