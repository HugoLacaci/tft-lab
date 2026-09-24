import type { ScenarioCategory } from "./scenario-categories";
import type { Difficulty } from "./rank-tiers";

/**
 * The learning path: five modules, each a short list of lessons, each lesson a
 * handful of drills. Lessons build on the ones before them (a lesson unlocks
 * when the previous one is passed, or when the player places themselves at a
 * higher rank), so a brand-new player who walks the whole path ends up with the
 * habits of a Master-tier player: not the meta, the decisions.
 *
 * Scenarios opt into a lesson with `lesson: "<lesson id>"` in their JSON. Pure
 * data: no node:fs, safe to import from client components.
 */
export interface Module {
  id: string;
  /** Order on the path (0 = Welcome). */
  index: number;
  title: string;
  kicker: string;
  blurb: string;
  /** Rank tier the module is written for; also what "place me" unlocks. */
  tier: Difficulty;
  /** Which Little Legend fronts the module (public/assets/legends/<name>.webp). */
  legend: string;
  color: string;
}

export interface Lesson {
  id: string;
  module: string;
  /** Order inside the module. */
  order: number;
  title: string;
  /** One sentence on the card. */
  blurb: string;
  /** What the drills of this lesson mostly train; lessons may mix adjacent categories. */
  category: ScenarioCategory;
  /** Guide section that teaches the concept (also the "Read first" link). */
  guideLink: string;
  /** 2–4 sentences shown before the first drill: the idea in plain words. */
  intro: string;
  /** Three or four things the player should be able to do after the lesson. */
  outcomes: string[];
}

export const MODULES: readonly Module[] = [
  {
    id: "welcome",
    index: 0,
    title: "Welcome to TFT",
    kicker: "Never played before?",
    blurb: "What the game is, how a round works, what the shop, gold, levels, traits and items do, and where your units should stand. Nine short lessons, no vocabulary assumed.",
    tier: 1,
    legend: "pengu-1",
    color: "#7fd3ff",
  },
  {
    id: "fundamentals",
    index: 1,
    title: "Fundamentals",
    kicker: "Iron to Silver",
    blurb: "The six habits that separate a player who climbs from one who does not: interest, level timings, item slams, a sane board layout, HP as a resource and carousel picks.",
    tier: 1,
    legend: "pengu-2",
    color: "#a9b4bf",
  },
  {
    id: "intermediate",
    index: 2,
    title: "Reading the game",
    kicker: "Gold to Platinum",
    blurb: "Two things interact now: an augment and your board, a scout report and a placement, a pair and your interest. Nothing exotic, but you have to look at the whole lobby.",
    tier: 2,
    legend: "pengu-3",
    color: "#e6b95a",
  },
  {
    id: "advanced",
    index: 3,
    title: "Advanced",
    kicker: "Emerald to Diamond",
    blurb: "Counter-positioning against real threats, econ calls with a clock on them, HP thresholds, pivots that cost the least, and scouting that actually changes a decision.",
    tier: 3,
    legend: "choncc-2",
    color: "#4fd1a0",
  },
  {
    id: "mastery",
    index: 4,
    title: "Mastery",
    kicker: "Master and above",
    blurb: "Several threats, one hex. Marginal calls with two acceptable answers and one clearly wrong one. Breaking 50 on purpose, fast 9, capping, and playing for the placement you can actually reach.",
    tier: 4,
    legend: "choncc-wise",
    color: "#c68cff",
  },
] as const;

const L = (module: string, order: number, id: string, title: string, category: ScenarioCategory, guideLink: string, blurb: string, intro: string, outcomes: string[]): Lesson => ({
  id,
  module,
  order,
  title,
  category,
  guideLink,
  blurb,
  intro,
  outcomes,
});

export const LESSONS: readonly Lesson[] = [
  // ── Module 0: Welcome to TFT ────────────────────────────────────────────
  L(
    "welcome",
    1,
    "welcome-the-basics",
    "What is TFT?",
    "endgame",
    "/guides/welcome#what-is-tft",
    "Eight players, one shared pool of champions, one board each. Last player standing wins.",
    "Teamfight Tactics is an auto-battler: you buy champions from a shop, put them on a board, and your board fights another player's board automatically. Lose a fight and you lose health; run out and you are out. Eight players start, and the one left standing wins. Everything else in the game is a way to make your board stronger than the other seven.",
    ["Explain what a round is and how you lose health", "Know that 8 players share one pool of champions", "Know what a placement is (1st to 8th) and why 4th is fine"],
  ),
  L(
    "welcome",
    2,
    "welcome-the-shop",
    "The shop and star-ups",
    "econ",
    "/guides/welcome#the-shop-and-star-ups",
    "Five champions to buy each round. Three copies of one make a stronger 2-star version.",
    "Every round the shop offers five champions. Buying costs the champion's price (1 to 5 gold); refreshing the shop costs 2. Buy the same champion three times and the copies merge into a 2-star version that is much stronger; nine copies make a 3-star. Selling gives the gold back. Most of the game is deciding which of the five to buy and which to ignore.",
    ["Buy a copy of a champion you already own to work toward 2-star", "Know that a refresh costs 2 gold and is not free", "Sell a unit you no longer need to get its gold back"],
  ),
  L(
    "welcome",
    3,
    "welcome-traits",
    "Traits and breakpoints",
    "endgame",
    "/guides/welcome#traits-and-breakpoints",
    "Champions share traits. Field enough of the same trait and the whole team gets a bonus.",
    "Each champion has two or three traits (a class and an origin). When you field a certain number of champions with the same trait, the trait activates and gives a bonus to those units or to your whole team. The numbers where it activates are its breakpoints: 2, 4, 6 for many traits. A board with active traits beats a board of random strong units.",
    ["Read a trait's breakpoints on the side of the board", "Prefer a champion that activates a trait over a random one of the same cost", "Know that a trait at 1 of 2 does nothing yet"],
  ),
  L(
    "welcome",
    4,
    "welcome-items",
    "Items: two components make one item",
    "items",
    "/guides/welcome#items",
    "Components drop from PvE rounds. Combining two makes a completed item, which is much stronger.",
    "Items come as components (a sword, a bow, a vest…). Drag two components onto the same champion and they combine into a completed item, which is worth much more than the two halves. A champion holds up to three items. Damage items go on the unit that deals damage, defensive items on the unit that gets hit first. A component sitting on the bench does nothing.",
    ["Combine two components into a completed item on a champion", "Put damage items on a damage dealer and tank items on a frontliner", "Know that an item on the bench is wasted strength"],
  ),
  L(
    "welcome",
    5,
    "welcome-gold",
    "Gold, income and interest",
    "econ",
    "/guides/welcome#gold-and-interest",
    "You earn gold every round, plus 1 extra for every 10 you hold, up to 5. Saving pays.",
    "You get 5 gold a round from stage 3 on, plus interest: 1 extra gold for every 10 gold you are holding at the end of the round, up to 5 extra at 50 gold. Win or loss streaks pay a bit more. So a player sitting on 50 gold earns 10 a round while a player at 0 earns 5. That difference is why good players do not spend every coin they have.",
    ["Explain why 50 gold earns more than 20 gold", "Know that a streak (wins or losses in a row) pays extra", "Decide whether to spend your last 8 gold or hold to reach the next 10"],
  ),
  L(
    "welcome",
    6,
    "welcome-levels",
    "Levels and XP",
    "level-timing",
    "/guides/welcome#levels-and-xp",
    "Your level is how many champions you can field. Buying XP costs 4 gold and moves you up.",
    "Your level equals the number of champions you can put on the board. You gain 2 XP a round for free and can buy 4 XP for 4 gold. Higher levels also change what the shop offers: expensive, stronger champions appear more often. Leveling is a trade: gold now for a bigger, stronger board and better shops later.",
    ["Know that level = units on the board", "Buy XP when one more unit would win the next fights", "Know that the shop shows better champions at higher levels"],
  ),
  L(
    "welcome",
    7,
    "welcome-the-round",
    "Stages, PvE rounds, carousel and augments",
    "endgame",
    "/guides/welcome#the-flow-of-a-game",
    "A game is stages of rounds. Some rounds are against monsters, some let you pick items or augments.",
    "A game is split into stages (2, 3, 4…) of seven rounds each. Most rounds you fight another player. The last round of each stage is against monsters (PvE) and drops items or gold. Once per stage there is a carousel where you pick a champion carrying an item, and three times per game you choose an augment: a permanent bonus for the rest of the game. Knowing which round is next tells you when to spend and when to save.",
    ["Read the stage clock (3-2 means stage 3, round 2)", "Know that PvE rounds drop items and that carousel is a free pick", "Know that augments come at 2-1, 3-2 and 4-2"],
  ),
  L(
    "welcome",
    8,
    "welcome-the-board",
    "Front and back: your first positioning",
    "positioning",
    "/guides/welcome#the-board",
    "Tanks in the front row, damage in the back row. Enemies hit whatever is closest.",
    "The board has four rows. Enemies walk toward your closest unit and hit it. So the units that can take hits (tanks) stand in the front row, and the units that deal damage from range stand in the back row where nothing reaches them for a while. Getting this one thing right wins fights against players who ignore it.",
    ["Place a tank in the front row and a ranged carry in the back row", "Keep the frontline together so enemies bump into it", "Move a unit after seeing what beat you"],
  ),
  L(
    "welcome",
    9,
    "welcome-first-game-plan",
    "Your first game plan",
    "hp-management",
    "/guides/welcome#your-first-game-plan",
    "A simple plan that gets a new player to top 4: strongest board early, save to 50, level on schedule, slam items.",
    "You do not need to know the meta to place well. The plan: buy upgrades and field your strongest board every round so you do not bleed health; save toward 50 gold once you are stable; buy levels at the standard rounds; combine your items early on the units you actually have. Pick one direction by the middle of the game and commit. That plan alone beats most players in low ranks.",
    ["Follow the standard plan from stage 2 to stage 4", "Know when to stop saving and start spending", "Know what to do at 4-1 (level 7, then roll for upgrades)"],
  ),

  // ── Module 1: Fundamentals (Iron–Silver) ────────────────────────────────
  L(
    "fundamentals",
    1,
    "econ-interest-basics",
    "Interest and the 50-gold floor",
    "econ",
    "/guides/economy#interest-and-the-50-gold-floor",
    "Reach 50 fast, stay on it, and know the few rounds where dipping under is right.",
    "Gold is the only resource that grows on its own. Each 10 you hold earns 1 more a round, capped at 5 extra at 50. Reaching 50 early and staying on it is the default plan for stages 2 and 3; every roll before that is paid for twice, once in gold and once in interest. This lesson drills the default: hold, buy the cheap upgrade, do not roll at 2-1.",
    ["Sit at 50 without spending down on small upgrades", "Recognise a buy that keeps the interest breakpoint", "Refuse to roll at 2-1 and 3-1 without a reason"],
  ),
  L(
    "fundamentals",
    2,
    "level-standard-timings",
    "Standard level timings",
    "level-timing",
    "/guides/leveling#standard-level-timings",
    "Level 4 at 2-1, 5 at 2-5, 6 at 3-2, 7 at 4-1, 8 at 4-5 or 5-1. Deviate only with a reason.",
    "There is a standard schedule for levels, and it exists because the lobby follows it: being a level behind means one fewer unit in every fight. Level 4 at 2-1, 5 at 2-5, 6 at 3-2, 7 at 4-1, 8 around 4-5 or 5-1. The default is to hit those rounds; this lesson trains recognising them and not levelling and rolling in the same round.",
    ["Name the standard level for any stage", "Level at 3-2 to 6 and 4-1 to 7 without hesitation", "Avoid rolling and levelling in the same round"],
  ),
  L(
    "fundamentals",
    3,
    "items-slam-early",
    "Slam your items",
    "items",
    "/guides/items#slam-or-hold",
    "Two completed items by 3-2, on the units you have. Components on the bench lose fights.",
    "A completed item on the board is worth more than two perfect components on the bench. By 3-2 you want two completed items in play; the units holding them do not have to be your final carries because tank items move and most damage items move. This lesson drills the slam decision at 2-1, 2-5 and 3-2.",
    ["Slam a defensive item on the front unit you have by 2-5", "Slam a damage item on the ranged unit you have by 3-2", "Hold a component only when the item it makes is the one you need next round"],
  ),
  L(
    "fundamentals",
    4,
    "positioning-front-and-back",
    "Front and back",
    "positioning",
    "/guides/positioning#frontline-and-backline-defaults",
    "Tanks centre-front, bruisers on the flanks, carries in the back row. The default layout.",
    "The default layout answers three questions: who gets hit first, who gets to attack, how far the enemy walks. Tanks in the centre of row 0, bruisers beside them, ranged carries in the back row with a bodyguard in front of the corner. This lesson makes that layout automatic, so later lessons can teach when to break it.",
    ["Place a new tank next to the existing frontline", "Put a ranged carry in the back row away from the tank's column", "Never leave one flank of the front row empty"],
  ),
  L(
    "fundamentals",
    5,
    "hp-strongest-board",
    "HP is a resource: play the strongest board",
    "hp-management",
    "/guides/hp#hp-is-a-resource",
    "Every round you lose costs HP you cannot buy back. Field upgrades as they come.",
    "HP does not regenerate. Early-game losses are cheap in HP but they add up, and an 8th at 3-5 costs more LP than any econ line can win back. The habit: field the strongest board every round (2-star units go on the board, not the bench), and treat the win streak as a real income when you have it.",
    ["Move a 2-star from the bench onto the board instead of a 1-star", "Recognise a board that should push for a win streak", "Know when an early loss streak is affordable and when it is not"],
  ),
  L(
    "fundamentals",
    6,
    "carousel-basics",
    "Carousel picks",
    "carousel",
    "/guides/items#carousel-priority",
    "Take the component you can slam, not the fourth copy of something you cannot use.",
    "The carousel is a free item and a free unit. The item matters more: at the first carousel the flexible components (sword, bow, tear, vest) are almost always right; later, take the component that completes an item on your board. The unit only wins the pick when it is a copy of your carry.",
    ["Take a flexible component at the first carousel", "Take the component that completes a slam over a random 'good' one", "Take a carry copy when it makes a 2-star"],
  ),

  // ── Module 2: Reading the game (Gold–Platinum) ──────────────────────────
  L(
    "intermediate",
    1,
    "augments-reading",
    "Reading augments",
    "augment",
    "/guides/augments#the-evaluation-framework",
    "Evaluate an augment against what you can actually build, your econ and your HP.",
    "An augment is only as good as the board that uses it. The framework: does it give strength now or later, does it need units you can realistically get, and what does your HP allow. Econ augments below 50 HP are traps; trait augments for a line you cannot reach are traps. This lesson drills the framework on silver, gold and prismatic picks.",
    ["Take the econ augment only with the HP to cash it", "Take a trait augment when you already have the units", "Recognise a strong-now augment when you are bleeding"],
  ),
  L(
    "intermediate",
    2,
    "scouting-routine",
    "The scouting routine",
    "scouting",
    "/guides/scouting#the-scout-routine",
    "What to look at, in what order, at 2-1, 3-2 and after every rolldown.",
    "Scouting takes ten seconds and moves a coin-flip fight to 60/40. The routine: who is on your line (contest), who is strong (the streakers), what threats the next opponents carry (assassins, AoE, hooks). Do it at 2-1, at 3-2, after every rolldown, and every round from 4-1. This lesson drills the routine as an order and as a set of things to look for.",
    ["Run the scout order without missing a step", "Spot contest at 2-1 from opening boards and items", "Identify the threat that decides your next placement"],
  ),
  L(
    "intermediate",
    3,
    "econ-pairs-and-rolls",
    "Pairs, small rolls and the real cost of a roll",
    "econ",
    "/guides/economy#the-real-cost-of-a-roll",
    "When a pair is worth dipping below 50, and when 'rolling a little' is a leak.",
    "A roll costs 2 gold plus the interest it forgoes. Sometimes it is right: a pair of your carry on the bench at a stage where the 2-star wins fights. Usually it is not: 'rolling a little each round' at 3-1 is how players arrive at their rolldown ten gold short. This lesson drills the difference.",
    ["Roll below 50 for a pair that stabilises a losing board", "Refuse the 'one more roll' at a stable board", "Count what a roll really costs in interest"],
  ),
  L(
    "intermediate",
    4,
    "items-holders",
    "Who holds the item",
    "items",
    "/guides/items#who-gets-the-tank-item",
    "The tank item goes on the unit that is hit first; the damage item on the unit that will still be carrying at 4-5.",
    "Item holders are a positioning decision. The tank item goes on the unit that stands where the fight happens, not on the highest-cost unit. The damage item goes on the unit you will still be using at 4-5, or on a temporary holder when the carry is not here yet. This lesson is all item-holder questions on real boards.",
    ["Give the tank item to the centre-front unit", "Give the AD item to the future carry or a holder that transfers", "Recognise when an emblem redirects the whole game"],
  ),
  L(
    "intermediate",
    5,
    "positioning-spread-clump",
    "Spread vs clump",
    "positioning",
    "/guides/positioning#spread-vs-clump",
    "Clump against single-target and hooks; spread the backline against area damage. Per opponent, every round.",
    "Clumping is the default because auras and shields reach neighbours. Spreading is the counter to area damage, and the whole decision is which threat is bigger this round. One empty hex between two carries means one splash hits one of them. This lesson drills spreading and clumping against real abilities of the live set.",
    ["Spread two carries against an AoE caster", "Clump the backline around a bodyguard against assassins", "Change layout between two consecutive opponents"],
  ),
  L(
    "intermediate",
    6,
    "pivot-reading-contest",
    "Reading contest and flex openers",
    "pivot",
    "/guides/pivoting#reading-contest",
    "Two or more players on your line at 2-1 means pivot unless you are far ahead.",
    "A line contested by three players splits the pool three ways and the odds of hitting collapse for all of them. The read is available at 2-1 (opening boards, items) and 3-2 (first slams). Flex openers keep two lines open until the read is clear. This lesson drills recognising contest and choosing the opener that keeps options.",
    ["Count the players on your line at 2-1 and 3-2", "Keep a two-pair opener flexible until 3-2", "Pivot first when the contest is clear"],
  ),
  L(
    "intermediate",
    7,
    "level-rolldowns",
    "Rolldowns at 7 and 8",
    "level-timing",
    "/guides/rolling#rolldown-discipline",
    "Level first, then roll, with a stop condition decided before the first roll.",
    "A rolldown is a plan, not a reflex: level to the right number, decide what you are looking for and what 'enough' means, roll, and stop when you hit or when you reach the gold you promised to keep. Levelling and rolling in the same round is the most common way to waste a rolldown. This lesson drills the order and the stop conditions.",
    ["Put the rolldown steps in the right order", "Decide the stop condition before rolling", "Choose level 8 at 4-5 or a roll at 7 with a reason"],
  ),

  // ── Module 3: Advanced (Emerald–Diamond) ────────────────────────────────
  L(
    "advanced",
    1,
    "positioning-counter",
    "Counter-positioning",
    "positioning",
    "/guides/positioning#counter-positioning",
    "Move because of what a specific opponent has: divers, hooks, a line ability, a range-6 sniper.",
    "Counter-positioning is the concrete output of scouting. Assassins land on the far corners, so the carry moves to the centre and a bruiser takes the corner. A hook pulls the closest unit, so the bait is a cheap body. A line ability wants a column, so you take the column away. This lesson uses the real abilities of the live set.",
    ["Move the carry off the corner against divers", "Place a bait for a hook or a leap", "Use a carry's range to outrange a threat"],
  ),
  L(
    "advanced",
    2,
    "econ-loss-streaks",
    "Loss-streaking on purpose",
    "econ",
    "/guides/economy#loss-streaking-on-purpose",
    "When to take the loss streak, how long, and the exact condition that ends it.",
    "A deliberate loss streak is an income line: streak gold plus interest while the board is weak anyway. It is only correct with an exit: the round where you level, roll and stabilise, chosen before the streak starts and tied to HP. This lesson drills entering, keeping and, above all, leaving the streak.",
    ["Take a loss streak at 2-1 with a weak board and an exit round", "Keep the streak when a small board would not win anyway", "Exit before HP goes below the stabilise threshold"],
  ),
  L(
    "advanced",
    3,
    "hp-thresholds",
    "HP thresholds: stabilise or push",
    "hp-management",
    "/guides/hp#thresholds",
    "Count the losses you can afford, then decide whether to greed one more round.",
    "HP decisions are a count: how many losses until you are out, how many rounds until your board turns on. Above the threshold you can greed; below it you stabilise now even if it costs interest. Relative HP matters too: at 5-1 with 30 HP in a lobby where everyone has 30, you are fine; at 30 with everyone else at 60, you are not.",
    ["Count the losses left at 4-1 and choose accordingly", "Refuse to greed at 25 HP in stage 4", "Read relative HP at 5-1"],
  ),
  L(
    "advanced",
    4,
    "pivot-execution",
    "Executing a pivot",
    "pivot",
    "/guides/pivoting#when-to-abandon-a-line",
    "Pivot in the right order, to the line your items already support, before the lobby closes it.",
    "A pivot is expensive; a late pivot is fatal. The order: new line chosen from your items and the uncontested pool, keep the units that transfer, sell the rest last, roll once with a target. This lesson drills the sequence and the decision after a failed rolldown at 4-2.",
    ["Pick the pivot target from your items, not from the tier list", "Sequence a pivot so the board never collapses", "Decide between committing and pivoting after a failed rolldown"],
  ),
  L(
    "advanced",
    5,
    "augments-vs-board",
    "Augments against your board",
    "augment",
    "/guides/augments#why-the-highest-winrate-augment-is-wrong-for-you",
    "The stats-site number is an average over players who could use it. You are not the average.",
    "The highest-winrate augment on a stats site is the best pick for the boards that took it, not for yours. A trait crest is worthless without the units, a combat augment is worth less on a board that loses anyway, and a prismatic econ pick at 2-1 needs an HP plan. This lesson drills reading the augment against the board in front of you.",
    ["Reject a top-rated augment that does not fit the board", "Take the trait crest when you already have the units and the items", "Choose between a prismatic econ augment and a strength augment at 2-1"],
  ),
  L(
    "advanced",
    6,
    "scouting-changes-decisions",
    "Scouting must change a decision",
    "scouting",
    "/guides/scouting#scouting-must-change-a-decision",
    "A scout report that changes nothing was not scouting. Which observation matters, and what it changes.",
    "Scouting has an output: a placement, a pivot, a level, a hold. This lesson gives you scout reports and asks which observation changes your next move, and to what. Counting the copies of your carry in other boards, spotting the top-4 lock, reading who is about to roll.",
    ["Pick the observation that changes a decision out of four", "Count the copies of your carry across the lobby", "Turn 'top 4 locked' into a plan for 1st"],
  ),

  // ── Module 4: Mastery (Master+) ─────────────────────────────────────────
  L(
    "mastery",
    1,
    "positioning-multiple-threats",
    "Several threats, one hex",
    "positioning",
    "/guides/positioning#counter-positioning",
    "Two opponents left, both dangerous in different ways. Find the hex that answers both.",
    "At the top the lobby is three or four boards you know by heart, and each wants a different layout from you. The skill is the compromise: the hex that is safe from the diver and still out of the splash, the bait that works against two boards, the last-second swap when the opponent is revealed. Puzzles here have one best move and one clearly wrong one.",
    ["Find a placement that answers two threats at once", "Use a bait against a leap and a hook simultaneously", "Make the last-second mirror swap correctly"],
  ),
  L(
    "mastery",
    2,
    "endgame-placement",
    "Play for the placement you can reach",
    "endgame",
    "/guides/stage-plan#stage-5-and-beyond",
    "A 6th-place board playing for 1st finishes 8th. Know which placement is on the table.",
    "Endgame is a placement problem, not a strength problem. Two players left at 20 HP, a board that caps at 3rd, a 5-1 rolldown with one shot: each has a right answer that depends on what is actually reachable. This lesson drills reading the lobby's HP and boards and choosing the line that maximises expected placement.",
    ["Choose between playing for 2nd and gambling for 1st", "Sequence the 5-1 rolldown", "Recognise when a 4th-place board should stop rolling"],
  ),
  L(
    "mastery",
    3,
    "econ-breaking-50",
    "Breaking 50 on purpose",
    "econ",
    "/guides/economy#three-legitimate-reasons-to-break-50",
    "The floor protects players who are behind; it caps players who are ahead.",
    "There are three legitimate reasons to go under 50: a pair that wins the fights you are currently losing, an HP situation that forces a stabilise, and a board that wins now, where extending the streak is worth more than the interest. Everything else is a leak. This lesson drills recognising the three and refusing the rest.",
    ["Break 50 to extend a win streak with the strongest board", "Break 50 for a carry pair when it changes fights", "Refuse to break 50 for a marginal upgrade"],
  ),
  L(
    "mastery",
    4,
    "level-fast-9-and-capping",
    "Fast 9 and capping the board",
    "level-timing",
    "/guides/leveling#fast-8-fast-9-reroll",
    "When 9 is right, when rolling at 8 is right, and how to spend gold once top 4 is safe.",
    "Fast 9 is a line, not a flex. It needs HP, econ and a board that survives stage 4 without 2-star 4-costs. Once the top 4 is locked, gold turns into placement by 2-starring the carries you already have before adding 5-costs. This lesson drills the 9-or-roll decision and the capping order.",
    ["Choose fast 9 or roll at 8 from HP, gold and board", "Cap the board in the right order once safe", "Know when level 10 is worth it"],
  ),
  L(
    "mastery",
    5,
    "endgame-last-rolldown",
    "Contest math and the last rolldown",
    "scouting",
    "/guides/rolling#contest-math",
    "Count the pool before you roll. The copies in other boards are not in your shop.",
    "At 5-1 every gold has to buy strength, and the pool decides what it buys. Copies on other boards, on other benches and in the units already sold shape your odds; a contested 4-cost at 8 can be a 5% shot. This lesson drills counting the pool and choosing the rolldown target accordingly.",
    ["Count the copies of a 4-cost left in the pool", "Switch the rolldown target when the pool is empty", "Decide when one more roll is worth it at 5-1"],
  ),
] as const;

export const LESSON_IDS = LESSONS.map((l) => l.id);

export function moduleById(id: string): Module | undefined {
  return MODULES.find((m) => m.id === id);
}

export function lessonById(id: string): Lesson | undefined {
  return LESSONS.find((l) => l.id === id);
}

export function lessonsOf(moduleId: string): Lesson[] {
  return LESSONS.filter((l) => l.module === moduleId).sort((a, b) => a.order - b.order);
}

/** Lessons in path order (module index, then lesson order). */
export function orderedLessons(): Lesson[] {
  const mi = new Map(MODULES.map((m) => [m.id, m.index]));
  return [...LESSONS].sort((a, b) => (mi.get(a.module)! - mi.get(b.module)!) || a.order - b.order);
}

export function previousLesson(id: string): Lesson | null {
  const all = orderedLessons();
  const i = all.findIndex((l) => l.id === id);
  return i > 0 ? all[i - 1]! : null;
}

export function nextLessonAfter(id: string): Lesson | null {
  const all = orderedLessons();
  const i = all.findIndex((l) => l.id === id);
  return i >= 0 && i < all.length - 1 ? all[i + 1]! : null;
}

/** A lesson passes when this share of its drills has been answered correctly at least once. */
export const PASS_RATIO = 0.7;

export type LessonState = "locked" | "new" | "started" | "passed" | "complete";

export interface LessonProgress {
  state: LessonState;
  /** drills answered correctly at least once */
  solved: number;
  /** drills attempted at least once */
  tried: number;
  total: number;
}

/**
 * Where the player stands on a lesson given the ids of its scenarios and the
 * per-scenario `seen` counters from the trainer progress.
 */
export function lessonProgress(ids: string[], seen: Record<string, { attempts: number; correct: number }>, unlocked: boolean): LessonProgress {
  const total = ids.length;
  const solved = ids.filter((id) => (seen[id]?.correct ?? 0) > 0).length;
  const tried = ids.filter((id) => (seen[id]?.attempts ?? 0) > 0).length;
  const passed = total > 0 && solved >= Math.ceil(total * PASS_RATIO);
  const state: LessonState = !unlocked ? "locked" : total > 0 && solved === total ? "complete" : passed ? "passed" : tried > 0 ? "started" : "new";
  return { state, solved, tried, total };
}

/**
 * Unlock rule: the first lesson of the path is always open; any lesson in a
 * module at or below the player's self-declared placement is open; otherwise a
 * lesson opens when the previous one on the path is passed. `placed` is a
 * module index (0 = Welcome only, 1 = Fundamentals too, …); undefined means
 * "not asked yet" and behaves like 1 so nobody hits a wall on their first visit.
 */
export function isUnlocked(lessonId: string, opts: { placed: number | undefined; passed: (lessonId: string) => boolean }): boolean {
  const lesson = lessonById(lessonId);
  if (!lesson) return false;
  const mod = moduleById(lesson.module)!;
  const placed = opts.placed ?? 1;
  if (mod.index <= placed) return true;
  const prev = previousLesson(lessonId);
  if (!prev) return true;
  return opts.passed(prev.id);
}

/** Module index a rank tier unlocks when the player places themselves ("I'm Gold" → 2). */
export function placementForTier(tier: Difficulty): number {
  return tier;
}
