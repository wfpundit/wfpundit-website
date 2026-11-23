/**
 * WF Pundit — source registry
 * Publisher feeds are for discovery only. Preserve source attribution and original URLs.
 * Official club links are canonical club sites linked by the leagues or club organisations.
 */

export const RSS_FEEDS = [
  {
    id: "bbc-womens-football",
    name: "BBC Sport — Women's Football",
    region: "International",
    language: "en",
    url: "https://feeds.bbci.co.uk/sport/football/womens/rss.xml",
    enabled: true
  },
  {
    id: "guardian-womens-football",
    name: "The Guardian — Women's Football",
    region: "International",
    language: "en",
    url: "https://www.theguardian.com/football/womensfootball/rss",
    enabled: true
  },
  {
    id: "equalizer-soccer",
    name: "Equalizer Soccer",
    region: "North America",
    language: "en",
    url: "https://equalizersoccer.com/feed/",
    enabled: true
  },
  {
    id: "shekicks",
    name: "SheKicks Magazine",
    region: "United Kingdom and International",
    language: "en",
    url: "https://shekicks.net/feed/",
    enabled: true
  }
];

// Current club directory snapshot: Barclays WSL / WSL2 and NWSL.
// Recheck league membership and canonical URLs periodically.
export const OFFICIAL_CLUBS = [
  // Barclays Women's Super League
  { id: "arsenal-women", name: "Arsenal Women", league: "Barclays WSL", country: "England", officialWebsite: "https://www.arsenal.com/", leagueDirectory: "https://www.wslfootball.com/clubs/index" },
  { id: "aston-villa-women", name: "Aston Villa Women", league: "Barclays WSL", country: "England", officialWebsite: "https://www.avfc.co.uk/", leagueDirectory: "https://www.wslfootball.com/clubs/index" },
  { id: "birmingham-city-women", name: "Birmingham City Women", league: "Barclays WSL", country: "England", officialWebsite: "https://www.bcfc.com/", leagueDirectory: "https://www.wslfootball.com/clubs/index" },
  { id: "brighton-women", name: "Brighton & Hove Albion Women", league: "Barclays WSL", country: "England", officialWebsite: "https://www.brightonandhovealbion.com/", leagueDirectory: "https://www.wslfootball.com/clubs/index" },
  { id: "charlton-women", name: "Charlton Athletic Women", league: "Barclays WSL", country: "England", officialWebsite: "https://www.charltonafc.com/", leagueDirectory: "https://www.wslfootball.com/clubs/index" },
  { id: "chelsea-women", name: "Chelsea Women", league: "Barclays WSL", country: "England", officialWebsite: "https://www.chelseafc.com/", leagueDirectory: "https://www.wslfootball.com/clubs/index" },
  { id: "crystal-palace-women", name: "Crystal Palace Women", league: "Barclays WSL", country: "England", officialWebsite: "https://www.cpfc.co.uk/", leagueDirectory: "https://www.wslfootball.com/clubs/index" },
  { id: "everton-women", name: "Everton Women", league: "Barclays WSL", country: "England", officialWebsite: "https://www.evertonfc.com/", leagueDirectory: "https://www.wslfootball.com/clubs/index" },
  { id: "liverpool-women", name: "Liverpool FC Women", league: "Barclays WSL", country: "England", officialWebsite: "https://www.liverpoolfc.com/", leagueDirectory: "https://www.wslfootball.com/clubs/index" },
  { id: "london-city-lionesses", name: "London City Lionesses", league: "Barclays WSL", country: "England", officialWebsite: "https://www.londoncitylionesses.com/", leagueDirectory: "https://www.wslfootball.com/clubs/index" },
  { id: "manchester-city-women", name: "Manchester City Women", league: "Barclays WSL", country: "England", officialWebsite: "https://www.mancity.com/", leagueDirectory: "https://www.wslfootball.com/clubs/index" },
  { id: "manchester-united-women", name: "Manchester United Women", league: "Barclays WSL", country: "England", officialWebsite: "https://www.manutd.com/", leagueDirectory: "https://www.wslfootball.com/clubs/index" },
  { id: "tottenham-women", name: "Tottenham Hotspur Women", league: "Barclays WSL", country: "England", officialWebsite: "https://www.tottenhamhotspur.com/", leagueDirectory: "https://www.wslfootball.com/clubs/index" },
  { id: "west-ham-women", name: "West Ham United Women", league: "Barclays WSL", country: "England", officialWebsite: "https://www.whufc.com/", leagueDirectory: "https://www.wslfootball.com/clubs/index" },

  // Barclays Women's Super League 2
  { id: "bristol-city-women", name: "Bristol City Women", league: "Barclays WSL 2", country: "England", officialWebsite: "https://www.bcfc.co.uk/", leagueDirectory: "https://www.wslfootball.com/clubs/index" },
  { id: "burnley-women", name: "Burnley Women", league: "Barclays WSL 2", country: "England", officialWebsite: "https://www.burnleyfootballclub.com/", leagueDirectory: "https://www.wslfootball.com/clubs/index" },
  { id: "durham-women", name: "Durham Women", league: "Barclays WSL 2", country: "England", officialWebsite: "https://www.durhamwfc.co.uk/", leagueDirectory: "https://www.wslfootball.com/clubs/index" },
  { id: "ipswich-town-women", name: "Ipswich Town Women", league: "Barclays WSL 2", country: "England", officialWebsite: "https://www.itfc.co.uk/", leagueDirectory: "https://www.wslfootball.com/clubs/index" },
  { id: "leicester-city-women", name: "Leicester City Women", league: "Barclays WSL 2", country: "England", officialWebsite: "https://www.lcfc.com/", leagueDirectory: "https://www.wslfootball.com/clubs/index" },
  { id: "newcastle-united-women", name: "Newcastle United Women", league: "Barclays WSL 2", country: "England", officialWebsite: "https://www.newcastleunited.com/", leagueDirectory: "https://www.wslfootball.com/clubs/index" },
  { id: "nottingham-forest-women", name: "Nottingham Forest Women", league: "Barclays WSL 2", country: "England", officialWebsite: "https://www.nottinghamforest.co.uk/", leagueDirectory: "https://www.wslfootball.com/clubs/index" },
  { id: "sheffield-united-women", name: "Sheffield United Women", league: "Barclays WSL 2", country: "England", officialWebsite: "https://www.sufc.co.uk/", leagueDirectory: "https://www.wslfootball.com/clubs/index" },
  { id: "southampton-women", name: "Southampton FC Women", league: "Barclays WSL 2", country: "England", officialWebsite: "https://www.southamptonfc.com/", leagueDirectory: "https://www.wslfootball.com/clubs/index" },
  { id: "sunderland-women", name: "Sunderland AFC Women", league: "Barclays WSL 2", country: "England", officialWebsite: "https://www.safc.com/", leagueDirectory: "https://www.wslfootball.com/clubs/index" },
  { id: "watford-women", name: "Watford FC Women", league: "Barclays WSL 2", country: "England", officialWebsite: "https://www.watfordfc.com/", leagueDirectory: "https://www.wslfootball.com/clubs/index" },
  { id: "wolverhampton-women", name: "Wolverhampton Wanderers Women", league: "Barclays WSL 2", country: "England", officialWebsite: "https://www.wolves.co.uk/", leagueDirectory: "https://www.wslfootball.com/clubs/index" },

  // National Women's Soccer League (2026 club directory)
  { id: "angel-city", name: "Angel City FC", league: "NWSL", country: "United States", officialWebsite: "https://www.angelcity.com/", leagueDirectory: "https://www.nwslsoccer.com/teams" },
  { id: "bay-fc", name: "Bay FC", league: "NWSL", country: "United States", officialWebsite: "https://bayfc.com/", leagueDirectory: "https://www.nwslsoccer.com/teams" },
  { id: "boston-legacy", name: "Boston Legacy FC", league: "NWSL", country: "United States", officialWebsite: "https://bostonlegacyfc.com/", leagueDirectory: "https://www.nwslsoccer.com/teams" },
  { id: "chicago-stars", name: "Chicago Stars FC", league: "NWSL", country: "United States", officialWebsite: "https://chicagostars.com/", leagueDirectory: "https://www.nwslsoccer.com/teams" },
  { id: "denver-summit", name: "Denver Summit FC", league: "NWSL", country: "United States", officialWebsite: "https://www.denversummitfc.com/", leagueDirectory: "https://www.nwslsoccer.com/teams" },
  { id: "gotham-fc", name: "Gotham FC", league: "NWSL", country: "United States", officialWebsite: "https://www.gothamfc.com/", leagueDirectory: "https://www.nwslsoccer.com/teams" },
  { id: "houston-dash", name: "Houston Dash", league: "NWSL", country: "United States", officialWebsite: "https://www.houstondynamofc.com/", leagueDirectory: "https://www.nwslsoccer.com/teams" },
  { id: "kansas-city-current", name: "Kansas City Current", league: "NWSL", country: "United States", officialWebsite: "https://www.kansascitycurrent.com/", leagueDirectory: "https://www.nwslsoccer.com/teams" },
  { id: "north-carolina-courage", name: "North Carolina Courage", league: "NWSL", country: "United States", officialWebsite: "https://www.nccourage.com/", leagueDirectory: "https://www.nwslsoccer.com/teams" },
  { id: "orlando-pride", name: "Orlando Pride", league: "NWSL", country: "United States", officialWebsite: "https://www.orlandocitysc.com/", leagueDirectory: "https://www.nwslsoccer.com/teams" },
  { id: "portland-thorns", name: "Portland Thorns FC", league: "NWSL", country: "United States", officialWebsite: "https://www.thorns.com/", leagueDirectory: "https://www.nwslsoccer.com/teams" },
  { id: "racing-louisville", name: "Racing Louisville FC", league: "NWSL", country: "United States", officialWebsite: "https://www.racingloufc.com/", leagueDirectory: "https://www.nwslsoccer.com/teams" },
  { id: "san-diego-wave", name: "San Diego Wave FC", league: "NWSL", country: "United States", officialWebsite: "https://sandiegowavefc.com/", leagueDirectory: "https://www.nwslsoccer.com/teams" },
  { id: "seattle-reign", name: "Seattle Reign FC", league: "NWSL", country: "United States", officialWebsite: "https://www.reignfc.com/", leagueDirectory: "https://www.nwslsoccer.com/teams" },
  { id: "utah-royals", name: "Utah Royals FC", league: "NWSL", country: "United States", officialWebsite: "https://www.rsl.com/", leagueDirectory: "https://www.nwslsoccer.com/teams" },
  { id: "washington-spirit", name: "Washington Spirit", league: "NWSL", country: "United States", officialWebsite: "https://washingtonspirit.com/", leagueDirectory: "https://www.nwslsoccer.com/teams" }
];

// No club RSS/Atom URLs are enabled until each endpoint is confirmed as an official feed.
export const OFFICIAL_CLUB_FEEDS = [];

export const DISCOVERY_TOPICS = [
  { id: "global", label: "Women's football worldwide", terms: ["women's football", "women's soccer"] },
  { id: "africa", label: "African women's football", terms: ["CAF women's football", "WAFCON", "African women's football"] },
  { id: "england", label: "England and WSL", terms: ["Women's Super League", "WSL", "Women's Championship England"] },
  { id: "europe", label: "European club football", terms: ["UWCL", "Liga F", "Frauen Bundesliga", "Serie A Women"] },
  { id: "north-america", label: "North American football", terms: ["NWSL", "USWNT", "Liga MX Femenil", "Canada women's soccer"] },
  { id: "south-america", label: "South American football", terms: ["Copa Libertadores Femenina", "Brazil women's football"] },
  { id: "asia", label: "Asian women's football", terms: ["AFC Women's Champions League", "Japan women's football"] },
  { id: "oceania", label: "Australian and New Zealand football", terms: ["A-League Women", "Matildas", "Football Ferns"] }
];

export const ARTICLE_KEYWORDS = [
  "women's football", "women's soccer", "Women's Super League", "WSL",
  "NWSL", "UWCL", "UEFA Women's Champions League", "WAFCON",
  "AFC Women's Champions League", "Liga MX Femenil", "Copa Libertadores Femenina",
  "transfer", "transfer rumour", "transfer rumor", "rumoured", "rumored",
  "linked with", "in talks", "loan move", "contract extension", "injury",
  "manager", "coach", "match report", "national team", "qualifier", "tournament"
];

export const SOURCE_REGISTRY_VERSION = 3;
