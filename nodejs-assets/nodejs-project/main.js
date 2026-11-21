import { createRequire } from 'module';
import { register_botguard_solver } from './botguard_solver.js';

const require = createRequire(import.meta.url);
const rn_bridge = require('rn-bridge');

register_botguard_solver(rn_bridge);

rn_bridge.channel.send(`Node was initialized with v${process.version}.`);
