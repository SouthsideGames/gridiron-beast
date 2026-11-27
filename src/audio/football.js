import { audioBus, audioContext } from './context.js';
import { uiSounds } from './ui-sounds.js';
import { activityPaused } from '../ui/activity.js';

export const FOOTBALL_CLIPS = Object.freeze({
  snap_exchange_01: 'assets/audio/snap_exchange_01.wav',
  shotgun_snap_01: 'assets/audio/shotgun_snap_01.wav',
  throw_bullet: 'assets/audio/throw_bullet.wav',
  throw_touch: 'assets/audio/throw_touch.wav',
  throw_lob: 'assets/audio/throw_lob.wav',
  catch_hands_02: 'assets/audio/catch_hands_02.wav',
  kick_off: 'assets/audio/kick_off.wav',
  kick_field: 'assets/audio/kick_field.wav',
  kick_punt: 'assets/audio/kick_punt.wav',
  whistle_short_01: 'assets/audio/whistle_short_01.wav',
  whistle_dead_01: 'assets/audio/whistle_dead_01.wav',
  stadium_third_down_loop: 'assets/audio/stadium_third_down_loop.wav',
  stadium_touchdown_01: 'assets/audio/stadium_touchdown_01.wav',
  stadium_touchdown_02: 'assets/audio/stadium_touchdown_02.wav',
  stadium_roar: 'assets/audio/stadium_roar.wav',
  stadium_stir: 'assets/audio/stadium_stir.wav',
  stadium_big_hit_01: 'assets/audio/stadium_big_hit_01.wav',
  stadium_turnover_01: 'assets/audio/stadium_turnover_01.wav',
  stadium_applause_01: 'assets/audio/stadium_applause_01.wav',
});

export function stadiumBed(state) {
  if (state.finished) return null;
  return state.phase === 'scrimmage' && state.down === 3 && state.possession === 'away'
    ? 'stadium_third_down_loop' : null;
}

export function footballCues(event, play) {
  const kick = { kickoff: 'kick_off', punt: 'kick_punt', field_goal: 'kick_field' }[event.kind]
    || (event.kind === 'try' && event.kicking ? 'kick_field' : null);
  if (kick) {
    if (event.res?.noKicker || event.res?.forfeit) return [];
    const frames = event.sim?.frames;
    const cues = [{ id: kick, time: frames?.find(frame => frame.ball?.[2] > 0)?.t ?? 0 }];
    if (event.kind === 'kickoff' || event.kind === 'punt') {
      const result = event.res;
      const recordedCatch = event.sim?.events?.find(beat => beat.kind === 'kick_catch');
      const animatedCatch = frames?.find(frame => frame.holderTeam === 'def' && ['KR', 'PR'].includes(frame.holder));
      const caughtWithoutFrames = !frames?.length && result && !result.onside && !result.blocked
        && (!result.touchback || result.returned)
        && (result.fairCatch || result.touchdown || result.returnYards != null);
      const catchTime = recordedCatch?.t ?? (result?.onside ? null : animatedCatch?.t)
        ?? (caughtWithoutFrames ? 0 : null);
      if (catchTime != null) cues.push({ id: 'catch_hands_02', time: catchTime });
    }
    return cues;
  }
  if (event.kind !== 'play' && !(event.kind === 'try' && event.offensePlayId)) return [];

  const cues = [{ id: play?.align?.QB?.[0] <= -3 ? 'shotgun_snap_01' : 'snap_exchange_01', time: 0 }];
  for (const beat of event.sim?.events || []) {
    if (beat.kind === 'throw') {
      const depth = beat.targetDepth;
      const tags = play?.tags || [];
      const short = tags.includes('screen') || (Number.isFinite(depth) ? depth < 10 : tags.includes('short'));
      const deep = Number.isFinite(depth) ? depth >= 20 : tags.includes('deep');
      cues.push({ id: short ? 'throw_bullet' : deep ? 'throw_lob' : 'throw_touch', time: beat.t });
    } else if (beat.kind === 'catch' || beat.kind === 'interception') {
      cues.push({ id: 'catch_hands_02', time: beat.t });
    }
  }
  return cues;
}

export function stadiumOutcome(event) {
  const result = event.sim?.result;
  if ((event.kind === 'play' && result === 'touchdown')
    || (event.kind === 'kickoff' && event.scored)
    || (event.kind === 'punt' && event.res?.touchdown)) return 'touchdown';
  if (['interception', 'touchback_return', 'fumble'].includes(result)
    || (event.kind === 'play' && event.down === 4 && !event.firstDown && event.possessionChanged)) return 'stadium_turnover_01';
  if (event.kind === 'play' && event.down === 3 && event.firstDown) {
    return event.offenseSide === 'home' ? 'stadium_roar' : 'stadium_stir';
  }
  if ((event.kind === 'field_goal' && event.scored) || (event.kind === 'try' && event.good)) return 'stadium_applause_01';
  if (result === 'sack' || event.sim?.events?.some(beat => beat.kind === 'pancake')) return 'stadium_big_hit_01';
  return null;
}

export function periodWhistle(previous, state) {
  const final = state.finished && (!state.needsTiebreak || !!state.winner);
  if (previous && final && !previous.final) return 'whistle_dead_01';
  if (!state.finished && (previous ? state.quarter !== previous.quarter
    : state.quarter === 1 && state.phase === 'kickoff' && !state.playCount)) return 'whistle_short_01';
  return null;
}

export function createFootballAudio() {
  const buffers = new Map();
  const playing = new Set();
  let active = false;
  let bed = null;
  let loop = null;
  let generation = 0;
  let touchdownTake = 0;

  function load(id) {
    if (!buffers.has(id)) {
      buffers.set(id, Promise.resolve().then(async () => {
        const context = audioContext();
        return context ? await uiSounds.load(context, FOOTBALL_CLIPS[id]) : null;
      }).catch(() => null));
    }
    return buffers.get(id);
  }

  async function play(id, isLoop = false) {
    const ticket = generation;
    const buffer = await load(id);
    if (!buffer || !active || activityPaused() || ticket !== generation || (isLoop && (bed !== id || loop))) return;
    const context = audioContext();
    if (context?.state !== 'running') return;
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.loop = isLoop;
    source.connect(audioBus(id.startsWith('stadium_') ? 'crowd' : 'sfx'));
    playing.add(source);
    if (isLoop) loop = source;
    source.onended = () => {
      playing.delete(source);
      if (loop === source) loop = null;
      source.disconnect();
    };
    source.start();
  }

  function sync(nextBed) {
    if (!active) {
      active = true;
      for (const id of Object.keys(FOOTBALL_CLIPS)) void load(id);
    }
    if (bed !== nextBed || activityPaused()) {
      const previous = loop;
      loop = null;
      previous?.stop();
      bed = nextBed;
    }
    if (bed && !loop && !activityPaused()) void play(bed, true);
  }

  function stop() {
    generation++;
    for (const source of playing) source.stop();
    playing.clear();
    loop = null;
  }

  function cue(id) {
    if (id && active && !activityPaused()) void play(id);
  }

  globalThis.addEventListener?.('gb-playback-pause', stop);
  globalThis.addEventListener?.('gb-playback-resume', () => { if (active) sync(bed); });
  globalThis.document?.addEventListener('pointerup', () => { if (active && bed && !loop) sync(bed); });

  return {
    sync, cue,
    outcome(event) {
      const reaction = stadiumOutcome(event);
      if (reaction === 'touchdown') {
        touchdownTake = 1 - touchdownTake;
        cue(touchdownTake ? 'stadium_touchdown_01' : 'stadium_touchdown_02');
      } else cue(reaction);
    },
    leave() { active = false; bed = null; stop(); },
  };
}
