
/**
 * WF Pundit — source registry
 *
 * RSS endpoints only. Do not scrape pages that do not publish a feed.
 * Preserve each publisher's name and original article URL.
 * Feed items are discovery leads, not permission to republish source material.
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
  }
];

/**
 * Topics for future regional search-feed adapters.
 * These are topics, not verified RSS endpoints.
 */
export const DISCOVERY_TOPICS = [
  {
    id: "global",
    label: "Women's football worldwide",
    terms: ["women's football", "women's soccer"]
  },
  {
    id: "africa",
    label: "African women's football",
    terms: ["women's football Africa", "CAF women's football", "WAFCON"]
  },
  {
    id: "england",
    label: "England and WSL",
    terms: ["Women's Super League", "WSL", "Women's Championship England"]
  },
  {
    id: "europe",
    label: "European club football",
    terms: ["UEFA Women's Champions League", "women's football Europe", "women's transfer news"]
  },
  {
    id: "north-america",
    label: "North American football",
    terms: ["NWSL", "Liga MX Femenil", "Canada women's soccer"]
  },
  {
    id: "south-america",
    label: "South American football",
    terms: ["Copa Libertadores Femenina", "Brazil women's football", "Argentina women's football"]
  },
  {
    id: "asia",
    label: "Asian women's football",
    terms: ["AFC Women's Champions League", "Japan women's football", "China women's football", "Australia A-League Women"]
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
  "injury",
  "manager",
  "coach",
  "contract",
  "match report",
  "international",
  "national team",
  "qualifier",
  "tournament"
];

export const SOURCE_REGISTRY_VERSION = 1;
