
/**
 * WF Pundit — source registry
 * RSS feeds only. Preserve publisher attribution and original URLs.
 * Discovery feeds do not grant permission to copy articles.
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

export const DISCOVERY_TOPICS = [
  {
    id: "global",
    label: "Women's football worldwide",
    terms: ["women's football", "women's soccer"]
  },
  {
    id: "africa",
    label: "African women's football",
    terms: ["CAF women's football", "WAFCON", "African women's football"]
  },
  {
    id: "england",
    label: "England and WSL",
    terms: ["Women's Super League", "WSL", "Women's Championship England"]
  },
  {
    id: "europe",
    label: "European club football",
    terms: ["UWCL", "Liga F", "Frauen Bundesliga", "Serie A Women"]
  },
  {
    id: "north-america",
    label: "North American football",
    terms: ["NWSL", "USWNT", "Liga MX Femenil", "Canada women's soccer"]
  },
  {
    id: "south-america",
    label: "South American football",
    terms: ["Copa Libertadores Femenina", "Brazil women's football"]
  },
  {
    id: "asia",
    label: "Asian women's football",
    terms: ["AFC Women's Champions League", "Japan women's football"]
  },
  {
    id: "oceania",
    label: "Australian and New Zealand football",
    terms: ["A-League Women", "Matildas", "Football Ferns"]
  }
];

export const ARTICLE_KEYWORDS = [
  "women's football",
  "women's soccer",
  "Women's Super League",
  "WSL",
  "NWSL",
  "UWCL",
  "UEFA Women's Champions League",
  "WAFCON",
  "AFC Women's Champions League",
  "Liga MX Femenil",
  "Copa Libertadores Femenina",
  "transfer",
  "transfer rumour",
  "transfer rumor",
  "rumoured",
  "rumored",
  "linked with",
  "in talks",
  "loan move",
  "contract extension",
  "injury",
  "manager",
  "coach",
  "match report",
  "national team",
  "qualifier",
  "tournament"
];

export const SOURCE_REGISTRY_VERSION = 2;
