// All user-facing copy lives here. Adding a language = add it to `languages` and add a dictionary.
export const languages = { en: 'EN', sk: 'SK' } as const;
export type Lang = keyof typeof languages;
export const defaultLang: Lang = 'en';

const en = {
  meta: {
    title: 'Ollyverse — Olly lost his bone. Again.',
    description: 'A tiny universe run by one very fluffy black Pomeranian. He lost his bone. Help Olly sniff it out across the Ollyverse.',
  },
  header: { soundOn: '♪ ON', soundOff: '♪ OFF', soundLabel: 'Toggle sound', langLabel: 'Language' },
  hero: {
    kicker: '✦ WELCOME TO THE ✦',
    sub: 'A tiny universe run by <b>one very fluffy, very black Pomeranian</b>.<br />He lost his bone. Again. Somewhere between planets.',
    boop: 'Boop the dog',
    cta: '▶ PRESS START',
    tiny: '(psst — boop Olly first)',
    barks: ['WOOF!', 'BORK!', 'BONE??', 'HI HUMAN', 'AWOOO!', 'SNACK?', '*sniff*'],
  },
  game: {
    title: 'OPERATION: BONE',
    sub: "Every planet is a maze. Every maze has a bone. Every bone is Olly's.",
    hud: { planet: 'PLANET', time: 'TIME', bones: 'BONES', sniff: 'SNIFF', ready: 'READY' },
    introTitle: 'FIND THE BONE',
    introText: 'Guide Olly through the maze.<br />Stuck? <b>Sniff</b> to follow the smell.',
    introButton: "▶ LET'S GO",
    nextButton: '▶ NEXT PLANET',
    firstThought: '…bone?',
    sniffButton: 'SNIFF',
    keys: '<kbd>←↑↓→</kbd> / <kbd>WASD</kbd> move &nbsp; <kbd>SPACE</kbd> sniff &nbsp; <kbd>ENTER</kbd> start',
    sniffing: '*SNIIIFF* …that way!',
    dark: "It's dark here. Good thing I have a nose.",
    welcome: (planet: string) => `Welcome to ${planet}!`,
    found: (planet: string, time: string) => `Bone found on <b>${planet}</b> in <b>${time}s</b>`,
    record: '✦ NEW PLANET RECORD ✦',
    best: (time: string) => `Record: ${time}s`,
    next: (planet: string) => `Next stop: <b>${planet}</b>`,
    darkAhead: '(the lights are off there… use your nose)',
    praise: ['GOOD BOY!', 'BEST BOY!', 'BONE GET!', 'CHOMP!', 'WHAT A NOSE!'],
    planets: [
      'Kibble Nebula', 'Planet Squeaky', 'The Sock Dimension', 'Belly-Rub Belt', 'Mailman Moon',
      'Zoomies Galaxy', 'Puddle Prime', 'Couch Quadrant', 'Vacuum Cleaner Void', 'The Forbidden Cat Sector',
    ],
    thoughts: [
      'Bone. Bone. Bone. Bone.', 'Is that… a squirrel?', "Who's a good boy? Me. It's me.",
      'I smell kibble in dimension 7.', 'This wall tastes like space.', 'Must. Not. Chase. Tail.',
      'The cat did this. I know it.', 'Left? Right? Snack?', 'I could go for a belly rub.', 'Sniffing intensifies…',
      'My fluff is load-bearing.', 'I am not fat. I am floof.', 'Black fur, big dreams.',
    ],
  },
  guide: {
    title: 'FIELD GUIDE TO THE OLLYVERSE',
    sub: 'Required reading for all visiting humans.',
    cards: [
      { icon: '🐕', title: 'POPULATION', text: '1 fluffy black Pomeranian. Several squirrels (unconfirmed).' },
      { icon: '🦴', title: 'CURRENCY', text: 'Bones. Exchange rate: 1 bone = 1 bone. Very stable.' },
      { icon: '🪐', title: 'LAWS OF PHYSICS', text: 'Gravity is optional within 3 meters of a snack.' },
      { icon: '🧹', title: 'THREAT LEVEL', text: "The vacuum cleaner. We don't talk about the vacuum cleaner." },
    ],
  },
  footer: { teaser: 'Something bigger is sniffing its way here.', harmed: 'no bones were harmed' },
};

const sk: typeof en = {
  meta: {
    title: 'Ollyverse — Olly zase stratil kostičku.',
    description: 'Malý vesmír, ktorému vládne jeden veľmi chlpatý čierny pomeranian. Stratil kostičku. Pomôž Ollymu vyňuchať ju naprieč Ollyversom.',
  },
  header: { soundOn: '♪ ZAP', soundOff: '♪ VYP', soundLabel: 'Zapnúť/vypnúť zvuk', langLabel: 'Jazyk' },
  hero: {
    kicker: '✦ VITAJ V ✦',
    sub: 'Malý vesmír, ktorému vládne <b>jeden veľmi chlpatý, veľmi čierny pomeranian</b>.<br />Stratil kostičku. Zase. Niekde medzi planétami.',
    boop: 'Pohladkaj psíka',
    cta: '▶ ŠTART',
    tiny: '(pssst — najprv pohladkaj Ollyho)',
    barks: ['HAF!', 'HAV!', 'KOSTIČKA??', 'AHOJ ČLOVEK', 'AUÚÚÚ!', 'MAŠKRTA?', '*čuch*'],
  },
  game: {
    title: 'OPERÁCIA: KOSTIČKA',
    sub: 'Každá planéta je bludisko. V každom bludisku je kostička. Každá kostička patrí Ollymu.',
    hud: { planet: 'PLANÉTA', time: 'ČAS', bones: 'KOSTI', sniff: 'ŇUCH', ready: 'OK' },
    introTitle: 'NÁJDI KOSTIČKU',
    introText: 'Preveď Ollyho bludiskom.<br />Nevieš kade? <b>Ňuchni</b> a choď po pachu.',
    introButton: '▶ POĎME',
    nextButton: '▶ ĎALŠIA PLANÉTA',
    firstThought: '…kostička?',
    sniffButton: 'ŇUCH',
    keys: '<kbd>←↑↓→</kbd> / <kbd>WASD</kbd> pohyb &nbsp; <kbd>MEDZERNÍK</kbd> ňuch &nbsp; <kbd>ENTER</kbd> štart',
    sniffing: '*ČUUUCH* …tadiaľto!',
    dark: 'Je tu tma. Ešte že mám ňufák.',
    welcome: (planet: string) => `Vitaj na planéte ${planet}!`,
    found: (planet: string, time: string) => `Kostička nájdená na planéte <b>${planet}</b> za <b>${time} s</b>`,
    record: '✦ NOVÝ REKORD PLANÉTY ✦',
    best: (time: string) => `Rekord: ${time} s`,
    next: (planet: string) => `Ďalšia zastávka: <b>${planet}</b>`,
    darkAhead: '(tam je zhasnuté… použi ňufák)',
    praise: ['DOBRÝ PSÍK!', 'NAJLEPŠÍ PSÍK!', 'MÁM JU!', 'HAM!', 'TO JE ŇUFÁK!'],
    planets: [
      'Granulová hmlovina', 'Pískadlo', 'Ponožková dimenzia', 'Pás škrabkania bruška', 'Poštárov mesiac',
      'Galaxia bláznivých kôl', 'Mláka Prima', 'Gaučový kvadrant', 'Prázdnota vysávača', 'Zakázaný mačací sektor',
    ],
    thoughts: [
      'Kostička. Kostička. Kostička.', 'Je to… veverička?', 'Kto je dobrý psík? Ja. Som to ja.',
      'Cítim granule v 7. dimenzii.', 'Táto stena chutí ako vesmír.', 'Nesmiem. Naháňať. Chvost.',
      'To urobila mačka. Viem to.', 'Doľava? Doprava? Maškrta?', 'Dal by som si škrabkanie na brušku.', 'Čuchanie sa stupňuje…',
      'Moja srsť je nosná konštrukcia.', 'Nie som tučný. Som chlpatý.', 'Čierna srsť, veľké sny.',
    ],
  },
  guide: {
    title: 'SPRIEVODCA OLLYVERSOM',
    sub: 'Povinné čítanie pre všetkých ľudských návštevníkov.',
    cards: [
      { icon: '🐕', title: 'POPULÁCIA', text: '1 chlpatý čierny pomeranian. Pár veveričiek (nepotvrdené).' },
      { icon: '🦴', title: 'MENA', text: 'Kostičky. Kurz: 1 kostička = 1 kostička. Veľmi stabilná.' },
      { icon: '🪐', title: 'FYZIKÁLNE ZÁKONY', text: 'Gravitácia je nepovinná do 3 metrov od maškrty.' },
      { icon: '🧹', title: 'ÚROVEŇ HROZBY', text: 'Vysávač. O vysávači sa nerozpráva.' },
    ],
  },
  footer: { teaser: 'Niečo väčšie si sem práve vyňucháva cestu.', harmed: 'žiadnej kostičke sa nič nestalo' },
};

export const ui: Record<Lang, typeof en> = { en, sk };

export const isLang = (value: string | undefined): value is Lang => !!value && value in languages;

/** For .astro components: `useText(Astro.currentLocale)`. */
export const useText = (locale: string | undefined) => ui[isLang(locale) ? locale : defaultLang];

/** For client scripts: the page language comes from <html lang>. */
export const pageText = () => useText(document.documentElement.lang);
