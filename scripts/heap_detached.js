#!/usr/bin/env node
const fs = require('fs');
const snap = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const meta = snap.snapshot.meta;
const NF = meta.node_fields.length;
const nodeTypes = meta.node_types[0];
const I = (n) => meta.node_fields.indexOf(n);
const I_type = I('type'), I_name = I('name'), I_self = I('self_size'), I_det = I('detachedness');
const nodes = snap.nodes, strings = snap.strings;

// Detached nodes (detachedness==2 means detached from DOM/root in V8; Hermes uses
// 0/1/2). Sum sizes of detached + count.
let detCount = 0, detSize = 0;
const detByName = new Map();
for (let i = 0; i < nodes.length; i += NF) {
  if (nodes[i + I_det] === 2) {
    detCount++;
    detSize += nodes[i + I_self];
    const nm = nodeTypes[nodes[i + I_type]] + ' :: ' + (strings[nodes[i + I_name]] ?? '');
    const c = detByName.get(nm) || { size: 0, count: 0 };
    c.size += nodes[i + I_self]; c.count++; detByName.set(nm, c);
  }
}
console.log('DETACHED nodes:', detCount, '  size:', (detSize / 1e6).toFixed(2), 'MB');

// CodeBlock total restated + count of dev-only React markers
let cbSize = 0, cbCount = 0;
const devMarkers = ['throwOnImmutableMutation', 'warnAboutAccessingKey', 'identity'];
const markerCount = {};
let runtimeModules = 0;
for (let i = 0; i < nodes.length; i += NF) {
  const name = strings[nodes[i + I_name]] ?? '';
  const t = nodeTypes[nodes[i + I_type]];
  if (t === 'native' && name === 'CodeBlock') { cbSize += nodes[i + I_self]; cbCount++; }
  if (t === 'native' && name === 'RuntimeModule') runtimeModules++;
  for (const m of devMarkers) if (name === m) markerCount[m] = (markerCount[m] || 0) + 1;
}
console.log('CodeBlock total:', (cbSize / 1e6).toFixed(1), 'MB across', cbCount, 'blocks  (avg',
  (cbSize / cbCount).toFixed(0), 'bytes/block)');
console.log('RuntimeModules:', runtimeModules);
console.log('dev markers:', JSON.stringify(markerCount));
