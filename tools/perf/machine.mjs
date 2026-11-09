// Machine-quiet accounting for the performance tools (docs/task8/PERF_SCENES.md section 1.1, methodology correction of 2026-11-08).
//
// Why: the 1-minute load average counts every runnable thread, the benchmark's own included (its worker, V8's helper threads, the
// browser it drives), so on a 2-CPU machine a benchmark that keeps one CPU busy can never stay under "0.5 per CPU". The figure that
// matters is the CPU used by everything that is NOT the benchmark (competing CPU) and the CPU time the hypervisor took away (steal).
//
// Over a window: the CPU that processes used, from /proc/stat (user + nice + system; idle, iowait and steal excluded; guest time is
// already inside user / nice), minus the CPU of the benchmark's own processes (/proc/<pid>/stat utime + stime, every thread), gives
// the competing CPU; /proc/stat's steal column gives the steal. Interrupt time (irq + softirq) is not charged to any process, so it
// cannot be split into own and competing; it is recorded separately (irqCpus) and not part of the rule (measured 2026-11-08: about
// 0.07 CPU during a render block, almost all the harness's own loopback traffic to the browser and its HTTP server). Both are expressed in CPUs (1.0 = one whole CPU for the whole window).
// The load averages are still recorded, for transparency only.
//
// The quiet rule (the same in run-scenes.mjs and render/run.mjs):
//   QUIET when, over the window, competing CPU <= QUIET.competingCpus (0.05: 5% of one CPU) and steal <= QUIET.stealCpus (0.05: 5% of
//   one CPU). A result measured in a window that is not quiet is PROVISIONAL. (This VM's resting steal is 0.01 to 0.02 CPU: 0.66% of
//   all CPU time since boot on 2026-11-08; the limit is set above that floor and flags real host contention.)
import fs from 'node:fs';
import os from 'node:os';
import { execSync } from 'node:child_process';

export const QUIET = { competingCpus: 0.05, stealCpus: 0.05, since: '2026-11-08', note: 'quiet = competing CPU (total busy - the benchmark\'s own processes) at most 0.05 CPU and steal at most 0.05 CPU, averaged over the window (/proc/stat, /proc/<pid>/stat); load averages recorded, not the rule' };
let HZ = 100; try { HZ = Number(execSync('getconf CLK_TCK', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()) || 100; } catch { /* default */ }
export const CLK_TCK = HZ;
const HAVE_PROC = fs.existsSync('/proc/stat');

/** The aggregate cpu line of /proc/stat, in clock ticks. */
export function procStat() {
  if (!HAVE_PROC) return null;
  const f = fs.readFileSync('/proc/stat', 'utf8').split('\n')[0].trim().split(/\s+/).slice(1).map(Number);
  const [user, nice, system, idle, iowait = 0, irq = 0, softirq = 0, steal = 0] = f;
  return { user, nice, system, idle, iowait, irq, softirq, steal, busy: user + nice + system };
}
/** utime + stime (clock ticks, all threads) of one process, or null when it is gone; with `reaped`, plus cutime + cstime (the CPU
 *  of its children that have exited and been waited for). */
export function pidTicks(pid, reaped = false) {
  try { const s = fs.readFileSync(`/proc/${pid}/stat`, 'utf8'); const f = s.slice(s.lastIndexOf(')') + 2).split(' '); return Number(f[11]) + Number(f[12]) + (reaped ? Number(f[13]) + Number(f[14]) : 0); } catch { return null; }
}
/** The pid and all its descendants (from /proc), for a harness whose children (a browser, a server) start and stop on their own. */
export function processTree(root = process.pid) {
  const parent = new Map();
  for (const d of fs.readdirSync('/proc')) { if (!/^\d+$/.test(d)) continue; try { const s = fs.readFileSync(`/proc/${d}/stat`, 'utf8'); parent.set(Number(d), Number(s.slice(s.lastIndexOf(')') + 2).split(' ')[1])); } catch { /* gone */ } }
  const mine = new Set([root]); let grew = true;
  while (grew) { grew = false; for (const [pid, pp] of parent) if (!mine.has(pid) && mine.has(pp)) { mine.add(pid); grew = true; } }
  return [...mine];
}

/**
 * Start a window. `ownPids` is a function returning the benchmark's own pids (called at the start and at the end; a pid seen only at
 * the end counts from zero, a pid gone at the end counts what it had at the start as used, i.e. nothing in the window).
 * `reapedOf` (a pid, normally process.pid): also count the CPU of its children that exited during the window (cutime + cstime),
 * for a tool that starts and stops its workers inside the window; such a child must not be listed by ownPids at the start.
 * Returns { end() -> the window's accounting }.
 */
export function cpuWindow(ownPids, { reapedOf = null } = {}) {
  const t0 = Date.now(); const s0 = procStat(); const la0 = os.loadavg();
  const tk = (p) => pidTicks(p, p === reapedOf);
  const own0 = new Map(); for (const p of ownPids()) { const t = tk(p); if (t != null) own0.set(p, t); }
  return {
    end() {
      const sec = (Date.now() - t0) / 1000; const s1 = procStat(); const la1 = os.loadavg(); const cpus = os.cpus().length;
      if (!s0 || !s1 || sec <= 0) return { seconds: +sec.toFixed(2), cpus, available: false, loadavgStart: la0.map((x) => +x.toFixed(2)), loadavgEnd: la1.map((x) => +x.toFixed(2)) };
      const pids = new Set([...own0.keys(), ...ownPids()]); let own = 0;
      for (const p of pids) { const t = tk(p); if (t == null) continue; own += t - (own0.get(p) ?? 0); }
      const per = (ticks) => ticks / HZ / sec; // CPUs
      const busy = per(s1.busy - s0.busy), ownC = per(own), steal = per(s1.steal - s0.steal), iowait = per(s1.iowait - s0.iowait);
      const competing = Math.max(0, busy - ownC); // the two counters are sampled separately: a small negative raw value means none
      return { seconds: +sec.toFixed(2), cpus, available: true, busyCpus: +busy.toFixed(4), ownCpus: +ownC.toFixed(4), competingCpus: +competing.toFixed(4), competingRawCpus: +(busy - ownC).toFixed(4), stealCpus: +steal.toFixed(4), iowaitCpus: +iowait.toFixed(4), irqCpus: +per((s1.irq + s1.softirq) - (s0.irq + s0.softirq)).toFixed(4), systemCpus: +per(s1.system - s0.system).toFixed(4),
        quiet: competing <= QUIET.competingCpus && steal <= QUIET.stealCpus, loadavgStart: la0.map((x) => +x.toFixed(2)), loadavgEnd: la1.map((x) => +x.toFixed(2)) };
    },
  };
}
/** Why a window is not quiet (empty when it is). */
export function loadReasons(w) {
  if (!w) return ['no machine accounting'];
  if (!w.available) return ['no /proc accounting (quiet not verifiable)'];
  const r = [];
  if (w.competingCpus > QUIET.competingCpus) r.push(`competing load ${w.competingCpus.toFixed(3)} CPU > ${QUIET.competingCpus}`);
  if (w.stealCpus > QUIET.stealCpus) r.push(`steal ${w.stealCpus.toFixed(3)} CPU > ${QUIET.stealCpus}`);
  return r;
}
