// All countries & leagues for the bot.

export const COUNTRIES = [
  {
    id: 'eng', name: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    leagues: [
      { id: 'epl', name: 'Premier League' },
      { id: 'efl-champ', name: 'EFL Championship' },
      { id: 'fa-cup', name: 'FA Cup' },
      { id: 'efl-cup', name: 'Carabao Cup' },
    ],
  },
  {
    id: 'esp', name: 'Spain', flag: '🇪🇸',
    leagues: [
      { id: 'laliga', name: 'LaLiga' },
      { id: 'laliga2', name: 'LaLiga 2' },
      { id: 'copa', name: 'Copa del Rey' },
    ],
  },
  {
    id: 'ita', name: 'Italy', flag: '🇮🇹',
    leagues: [
      { id: 'seriea', name: 'Serie A' },
      { id: 'serieb', name: 'Serie B' },
      { id: 'coppa', name: 'Coppa Italia' },
    ],
  },
  {
    id: 'ger', name: 'Germany', flag: '🇩🇪',
    leagues: [
      { id: 'bundesliga', name: 'Bundesliga' },
      { id: 'bundesliga2', name: '2. Bundesliga' },
      { id: 'dfb-pokal', name: 'DFB-Pokal' },
    ],
  },
  {
    id: 'fra', name: 'France', flag: '🇫🇷',
    leagues: [
      { id: 'ligue1', name: 'Ligue 1' },
      { id: 'ligue2', name: 'Ligue 2' },
      { id: 'coupe-fra', name: 'Coupe de France' },
    ],
  },
  {
    id: 'por', name: 'Portugal', flag: '🇵🇹',
    leagues: [
      { id: 'liga-pt', name: 'Primeira Liga' },
      { id: 'taca-pt', name: 'Taça de Portugal' },
    ],
  },
  {
    id: 'ned', name: 'Netherlands', flag: '🇳🇱',
    leagues: [{ id: 'eredivisie', name: 'Eredivisie' }],
  },
  {
    id: 'tur', name: 'Türkiye', flag: '🇹🇷',
    leagues: [{ id: 'super-lig', name: 'Süper Lig' }],
  },
  {
    id: 'sco', name: 'Scotland', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
    leagues: [{ id: 'spl', name: 'Scottish Premiership' }],
  },
  {
    id: 'bel', name: 'Belgium', flag: '🇧🇪',
    leagues: [{ id: 'jpl', name: 'Jupiler Pro League' }],
  },
  {
    id: 'gre', name: 'Greece', flag: '🇬🇷',
    leagues: [{ id: 'super-gr', name: 'Super League Greece' }],
  },
  {
    id: 'rus', name: 'Russia', flag: '🇷🇺',
    leagues: [{ id: 'rpl', name: 'Russian Premier League' }],
  },
  {
    id: 'ukr', name: 'Ukraine', flag: '🇺🇦',
    leagues: [{ id: 'upl', name: 'Ukrainian Premier League' }],
  },
  {
    id: 'bra', name: 'Brazil', flag: '🇧🇷',
    leagues: [
      { id: 'brasileirao', name: 'Brasileirão Série A' },
      { id: 'copa-br', name: 'Copa do Brasil' },
    ],
  },
  {
    id: 'arg', name: 'Argentina', flag: '🇦🇷',
    leagues: [{ id: 'lpf', name: 'Liga Profesional' }],
  },
  {
    id: 'usa', name: 'USA', flag: '🇺🇸',
    leagues: [
      { id: 'mls', name: 'MLS' },
      { id: 'us-open', name: 'US Open Cup' },
    ],
  },
  {
    id: 'mex', name: 'Mexico', flag: '🇲🇽',
    leagues: [{ id: 'liga-mx', name: 'Liga MX' }],
  },
  {
    id: 'ksa', name: 'Saudi Arabia', flag: '🇸🇦',
    leagues: [{ id: 'spl-ksa', name: 'Saudi Pro League' }],
  },
  {
    id: 'uae', name: 'UAE', flag: '🇦🇪',
    leagues: [{ id: 'adnoc', name: 'ADNOC Pro League' }],
  },
  {
    id: 'jpn', name: 'Japan', flag: '🇯🇵',
    leagues: [{ id: 'jleague', name: 'J1 League' }],
  },
  {
    id: 'kor', name: 'South Korea', flag: '🇰🇷',
    leagues: [{ id: 'kleague', name: 'K League 1' }],
  },
  {
    id: 'chn', name: 'China', flag: '🇨🇳',
    leagues: [{ id: 'csl', name: 'Chinese Super League' }],
  },
  {
    id: 'aus', name: 'Australia', flag: '🇦🇺',
    leagues: [{ id: 'a-league', name: 'A-League' }],
  },
  {
    id: 'mar', name: 'Morocco', flag: '🇲🇦',
    leagues: [{ id: 'botola', name: 'Botola Pro' }],
  },
  {
    id: 'egy', name: 'Egypt', flag: '🇪🇬',
    leagues: [{ id: 'epl-eg', name: 'Egyptian Premier League' }],
  },
];

export const TOURNAMENTS = [
  { id: 'ucl', name: 'UEFA Champions League', emoji: '🏆' },
  { id: 'uel', name: 'UEFA Europa League', emoji: '🥈' },
  { id: 'uecl', name: 'UEFA Conference League', emoji: '🥉' },
  { id: 'wc', name: 'FIFA World Cup', emoji: '🌍' },
  { id: 'euro', name: 'UEFA Euro', emoji: '🇪🇺' },
  { id: 'copa-am', name: 'Copa América', emoji: '🌎' },
  { id: 'afcon', name: 'Africa Cup of Nations', emoji: '🌍' },
  { id: 'asian-cup', name: 'AFC Asian Cup', emoji: '🌏' },
  { id: 'libertadores', name: 'Copa Libertadores', emoji: '🏆' },
  { id: 'cwc', name: 'FIFA Club World Cup', emoji: '🌐' },
  { id: 'nations', name: 'UEFA Nations League', emoji: '🎖️' },
];

export function findCountry(id) {
  return COUNTRIES.find(c => c.id === id);
}

export function findLeague(id) {
  for (const c of COUNTRIES) {
    const l = c.leagues.find(x => x.id === id);
    if (l) return { country: c, league: l };
  }
  return null;
}

export function findTournament(id) {
  return TOURNAMENTS.find(t => t.id === id);
}
