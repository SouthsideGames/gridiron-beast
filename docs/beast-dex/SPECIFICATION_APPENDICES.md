# Task 8 specification: Appendices A–C

[Specification snapshot](SPECIFICATION_BASELINE.md) · [Beast Dex](README.md)

These are the appendices of the consolidated Task 8 specification, Revision 1 (owner decisions through November 5 2026), imported verbatim from the owner's `Gridiron_Beast_Task_8_Consolidated.docx` on 2026-11-06. The repository snapshot `SPECIFICATION_BASELINE.md` omitted them.

- **Appendix A** (family and ability index) matches `data/families.json` for all 72 original families. Each family's position and Clash archetype was checked on 2026-11-06.
- **Appendix B** is the shared twelve-status journal. The main specification's rules govern stacking, clocks and later corrections.
- **Appendix C** is the attribute-role reference.

Where an appendix keeps older wording, the main specification's explicit overrides and later approvals take precedence (`APPROVED_RULES.md`, `PROGRESSION_DECISIONS.md`).

# Appendix A Family and ability index

Source: Beast Dex version 18. Family IDs preserve traceability; legacy positions and abilities are excluded from this index. Full contracts remain in the companion workbook.

## Fire

<table>
<colgroup>
<col style="width: 21%" />
<col style="width: 20%" />
<col style="width: 28%" />
<col style="width: 28%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>Family / ID</strong></th>
<th><strong>Position / archetype</strong></th>
<th><strong>Football signature</strong></th>
<th><strong>Beast Clash ability</strong></th>
</tr>
</thead>
<tbody>
<tr class="odd">
<td>Flaroo<br />
emberfox</td>
<td>RB / Balanced</td>
<td>Blazing Resolve</td>
<td>Stoke the Flame</td>
</tr>
<tr class="even">
<td>Cindruff<br />
ashkit</td>
<td>LB / Disruptor</td>
<td>Impact Pyre</td>
<td>Cinder Clamp</td>
</tr>
<tr class="odd">
<td>Pyronix<br />
firestorm</td>
<td>QB / Striker</td>
<td>Meteor Impact</td>
<td>Falling Star</td>
</tr>
<tr class="even">
<td>Scorchulk<br />
cinderclaw</td>
<td>DL / Balanced</td>
<td>Ember Grip — Scorch Mark</td>
<td>Molten Brand</td>
</tr>
<tr class="odd">
<td>Flarynx<br />
pyrelynx</td>
<td>CB / Tank</td>
<td>Heat Haze</td>
<td>Heat Mirage</td>
</tr>
<tr class="even">
<td>Pyroclast<br />
pyroclast</td>
<td>TE / Disruptor</td>
<td>Eruption — Burning Wake</td>
<td>Faultline</td>
</tr>
</tbody>
</table>

## Water

<table>
<colgroup>
<col style="width: 21%" />
<col style="width: 20%" />
<col style="width: 28%" />
<col style="width: 28%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>Family / ID</strong></th>
<th><strong>Position / archetype</strong></th>
<th><strong>Football signature</strong></th>
<th><strong>Beast Clash ability</strong></th>
</tr>
</thead>
<tbody>
<tr class="odd">
<td>Aquip<br />
tidepaw</td>
<td>CB / Support</td>
<td>Splashdown</td>
<td>Second Tide</td>
</tr>
<tr class="even">
<td>Muddlet<br />
mudcub</td>
<td>OL / Tank</td>
<td>Divided Guard</td>
<td>Shared Burden</td>
</tr>
<tr class="odd">
<td>Crustank<br />
reefclaw</td>
<td>DL / Tank</td>
<td>Pressure Drain</td>
<td>Shell Renewal</td>
</tr>
<tr class="even">
<td>Ripplet<br />
tidefin</td>
<td>WR / Disruptor</td>
<td>Second Touch</td>
<td>Wash Away</td>
</tr>
<tr class="odd">
<td>Tideram<br />
wavehorn</td>
<td>TE / Balanced</td>
<td>Breakwater</td>
<td>Riptide Charge</td>
</tr>
<tr class="even">
<td>Tsunarok<br />
tsunarok</td>
<td>S / Disruptor</td>
<td>Tsunami Line</td>
<td>Riptide Pursuit</td>
</tr>
</tbody>
</table>

## Nature

<table>
<colgroup>
<col style="width: 21%" />
<col style="width: 20%" />
<col style="width: 28%" />
<col style="width: 28%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>Family / ID</strong></th>
<th><strong>Position / archetype</strong></th>
<th><strong>Football signature</strong></th>
<th><strong>Beast Clash ability</strong></th>
</tr>
</thead>
<tbody>
<tr class="odd">
<td>Spriglet<br />
thornkit</td>
<td>WR / Support</td>
<td>Bloom Break</td>
<td>Second Spring</td>
</tr>
<tr class="even">
<td>Mossmaw<br />
mossclaw</td>
<td>DL / Balanced</td>
<td>Vine Vault</td>
<td>Spore Detonation</td>
</tr>
<tr class="odd">
<td>Bramblet<br />
rootram</td>
<td>OL / Tank</td>
<td>Deep Roots</td>
<td>Last Root</td>
</tr>
<tr class="even">
<td>Florant<br />
leafhorn</td>
<td>S / Support</td>
<td>Surefoot Canopy</td>
<td>Canopy Assist</td>
</tr>
<tr class="odd">
<td>Thornback<br />
thornback</td>
<td>TE / Tank</td>
<td>Bramble Trap</td>
<td>Shell Harvest</td>
</tr>
<tr class="even">
<td>Elderoot<br />
elderoot</td>
<td>LB / Support</td>
<td>Grove Guardian</td>
<td>Root Communion</td>
</tr>
</tbody>
</table>

## Electric

<table>
<colgroup>
<col style="width: 21%" />
<col style="width: 20%" />
<col style="width: 28%" />
<col style="width: 28%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>Family / ID</strong></th>
<th><strong>Position / archetype</strong></th>
<th><strong>Football signature</strong></th>
<th><strong>Beast Clash ability</strong></th>
</tr>
</thead>
<tbody>
<tr class="odd">
<td>Zippit<br />
flicker</td>
<td>WR / Support</td>
<td>Crossed Wires</td>
<td>Lightning Rod</td>
</tr>
<tr class="even">
<td>Volcoil<br />
voltfin</td>
<td>RB / Balanced</td>
<td>Charge Strip</td>
<td>Arc Rebound</td>
</tr>
<tr class="odd">
<td>Zappard<br />
voltfang</td>
<td>WR / Striker</td>
<td>Phase Release</td>
<td>Phase Strike</td>
</tr>
<tr class="even">
<td>Statyx<br />
stormlynx</td>
<td>S / Disruptor</td>
<td>Static Field</td>
<td>Circuit Breaker</td>
</tr>
<tr class="odd">
<td>Joltrex<br />
joltrex</td>
<td>DL / Striker</td>
<td>Chain Break</td>
<td>Victory Surge</td>
</tr>
<tr class="even">
<td>Voltarch<br />
stormcrown</td>
<td>QB / Striker</td>
<td>Stormguard</td>
<td>Twin Thunder</td>
</tr>
</tbody>
</table>

## Ice

<table>
<colgroup>
<col style="width: 21%" />
<col style="width: 20%" />
<col style="width: 28%" />
<col style="width: 28%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>Family / ID</strong></th>
<th><strong>Position / archetype</strong></th>
<th><strong>Football signature</strong></th>
<th><strong>Beast Clash ability</strong></th>
</tr>
</thead>
<tbody>
<tr class="odd">
<td>Flurrit<br />
snowmoth</td>
<td>K / Support</td>
<td>Frostmark</td>
<td>Fresh Start</td>
</tr>
<tr class="even">
<td>Frostpup<br />
hailfang</td>
<td>CB / Disruptor</td>
<td>Frost Nip</td>
<td>Cold Welcome</td>
</tr>
<tr class="odd">
<td>Cryolynx<br />
frostclaw</td>
<td>LB / Balanced</td>
<td>Snowfall Slam</td>
<td>Snowbank Shot</td>
</tr>
<tr class="even">
<td>Glaciram<br />
icehorn</td>
<td>DL / Tank</td>
<td>Permafrost</td>
<td>Snowdrift Shelter</td>
</tr>
<tr class="odd">
<td>Shardok<br />
glaciron</td>
<td>OL / Tank</td>
<td>Cold Snap</td>
<td>Glacier Wall</td>
</tr>
<tr class="even">
<td>Glacivern<br />
glacivern</td>
<td>K / Disruptor</td>
<td>Second Chance</td>
<td>Deep Winter</td>
</tr>
</tbody>
</table>

## Wind

<table>
<colgroup>
<col style="width: 21%" />
<col style="width: 20%" />
<col style="width: 28%" />
<col style="width: 28%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>Family / ID</strong></th>
<th><strong>Position / archetype</strong></th>
<th><strong>Football signature</strong></th>
<th><strong>Beast Clash ability</strong></th>
</tr>
</thead>
<tbody>
<tr class="odd">
<td>Gustling<br />
gustling</td>
<td>WR / Support</td>
<td>Runway</td>
<td>Feather Relay</td>
</tr>
<tr class="even">
<td>Zephyroo<br />
breezefang</td>
<td>RB / Balanced</td>
<td>Slipstream Step</td>
<td>Gust Hop</td>
</tr>
<tr class="odd">
<td>Aeralis<br />
skywarden</td>
<td>CB / Disruptor</td>
<td>Air Brake</td>
<td>Downdraft</td>
</tr>
<tr class="even">
<td>Galyx<br />
windlynx</td>
<td>S / Support</td>
<td>Crosswind Rescue</td>
<td>Second Wind</td>
</tr>
<tr class="odd">
<td>Zephiro<br />
zephyr</td>
<td>QB / Support</td>
<td>Tailwind Huddle</td>
<td>Tailwind Pact</td>
</tr>
<tr class="even">
<td>Tempestra<br />
tempestra</td>
<td>WR / Disruptor</td>
<td>Cyclonic Release</td>
<td>Eye of the Storm</td>
</tr>
</tbody>
</table>

## Earth

<table>
<colgroup>
<col style="width: 21%" />
<col style="width: 20%" />
<col style="width: 28%" />
<col style="width: 28%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>Family / ID</strong></th>
<th><strong>Position / archetype</strong></th>
<th><strong>Football signature</strong></th>
<th><strong>Beast Clash ability</strong></th>
</tr>
</thead>
<tbody>
<tr class="odd">
<td>Pebblit<br />
pebble</td>
<td>OL / Tank</td>
<td>Clean Sweep</td>
<td>Emergency Cover</td>
</tr>
<tr class="even">
<td>Craggo<br />
rockram</td>
<td>LB / Balanced</td>
<td>Stonewall Swat</td>
<td>Rubble Reprisal</td>
</tr>
<tr class="odd">
<td>Bouldrox<br />
boulderox</td>
<td>RB / Tank</td>
<td>Stone Charge</td>
<td>Unbroken Charge</td>
</tr>
<tr class="even">
<td>Granigor<br />
stoneguard</td>
<td>K / Striker</td>
<td>Stone Cradle</td>
<td>Bank Shot</td>
</tr>
<tr class="odd">
<td>Terrabull<br />
terrabull</td>
<td>TE / Disruptor</td>
<td>Stone Screen</td>
<td>Stone Divide</td>
</tr>
<tr class="even">
<td>Titanolith<br />
titanolith</td>
<td>OL / Tank</td>
<td>Landslide</td>
<td>Mountain Shelter</td>
</tr>
</tbody>
</table>

## Dark

<table>
<colgroup>
<col style="width: 21%" />
<col style="width: 20%" />
<col style="width: 28%" />
<col style="width: 28%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>Family / ID</strong></th>
<th><strong>Position / archetype</strong></th>
<th><strong>Football signature</strong></th>
<th><strong>Beast Clash ability</strong></th>
</tr>
</thead>
<tbody>
<tr class="odd">
<td>Umbrikit<br />
shadowkit</td>
<td>CB / Balanced</td>
<td>Shadow Patch</td>
<td>Shadow Pounce</td>
</tr>
<tr class="even">
<td>Noctlet<br />
nightowl</td>
<td>S / Striker</td>
<td>Night Watch</td>
<td>Night Swoop</td>
</tr>
<tr class="odd">
<td>Duskyre<br />
duskrunner</td>
<td>RB / Striker</td>
<td>Vanishing Cut</td>
<td>Predator Rhythm</td>
</tr>
<tr class="even">
<td>Murklaw<br />
mireclaw</td>
<td>LB / Striker</td>
<td>Ambush Tag</td>
<td>Ambush</td>
</tr>
<tr class="odd">
<td>Nocturne<br />
nocturne</td>
<td>QB / Disruptor</td>
<td>Blackout Pocket</td>
<td>Eclipse Call</td>
</tr>
<tr class="even">
<td>Nyxshade<br />
nyxshade</td>
<td>CB / Disruptor</td>
<td>Shadow Exchange</td>
<td>Eclipse Theft</td>
</tr>
</tbody>
</table>

## Light

<table>
<colgroup>
<col style="width: 21%" />
<col style="width: 20%" />
<col style="width: 28%" />
<col style="width: 28%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>Family / ID</strong></th>
<th><strong>Position / archetype</strong></th>
<th><strong>Football signature</strong></th>
<th><strong>Beast Clash ability</strong></th>
</tr>
</thead>
<tbody>
<tr class="odd">
<td>Lumini<br />
glimmer</td>
<td>WR / Support</td>
<td>Beacon Lane</td>
<td>Glow Mend</td>
</tr>
<tr class="even">
<td>Solchirp<br />
sunwhistle</td>
<td>K / Support</td>
<td>Dawn Signal</td>
<td>Dawn Song</td>
</tr>
<tr class="odd">
<td>Lumen<br />
lumen</td>
<td>QB / Support</td>
<td>Guiding Halo</td>
<td>Clear Light</td>
</tr>
<tr class="even">
<td>Prismara<br />
prism</td>
<td>S / Disruptor</td>
<td>Prism Break</td>
<td>Refraction</td>
</tr>
<tr class="odd">
<td>Haloryx<br />
halofang</td>
<td>LB / Striker</td>
<td>Radiant Pursuit</td>
<td>Radiant Pursuit</td>
</tr>
<tr class="even">
<td>Aurelion<br />
aurelion</td>
<td>WR / Striker</td>
<td>Daybreak</td>
<td>Daybreak Lance</td>
</tr>
</tbody>
</table>

## Metal

<table>
<colgroup>
<col style="width: 21%" />
<col style="width: 20%" />
<col style="width: 28%" />
<col style="width: 28%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>Family / ID</strong></th>
<th><strong>Position / archetype</strong></th>
<th><strong>Football signature</strong></th>
<th><strong>Beast Clash ability</strong></th>
</tr>
</thead>
<tbody>
<tr class="odd">
<td>Ferrcub<br />
ironcub</td>
<td>OL / Balanced</td>
<td>Anchor Plate</td>
<td>Forge Swipe</td>
</tr>
<tr class="even">
<td>Steelpaw<br />
steelpaw</td>
<td>LB / Tank</td>
<td>Iron Lungs</td>
<td>Tempered Guard</td>
</tr>
<tr class="odd">
<td>Coglet<br />
gearwing</td>
<td>K / Balanced</td>
<td>Gear Grid</td>
<td>Gear Shot</td>
</tr>
<tr class="even">
<td>Ferronox<br />
ironjaw</td>
<td>DL / Striker</td>
<td>Ball Clamp</td>
<td>Iron Bite</td>
</tr>
<tr class="odd">
<td>Ferrhorn<br />
metalhorn</td>
<td>TE / Support</td>
<td>Bulwark Grid</td>
<td>Shield Wall</td>
</tr>
<tr class="even">
<td>Aegistron<br />
aegistron</td>
<td>DL / Tank</td>
<td>Fortress Gate</td>
<td>Fortress</td>
</tr>
</tbody>
</table>

## Psychic

<table>
<colgroup>
<col style="width: 21%" />
<col style="width: 20%" />
<col style="width: 28%" />
<col style="width: 28%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>Family / ID</strong></th>
<th><strong>Position / archetype</strong></th>
<th><strong>Football signature</strong></th>
<th><strong>Beast Clash ability</strong></th>
</tr>
</thead>
<tbody>
<tr class="odd">
<td>Psyflutter<br />
mindwing</td>
<td>S / Support</td>
<td>Mind Bend</td>
<td>Mind Mend</td>
</tr>
<tr class="even">
<td>Wispira<br />
shadewisp</td>
<td>CB / Tank</td>
<td>Mirror Step</td>
<td>Mirage Veil</td>
</tr>
<tr class="odd">
<td>Cerebrix<br />
cerebrix</td>
<td>QB / Disruptor</td>
<td>Foresight</td>
<td>Foresight</td>
</tr>
<tr class="even">
<td>Echolot<br />
echolot</td>
<td>K / Balanced</td>
<td>Echo Landing</td>
<td>Echo Strike</td>
</tr>
<tr class="odd">
<td>Enigmane<br />
enigmane</td>
<td>TE / Disruptor</td>
<td>Mind Game</td>
<td>Mind Game</td>
</tr>
<tr class="even">
<td>Astralux<br />
astralux</td>
<td>RB / Striker</td>
<td>Blink</td>
<td>Astral Strike</td>
</tr>
</tbody>
</table>

## Dragon

<table>
<colgroup>
<col style="width: 21%" />
<col style="width: 20%" />
<col style="width: 28%" />
<col style="width: 28%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>Family / ID</strong></th>
<th><strong>Position / archetype</strong></th>
<th><strong>Football signature</strong></th>
<th><strong>Beast Clash ability</strong></th>
</tr>
</thead>
<tbody>
<tr class="odd">
<td>Drakling<br />
drakeling</td>
<td>RB / Striker</td>
<td>Dragon Pounce</td>
<td>Dragon Pounce</td>
</tr>
<tr class="even">
<td>Wyrmlet<br />
wyrmkit</td>
<td>TE / Support</td>
<td>Dragon Call</td>
<td>Coil Renewal</td>
</tr>
<tr class="odd">
<td>Sablewing<br />
sablewing</td>
<td>CB / Balanced</td>
<td>Hoard Flight</td>
<td>Wing Shelter</td>
</tr>
<tr class="even">
<td>Scalor<br />
scaleguard</td>
<td>OL / Balanced</td>
<td>Dragon Stomp</td>
<td>Dragonhide</td>
</tr>
<tr class="odd">
<td>Vyrnax<br />
vyrnax</td>
<td>K / Striker</td>
<td>Dragon Roar</td>
<td>Dragon Roar</td>
</tr>
<tr class="even">
<td>Aurodrax<br />
aurodrax</td>
<td>QB / Balanced</td>
<td>Sovereign Arm</td>
<td>Sovereign Balance</td>
</tr>
</tbody>
</table>

# Appendix B Shared status journal

Approved identities and icon reference from version 18. Main specification rules govern stacking, clocks and later corrections. Within-play Stunned recovery remains an explicit closure item; no second-based duration is authorized here.

## STA-01 Stunned

**Kind:** Harmful

**Football:** Movement immediately stops; cannot move, block or attempt tackles until the within-play disable ends.

**Beast Clash:** Skip normal action under approved consecutive-normal-action safeguards. A skipped normal turn consumes duration.

**Icon:** Three yellow stars

**Identity / exceptions:** Shared; replaces Shock and Frozen when their mechanic is complete interruption. Source animations may remain elemental.

## STA-02 Slowed

**Kind:** Harmful

**Football:** Reduce maximum movement speed by application percentage; movement, turning, blocking and tackling remain possible.

**Beast Clash:** Reduce combat speed and likelihood of acting first; no skipped action.

**Icon:** Blue snail silhouette, dark outline

**Identity / exceptions:** Shared; replaces Chill as status name. It changes speed ceiling, unlike Stumbled.

## STA-03 Stumbled

**Kind:** Harmful

**Football:** Lose engagement and 40% of current movement speed; recover through normal acceleration and ordinary re-engagement rules. Clear at the whistle. No one-second recovery timer.

**Beast Clash:** Not used; clear this status when monster enters Beast Clash.

**Icon:** Orange tilted footprint with two skid marks

**Identity / exceptions:** Football only. Pancake-failure stumble follows the engagement-loss and acceleration recovery rule in Section 9.

## STA-04 Knocked Down

**Kind:** Harmful

**Football:** Monster is on ground and cannot move, block or tackle until recovery. Pancake-caused Knocked Down lasts remainder of current play and clears at whistle. Other sources use their own approved lifetime.

**Beast Clash:** Not used; clear this status when monster enters Beast Clash.

**Icon:** Dark lying monster silhouette with orange impact burst

**Identity / exceptions:** Football only. Pancake is blocking outcome, Knocked Down existing status. Owner final closeout8 replaces five-live-second pancake duration with rest-current-play duration.

## STA-05 Afflicted

**Kind:** Harmful

**Football:** Temporarily reduce effective Durability, weakening BOTH fatigue and injury resistance. Stored rating unchanged; normal injury checks, no guaranteed injury.

**Beast Clash:** Recurring HP damage at END of own normal turn, before duration decrement. No application-turn tick, reserve-time tick, counter or reaction tick.

**Icon:** Purple heart with small downward arrow

**Identity / exceptions:** Shared; replaces Burning/Burn as player-facing name. Does not imply elemental source. Fire fields still slow; they do not automatically afflict.

## STA-06 Weakened

**Kind:** Harmful

**Football:** Temporarily reduce effective Strength for contests using it; no movement slowdown or skipped action.

**Beast Clash:** Reduce outgoing attack damage.

**Icon:** Purple cracked fist, dark outline

**Identity / exceptions:** Shared; replaces Daze as player-facing name. Does not automatically replace Scorch Mark’s pair-specific Strength AND Blocking mechanic.

## STA-07 Confused

**Kind:** Harmful

**Football:** Reduce effective Awareness for reads/reactions; never delay user controls or ignore user input.

**Beast Clash:** Default 25% chance per eligible normal attack to redirect FULL intended attack and special effects to own side. Self is primary target; splash/secondary effects can hit allies. Reactions/counters do not roll.

**Icon:** Purple question mark, dark outline

**Identity / exceptions:** Shared. Delayed attacks roll at LAUNCH; mark threatened side immediately; do not reroll at impact. Different legacy labels merge only when their mechanic actually matches.

## STA-08 Healing Reduced

**Kind:** Harmful

**Football:** Not used; clear this status when monster enters football.

**Beast Clash:** Reduce all HP restoration by application percentage; 100% blocks self/ally healing, regeneration and damage/KO-triggered healing. Shields still work.

**Icon:** Green medical cross with red downward arrow

**Identity / exceptions:** Clash only. Consolidates Bruised and Healing Blocked. Faultline applies uncleansable 100% reduction for two affected turns; follows monster through rotation.

## STA-09 Shielded

**Kind:** Beneficial

**Football:** Prevent ONE fumble that would otherwise occur, then entire status ends. Contact alone does not consume; no protection from tackle/interception/stun.

**Beast Clash:** Separate shield pool absorbs incoming damage before HP. Status effects can still apply only if allowed by global single-status rule; no automatic separate immunity exceptions.

**Icon:** Blue shield, dark outline

**Identity / exceptions:** Shared. Same-status extensions never refill pool or fumble saves. Preserve remaining fraction and episode history through mode changes. Stronger replacement follows approved episode rule. Source original payload determines pool size.

## STA-10 Empowered

**Kind:** Beneficial

**Football:** Increase effective Strength; no guaranteed contest win.

**Beast Clash:** Increase outgoing attack damage.

**Icon:** Solid orange fist, dark outline

**Identity / exceptions:** Shared. Overcharge/Forge/Rally attack boosts use shared label where applicable; triggers/targets remain ability-specific.

## STA-11 Quickened

**Kind:** Beneficial

**Football:** Increase effective Speed, improving maximum movement speed AND acceleration.

**Beast Clash:** Increase combat speed/initiative likelihood; no extra action or guaranteed first action.

**Icon:** Green winged boot, dark outline

**Identity / exceptions:** Shared. Existing guaranteed-priority abilities require separate review before conversion; do not silently replace guarantee.

## STA-12 Guarded

**Kind:** Beneficial

**Football:** Not used; clear this status when monster enters football.

**Beast Clash:** Reduce incoming damage by applying ability percentage, without separate shield HP. Ability defines one-hit or turn duration.

**Icon:** Silver breastplate, dark outline

**Identity / exceptions:** Clash only; consolidates temporary Braced-type reductions. Permanent archetype traits remain traits, not extra statuses.

# Appendix C Attribute roles by position

Usage describes football relevance, not permission to train. All 12 attributes remain trainable within individual ceilings. These intended behaviors require the formula and telemetry audit in Section 18; historical implementation-status notes are not proof of implementation.

## OL

| **Attribute** | **Usage** | **Approved effect**                                                                                |
|---------------|-----------|----------------------------------------------------------------------------------------------------|
| Speed         | Active    | Maximum movement speed and acceleration.                                                           |
| Agility       | Active    | Turning, repositioning and positioning to engage; not block holding.                               |
| Strength      | Active    | Push/displacement resistance and overpowering for pancake opportunity.                             |
| Awareness     | Active    | Identify threats, blitzes/stunts, adjust assignments; judge pancake risk and recover from failure. |
| Catching      | Active    | Secure legally catchable passes and loose balls; no blocking benefit.                              |
| Arm           | Not used  | Not used                                                                                           |
| Accuracy      | Not used  | Not used                                                                                           |
| Blocking      | Active    | Maintain block against defender shed attribute.                                                    |
| Tackling      | Active    | Tackle after turnover; finish a winning block into pancake.                                        |
| Coverage      | Active    | Legal coverage assignments only; no blocking benefit.                                              |
| Durability    | Active    | Fatigue and injury resistance.                                                                     |
| Kicking       | Not used  | Not used                                                                                           |

## DL

| **Attribute** | **Usage** | **Approved effect**                                                      |
|---------------|-----------|--------------------------------------------------------------------------|
| Speed         | Active    | Maximum movement speed and acceleration.                                 |
| Agility       | Active    | Turning/repositioning; primary shed attribute versus Blocking.           |
| Strength      | Active    | Drive blockers backward; resist displacement.                            |
| Awareness     | Active    | Read runs/screens/fakes, pursuit/react; directly improve tackle success. |
| Catching      | Active    | Secure interceptions/loose balls; also improve strips.                   |
| Arm           | Not used  | Not used                                                                 |
| Accuracy      | Not used  | Not used                                                                 |
| Blocking      | Active    | Legal turnover-return blocking.                                          |
| Tackling      | Active    | Tackle execution.                                                        |
| Coverage      | Active    | Pass coverage when assigned to drop back only.                           |
| Durability    | Active    | Fatigue and injury resistance.                                           |
| Kicking       | Not used  | Not used                                                                 |

## QB

| **Attribute** | **Usage** | **Approved effect**                                                                 |
|---------------|-----------|-------------------------------------------------------------------------------------|
| Speed         | Active    | Maximum movement speed and acceleration.                                            |
| Agility       | Active    | Turning/cuts/pocket evasion; directly improve tackle breaking.                      |
| Strength      | Active    | Tackle resistance/breaking and fumble resistance.                                   |
| Awareness     | Active    | Coverage/pressure reads, targets/scramble decisions; improve accuracy while moving. |
| Catching      | Active    | Legal receptions, loose balls, snaps and handoffs.                                  |
| Arm           | Active    | Throwing range and velocity.                                                        |
| Accuracy      | Active    | Placement at every distance, with difficulty modifiers.                             |
| Blocking      | Active    | Legal blocking execution.                                                           |
| Tackling      | Active    | Tackle execution after turnover.                                                    |
| Coverage      | Not used  | Not used                                                                            |
| Durability    | Active    | Fatigue and injury resistance.                                                      |
| Kicking       | Not used  | Not used                                                                            |

## RB

| **Attribute** | **Usage** | **Approved effect**                                             |
|---------------|-----------|-----------------------------------------------------------------|
| Speed         | Active    | Maximum movement speed and acceleration.                        |
| Agility       | Active    | Cuts, turns and evading tackles; acceleration belongs to Speed. |
| Strength      | Active    | Tackle breaking, displacement resistance and fumble resistance. |
| Awareness     | Active    | Read blocks/lanes/pursuit and make route decisions.             |
| Catching      | Active    | Receptions/handoffs/pitches/loose balls and fumble resistance.  |
| Arm           | Not used  | Not used                                                        |
| Accuracy      | Not used  | Not used                                                        |
| Blocking      | Active    | Maintain blocks AND identify target defender.                   |
| Tackling      | Active    | Tackle execution after turnover.                                |
| Coverage      | Not used  | Not used                                                        |
| Durability    | Active    | Fatigue and injury resistance.                                  |
| Kicking       | Not used  | Not used                                                        |

## WR

| **Attribute** | **Usage** | **Approved effect**                                                                       |
|---------------|-----------|-------------------------------------------------------------------------------------------|
| Speed         | Active    | Maximum movement speed and acceleration.                                                  |
| Agility       | Active    | Route cuts/turns and tackle evasion after catch.                                          |
| Strength      | Active    | Press/displacement resistance, tackle breaking, fumble resistance AND contested catching. |
| Awareness     | Active    | Read coverage, adjust routes within play, find openings and track pass.                   |
| Catching      | Active    | Secure possession, including contested catches/loose balls; NO fumble-resistance bonus.   |
| Arm           | Not used  | Not used                                                                                  |
| Accuracy      | Not used  | Not used                                                                                  |
| Blocking      | Active    | Maintain blocks AND identify target defender.                                             |
| Tackling      | Active    | Tackle execution after turnover.                                                          |
| Coverage      | Not used  | Not used                                                                                  |
| Durability    | Active    | Fatigue and injury resistance.                                                            |
| Kicking       | Not used  | Not used                                                                                  |

## TE

| **Attribute** | **Usage** | **Approved effect**                                                                 |
|---------------|-----------|-------------------------------------------------------------------------------------|
| Speed         | Active    | Maximum movement speed and acceleration.                                            |
| Agility       | Active    | Cuts/turns/block positioning/tackle evasion AND contested catching.                 |
| Strength      | Active    | Push/displacement/press resistance, tackle breaking and fumble resistance.          |
| Awareness     | Active    | Read coverage, route adjustments, track pass and identify blocking threats.         |
| Catching      | Active    | Secure passes/loose balls, including contested catches; NO fumble-resistance bonus. |
| Arm           | Not used  | Not used                                                                            |
| Accuracy      | Not used  | Not used                                                                            |
| Blocking      | Active    | Maintain engagements AND help identify blocking targets.                            |
| Tackling      | Active    | Tackle execution after turnover.                                                    |
| Coverage      | Not used  | Not used                                                                            |
| Durability    | Active    | Fatigue and injury resistance.                                                      |
| Kicking       | Not used  | Not used                                                                            |

## LB

| **Attribute** | **Usage** | **Approved effect**                                                                                            |
|---------------|-----------|----------------------------------------------------------------------------------------------------------------|
| Speed         | Active    | Maximum movement speed and acceleration.                                                                       |
| Agility       | Active    | Turning, pursuit adjustments and coverage movement; NOT primary shed attribute.                                |
| Strength      | Active    | Push/resist blockers, displacement resistance, return tackle breaking; primary block shedding versus Blocking. |
| Awareness     | Active    | Read plays/fakes, choose angles/react AND directly improve tackle success.                                     |
| Catching      | Active    | Secure interceptions and loose balls; no added strip role.                                                     |
| Arm           | Not used  | Not used                                                                                                       |
| Accuracy      | Not used  | Not used                                                                                                       |
| Blocking      | Active    | Maintain blocks and identify targets on legal turnover returns.                                                |
| Tackling      | Active    | Tackle execution AND strip attempts.                                                                           |
| Coverage      | Active    | Pass assignments, positioning and contest passing windows; no direct interception-catching bonus.              |
| Durability    | Active    | Fatigue and injury resistance.                                                                                 |
| Kicking       | Not used  | Not used                                                                                                       |

## CB

| **Attribute** | **Usage** | **Approved effect**                                                                            |
|---------------|-----------|------------------------------------------------------------------------------------------------|
| Speed         | Active    | Maximum movement speed and acceleration.                                                       |
| Agility       | Active    | Backpedal transitions, turns, mirroring cuts and return evasion; primary shed versus Blocking. |
| Strength      | Active    | Press/contact/displacement resistance; return tackle breaking and fumble resistance.           |
| Awareness     | Active    | Read routes/fakes, react to throws, pursuit angles; NO direct tackle-success bonus.            |
| Catching      | Active    | Secure interceptions and loose balls, including contested catches.                             |
| Arm           | Not used  | Not used                                                                                       |
| Accuracy      | Not used  | Not used                                                                                       |
| Blocking      | Active    | Maintain blocks and identify targets during legal returns.                                     |
| Tackling      | Active    | Tackle execution AND strip attempts.                                                           |
| Coverage      | Active    | Assignments/positioning/separation/windows; no direct interception-catching bonus.             |
| Durability    | Active    | Fatigue and injury resistance.                                                                 |
| Kicking       | Not used  | Not used                                                                                       |

## S

| **Attribute** | **Usage** | **Approved effect**                                                                                |
|---------------|-----------|----------------------------------------------------------------------------------------------------|
| Speed         | Active    | Maximum movement speed and acceleration.                                                           |
| Agility       | Active    | Turns, coverage transitions, pursuit adjustments and return evasion; primary shed versus Blocking. |
| Strength      | Active    | Contact/displacement resistance, return tackle breaking and fumble resistance.                     |
| Awareness     | Active    | Read plays/fakes/react and choose pursuit angles; NO direct tackle-success bonus.                  |
| Catching      | Active    | Secure interceptions and loose balls, including contested catches.                                 |
| Arm           | Not used  | Not used                                                                                           |
| Accuracy      | Not used  | Not used                                                                                           |
| Blocking      | Active    | Maintain blocks and identify targets during legal returns.                                         |
| Tackling      | Active    | Tackle execution AND strip attempts.                                                               |
| Coverage      | Active    | Assignments/positioning/separation/windows; no direct interception-catching bonus.                 |
| Durability    | Active    | Fatigue and injury resistance.                                                                     |
| Kicking       | Not used  | Not used                                                                                           |

## K

| **Attribute** | **Usage** | **Approved effect**                                                                                     |
|---------------|-----------|---------------------------------------------------------------------------------------------------------|
| Speed         | Active    | Maximum movement speed and acceleration during coverage/recovery.                                       |
| Agility       | Active    | Turning/repositioning/contact avoidance; no kick-accuracy bonus.                                        |
| Strength      | Active    | Contact and fumble resistance when carrying; no kick-distance bonus.                                    |
| Awareness     | Active    | Handle pressure, recognize developing block, directional placement decisions; no direct accuracy bonus. |
| Catching      | Active    | Secure snaps, loose balls and legally catchable balls.                                                  |
| Arm           | Not used  | Not used                                                                                                |
| Accuracy      | Not used  | Not used                                                                                                |
| Blocking      | Active    | Legal blocking execution.                                                                               |
| Tackling      | Active    | Tackle execution on returns/turnovers; no strip bonus.                                                  |
| Coverage      | Not used  | Not used                                                                                                |
| Durability    | Active    | Fatigue and injury resistance.                                                                          |
| Kicking       | Active    | Distance, accuracy and execution of FG/PAT/kickoff/punt.                                                |
