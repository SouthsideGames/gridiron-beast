#!/usr/bin/env node
// Salary-cap experiment (follow-up brief I-1, investigation only). Runs tools/ai-franchise-benchmark.mjs unchanged with the
// Challenger tier's cap overridden IN THIS PROCESS ONLY. No game file is changed; the shipped cap stays 1,800,000.
//
//   node tools/balance-audit/cap-experiment.mjs --cap=1500000 [any ai-franchise-benchmark flag: --seeds --seasons --difficulty
//        --owner --board --quiet --json ...]
//
// How it works: every cap read in the game goes through tierById(f.tier).cap (franchise.js, fa-engine.js, fa-ai.js,
// league-registry.js callers). TIERS is a frozen array but its tier objects are not, so setting the property on the shared
// module instance before the benchmark loads changes the cap for the whole run, owner and AI alike (the owner's 'cap' perk
// still multiplies it). The output JSON gets `capExperiment: {tier, cap, shipped}` so a result can never be mistaken for the
// shipped configuration.
import path from 'node:path';
import fs from 'node:fs';

const here = path.dirname(new URL(import.meta.url).pathname);
const root = path.resolve(here, '..', '..');
const capArg = process.argv.find((a) => a.startsWith('--cap='));
if (!capArg) { console.error('usage: cap-experiment.mjs --cap=N [benchmark flags]'); process.exit(2); }
const cap = Number(capArg.split('=')[1]);
if (!Number.isFinite(cap) || cap < 500000 || cap > 5000000) { console.error(`implausible cap ${capArg}`); process.exit(2); }

const { tierById } = await import(path.join(root, 'src/data/league.js'));
const tier = tierById('challenger');
const shipped = tier.cap;
tier.cap = cap;
if (tierById('challenger').cap !== cap) { console.error('cap override did not take'); process.exit(3); }

const bench = path.join(root, 'tools/ai-franchise-benchmark.mjs');
process.argv = [process.argv[0], bench, ...process.argv.slice(2).filter((a) => a !== capArg)];
await import(bench);

const jsonArg = process.argv.find((a) => a.startsWith('--json='));
if (jsonArg) {
  const file = jsonArg.split('=')[1];
  const out = JSON.parse(fs.readFileSync(file, 'utf8'));
  out.capExperiment = { tier: 'challenger', cap, shipped };
  fs.writeFileSync(file, JSON.stringify(out));
}
