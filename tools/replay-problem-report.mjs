#!/usr/bin/env node
// node tools/replay-problem-report.mjs REPORT.json [PLAY_ID]
import fs from 'node:fs';
import { replayRecordedPlay } from '../src/testing/replay.js';
import { BUILD } from '../src/version.js';
const [file, id] = process.argv.slice(2);
if (!file) { console.error('Usage: node tools/replay-problem-report.mjs REPORT.json [PLAY_ID]'); process.exit(1); }
try {
  const report = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (report.app !== 'gridiron-beast-problem-report' || report.schemaVersion !== 1) throw new Error('Not a supported problem report.');
  if (report.build?.version !== BUILD.version) throw new Error(`Use the game build that created this report: ${report.build?.version} (${report.build?.branch}). Current build: ${BUILD.version}.`);
  const play = id ? report.plays.find((p) => p.id === Number(id)) : report.plays.at(-1);
  if (!play) throw new Error('The requested play is not retained in this report.');
  const { reproduced, differences, event } = replayRecordedPlay(play);
  console.log(JSON.stringify({ playId: play.id, reproduced, differences, event: { kind: event?.kind, text: event?.text, result: event?.sim?.result, yards: event?.sim?.yards } }, null, 2));
  if (!reproduced) process.exitCode = 2;
} catch (error) { console.error(error.message); process.exitCode = 1; }
