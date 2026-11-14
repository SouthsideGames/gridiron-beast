// Editorial content is independent of gameplay. Existing descriptions remain the fallback.
// New writing is a review draft; it is not a replacement for the approved prototype text.
import { LINKED_FAMILY_DRAFTS } from './content/linked-families.js';
import { familyById, formsOf } from '../data/beast-dex.js';

export const CONTENT_VERSION = 2;
const immutable = value => { if (value && typeof value === 'object' && !Object.isFrozen(value)) { for (const child of Object.values(value)) immutable(child); Object.freeze(value); } return value; };
const FLAROO = [
  {
    biography: [
      'Flaroo treats sitting still as a problem that somebody else should solve. During timeouts it circles the bench, checks whether the next play has started, and circles the bench again just in case. Its bright ears and burning tail make it easy to spot; convincing it that warm-ups have ended is considerably harder.',
      'Under the restless enthusiasm is a creature that wants to be useful. Flaroo celebrates a teammate’s first down with the same excitement as its own and takes a missed assignment personally. It is still learning that helping sometimes means waiting for the right moment instead of arriving at every moment at full speed.',
    ],
    personality: 'Eager, affectionate, and impatient with absolutely anything that resembles a pause.',
    funFacts: ['Its idea of resting between drills is a slower lap.', 'It has been known to celebrate the practice whistle before discovering that it means practice is starting.'],
    development: 'Its first challenge is learning to direct its enthusiasm instead of spending all of it at once.',
    lore: [
      { games: 5, title: 'The extra lap', text: 'A Flaroo that finishes a drill often turns back to run alongside the last teammate. Coaches sometimes mistake this for leftover energy. The teammate usually understands it better.' },
      { games: 15, title: 'Learning the pause', text: 'Trust changes its behavior in small ways. Instead of pacing directly in front of a teammate during a difficult moment, it settles nearby. The tail still moves. The rest of it is trying very hard.' },
      { games: 30, title: 'A place on the bench', text: 'For all its movement, Flaroo keeps returning to the same spot beside its teammates. What it wants is not an endless run. It wants to know that, when the run is over, somebody has saved it a place.' },
    ],
  },
  {
    biography: [
      'Blazynx has discovered that waiting can be part of the chase. It watches a drill with a stillness that would have alarmed its younger self, then commits in one decisive burst. The old eagerness survives in the way it leans toward the field when its name is called.',
      'It enjoys looking composed almost as much as it enjoys succeeding. A clean practice rep earns a measured nod; a compliment can undo the entire performance. Teammates learn to recognize the tiny preparations before it moves and the much less subtle pride afterward.',
    ],
    personality: 'Focused and competitive, with a dignified manner that praise can unravel in seconds.',
    funFacts: ['It will pretend that it was not waiting to hear the coach’s verdict.', 'Its impressive patience ends abruptly when someone suggests one more practice rep.'],
    development: 'Restless enthusiasm becomes purposeful anticipation. It is learning to trust timing as much as effort.',
    lore: [
      { games: 5, title: 'Before the burst', text: 'Blazynx studies repetitions that once bored it. Its attention lingers on the instant before a teammate moves, as though it is trying to discover where a good decision begins.' },
      { games: 15, title: 'The quiet challenge', text: 'It rarely announces a contest. It simply repeats a teammate’s drill a little more carefully and checks whether anyone noticed. Usually, everyone did.' },
      { games: 30, title: 'Someone to follow', text: 'The first time a younger beast copies its routine, Blazynx becomes unusually deliberate. It has spent so long trying to look ready that being trusted to lead makes it want to be ready for real.' },
    ],
  },
  {
    biography: [
      'Infernox carries its energy with confidence instead of hurry. It no longer needs to be the first creature moving at every whistle. It surveys the group, finds its place, and makes that place feel dependable. Then the drill starts, and nobody mistakes its calm for a lack of enthusiasm.',
      'Its protective streak appears in ordinary routines: waiting for the last teammate, repeating an exercise beside a discouraged rookie, and accepting congratulations only after checking who else deserves them. It still enjoys attention. It has simply become better at sharing it.',
    ],
    personality: 'Steady, proud, and quietly protective; still delighted when the whole team joins the celebration.',
    funFacts: ['It remains suspiciously available whenever a rookie needs a practice partner.', 'Its solemn pregame routine occasionally ends with the same impatient lean it had as a Flaroo.'],
    development: 'The desire to belong matures into the confidence to make others feel that they belong.',
    lore: [
      { games: 5, title: 'The last teammate', text: 'Infernox finishes its work and looks back. If someone is still struggling, it makes its way over without turning the moment into an announcement.' },
      { games: 15, title: 'A familiar routine', text: 'Younger beasts sometimes gather around it before practice. It lets them imitate the serious parts of its routine and carefully overlooks their mistakes in the less serious parts.' },
      { games: 30, title: 'The place it saved', text: 'A young Flaroo once wanted somebody to save it a place on the bench. Infernox now leaves room beside itself. It does not explain the gesture; the teammate who needs that place rarely asks it to.' },
    ],
  },
];

export const EDITORIAL_DRAFTS = immutable({ emberfox: FLAROO, ...LINKED_FAMILY_DRAFTS });
const FLAROO_REACTIONS = [
  { normal: ['{name} leans forward, ready for the practice whistle.', '{name} turns its ears toward you, then checks whether the team is moving.'], rare: ['{name} makes an earnest attempt to sit still beside you. The tail has not agreed to the arrangement.'] },
  { normal: ['{name} watches you with carefully practiced composure.'], rare: ['{name} seems to anticipate a compliment. Its carefully composed expression is already slipping.'] },
  { normal: ['{name} pauses to make certain you have its attention.'], rare: ['{name} leaves a little room beside itself, then waits as though the invitation needs no explanation.'] },
];

// Curated editorial drafts, reciprocal where the relationship involves two species.
const RELATIONSHIPS = {
  emberfox: [
    { familyId: 'thornkit', kind: 'friendship', games: 5, text: 'Spriglet’s curiosity gives Flaroo an enthusiastic practice partner. Their chasing games tend to continue after everyone else agrees the drill is over.' },
    { familyId: 'ashkit', kind: 'rivalry', games: 15, text: 'Cindruff’s stubbornness meets Flaroo’s refusal to stop moving. Each insists the other was the first to ask whether practice was finished.' },
    { familyId: 'pyroclast', kind: 'legendary folklore', games: 30, text: 'A locker-room story claims that the smallest Flaroo warms up as if Pyroclast might arrive to inspect the team. Nobody agrees who started the story; the extra laps are real enough.' },
  ],
  thornkit: [{ familyId: 'emberfox', kind: 'friendship', games: 5, text: 'Flaroo makes an eager partner for Spriglet’s chasing games. The challenge is persuading either of them to declare a winner and go home.' }],
  ashkit: [{ familyId: 'emberfox', kind: 'rivalry', games: 15, text: 'Flaroo keeps moving; Cindruff keeps insisting it can keep going. Their teammates have learned not to ask who wants one more rep.' }],
  pyroclast: [{ familyId: 'emberfox', kind: 'legendary folklore', games: 30, text: 'One locker-room tale imagines Pyroclast inspecting a young Flaroo’s warm-up. It is a story about the little beast’s determination, not a documented encounter.' }],
};

/** Stage-specific editorial draft; physical measurements are never invented. */
export function dexContent(familyId, stage = 0) {
  const family = familyById(familyId);
  const form = formsOf(familyId).find(x => x.stage === stage);
  if (!family || !form) return null;
  const draft = EDITORIAL_DRAFTS[familyId]?.[stage];
  return immutable({
    version: CONTENT_VERSION, id: form.id, familyId, stage, name: form.name,
    status: draft || RELATIONSHIPS[familyId] ? 'draft' : 'existing-description',
    biography: draft?.biography || [family.description],
    personality: draft?.personality || family.description,
    funFacts: draft?.funFacts || [], development: draft?.development || '',
    lore: draft?.lore || [], relationships: RELATIONSHIPS[familyId] || [],
    habitat: draft?.habitat || (familyId === 'emberfox' ? 'Found around the Volcanic Fields and Thunder Plains, this family brings its energy back to familiar paths and the company of its team.' : ''),
    reactions: draft?.reactions || (familyId === 'emberfox' ? FLAROO_REACTIONS[stage] : null),
    expanded: !!draft,
    scouting: family.buildIdentity || '',
  });
}

/** A stable, cosmetic-only identity, derived without consuming franchise randomness. */
export function individualQuirk(monster) {
  const quirks = [
    'Checks that everyone is ready before heading to practice.',
    'Treats its favorite spot near the team as a reserved seat.',
    'Prefers a familiar routine before a big game.',
    'Seems particularly pleased when teammates notice a good effort.',
    'Likes a little quiet time after a busy practice.',
    'Always seems ready for one more team celebration.',
  ];
  let hash = 2166136261;
  for (const char of String(monster?.id || monster?.species || 'beast')) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  return quirks[hash % quirks.length];
}

/** Text reactions have no status, morale, attribute, mastery, or gameplay effects. */
export function portraitReaction({ name, features = [], rare = false, reactions = null, choice = 0 }) {
  const options = reactions?.[rare ? 'rare' : 'normal'];
  if (options?.length) return options[Math.abs(choice) % options.length].replaceAll('{name}', name);
  if (rare) return `${name} pauses to give you its undivided attention. Apparently, this is a very important team meeting.`;
  if (features.includes('ears')) return `${name} turns its ears toward you.`;
  return `${name} notices you and settles into a familiar pose.`;
}
