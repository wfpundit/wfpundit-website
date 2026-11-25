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
    womenOnly: true,
    enabled: true
  },
  {
    id: "guardian-womens-football",
    name: "The Guardian — Women's Football",
    region: "International",
    language: "en",
    url: "https://www.theguardian.com/football/womensfootball/rss",
    womenOnly: true,
    enabled: true
  },
  {
    id: "equalizer-soccer",
    name: "Equalizer Soccer",
    region: "North America",
    language: "en",
    url: "https://equalizersoccer.com/feed/",
    womenOnly: true,
    enabled: true
  },
  {
    id: "shekicks",
    name: "SheKicks Magazine",
    region: "United Kingdom and International",
    language: "en",
    url: "https://shekicks.net/feed/",
    womenOnly: true,
    enabled: true
  },
  {
    id: "wsl-full-time",
    name: "WSL Full-Time",
    region: "United Kingdom",
    language: "en",
    url: "https://fawslfulltime.co.uk/feed/",
    womenOnly: true,
    enabled: true
  },
  {
    id: "her-football-hub",
    name: "Her Football Hub",
    region: "International",
    language: "en",
    url: "https://herfootballhub.com/feed/",
    womenOnly: true,
    enabled: true
  },
  {
    id: "sky-sports-football",
    name: "Sky Sports — Football",
    region: "United Kingdom",
    language: "en",
    url: "https://www.skysports.com/rss/11095",
    womenOnly: false,
    enabled: true
  }
];

// Current club directory snapshot: WSL / WSL2, NWSL, Serie A Women, Liga F and Frauen-Bundesliga.
// League membership is sourced from the official competition/federation directories and should be refreshed each season.
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
  { id: "washington-spirit", name: "Washington Spirit", league: "NWSL", country: "United States", officialWebsite: "https://washingtonspirit.com/", leagueDirectory: "https://www.nwslsoccer.com/teams" },

  // Serie A Women (Italy, 2026-27 official FIGC club list)
  { id: "como-1907-women", name: "Como 1907", league: "Serie A Women", country: "Italy", leagueDirectory: "https://www.figc.it/it/serie-a-women/club/club-serie-a" },
  { id: "como-women", name: "Como Women", league: "Serie A Women", country: "Italy", leagueDirectory: "https://www.figc.it/it/serie-a-women/club/club-serie-a" },
  { id: "fiorentina-women", name: "Fiorentina", league: "Serie A Women", country: "Italy", leagueDirectory: "https://www.figc.it/it/serie-a-women/club/club-serie-a" },
  { id: "inter-women", name: "Inter", league: "Serie A Women", country: "Italy", leagueDirectory: "https://www.figc.it/it/serie-a-women/club/club-serie-a" },
  { id: "juventus-women", name: "Juventus", league: "Serie A Women", country: "Italy", leagueDirectory: "https://www.figc.it/it/serie-a-women/club/club-serie-a" },
  { id: "lazio-women", name: "Lazio", league: "Serie A Women", country: "Italy", leagueDirectory: "https://www.figc.it/it/serie-a-women/club/club-serie-a" },
  { id: "milan-women", name: "Milan", league: "Serie A Women", country: "Italy", leagueDirectory: "https://www.figc.it/it/serie-a-women/club/club-serie-a" },
  { id: "napoli-women", name: "Napoli Women", league: "Serie A Women", country: "Italy", leagueDirectory: "https://www.figc.it/it/serie-a-women/club/club-serie-a" },
  { id: "parma-women", name: "Parma", league: "Serie A Women", country: "Italy", leagueDirectory: "https://www.figc.it/it/serie-a-women/club/club-serie-a" },
  { id: "roma-women", name: "Roma", league: "Serie A Women", country: "Italy", leagueDirectory: "https://www.figc.it/it/serie-a-women/club/club-serie-a" },
  { id: "sassuolo-women", name: "Sassuolo", league: "Serie A Women", country: "Italy", leagueDirectory: "https://www.figc.it/it/serie-a-women/club/club-serie-a" },
  { id: "ternana-women", name: "Ternana Women", league: "Serie A Women", country: "Italy", leagueDirectory: "https://www.figc.it/it/serie-a-women/club/club-serie-a" },

  // Liga F (Spain, 2026-27 official LALIGA club list)
  { id: "athletic-club-women", name: "Athletic Club", league: "Liga F", country: "Spain", leagueDirectory: "https://www.laliga.com/futbol-femenino/clubes" },
  { id: "atletico-madrid-women", name: "Atlético de Madrid", league: "Liga F", country: "Spain", leagueDirectory: "https://www.laliga.com/futbol-femenino/clubes" },
  { id: "costa-adeje-tenerife", name: "Costa Adeje Tenerife", league: "Liga F", country: "Spain", leagueDirectory: "https://www.laliga.com/futbol-femenino/clubes" },
  { id: "deportivo-abanca", name: "Deportivo Abanca", league: "Liga F", country: "Spain", leagueDirectory: "https://www.laliga.com/futbol-femenino/clubes" },
  { id: "deportivo-alaves-women", name: "Deportivo Alavés", league: "Liga F", country: "Spain", leagueDirectory: "https://www.laliga.com/futbol-femenino/clubes" },
  { id: "logrono-united", name: "Logroño United", league: "Liga F", country: "Spain", leagueDirectory: "https://www.laliga.com/futbol-femenino/clubes" },
  { id: "fc-badalona-women", name: "FC Badalona Women", league: "Liga F", country: "Spain", leagueDirectory: "https://www.laliga.com/futbol-femenino/clubes" },
  { id: "barcelona-femeni", name: "FC Barcelona", league: "Liga F", country: "Spain", leagueDirectory: "https://www.laliga.com/futbol-femenino/clubes" },
  { id: "granada-cf-women", name: "Granada CF Fundación 1931", league: "Liga F", country: "Spain", leagueDirectory: "https://www.laliga.com/futbol-femenino/clubes" },
  { id: "madrid-cff", name: "Madrid CFF", league: "Liga F", country: "Spain", leagueDirectory: "https://www.laliga.com/futbol-femenino/clubes" },
  { id: "espanyol-women", name: "RCD Espanyol de Barcelona", league: "Liga F", country: "Spain", leagueDirectory: "https://www.laliga.com/futbol-femenino/clubes" },
  { id: "real-madrid-femeni", name: "Real Madrid CF", league: "Liga F", country: "Spain", leagueDirectory: "https://www.laliga.com/futbol-femenino/clubes" },
  { id: "real-sociedad-women", name: "Real Sociedad", league: "Liga F", country: "Spain", leagueDirectory: "https://www.laliga.com/futbol-femenino/clubes" },
  { id: "sd-eibar-women", name: "SD Eibar", league: "Liga F", country: "Spain", leagueDirectory: "https://www.laliga.com/futbol-femenino/clubes" },
  { id: "sevilla-fc-women", name: "Sevilla FC", league: "Liga F", country: "Spain", leagueDirectory: "https://www.laliga.com/futbol-femenino/clubes" },
  { id: "valencia-cf-femenino", name: "VCF Femenino", league: "Liga F", country: "Spain", leagueDirectory: "https://www.laliga.com/futbol-femenino/clubes" },

  // Google Pixel Frauen-Bundesliga (Germany, 2026-27 official DFB club list)
  { id: "union-berlin-women", name: "1. FC Union Berlin", league: "Google Pixel Frauen-Bundesliga", country: "Germany", leagueDirectory: "https://www.dfb.de/news/teilnehmerfeld-der-google-pixel-frauen-bundesliga-steht-fest-alle-sportlich-qualifizierten-klubs-erhalten-zulassung" },
  { id: "werder-bremen-women", name: "SV Werder Bremen", league: "Google Pixel Frauen-Bundesliga", country: "Germany", leagueDirectory: "https://www.dfb.de/news/teilnehmerfeld-der-google-pixel-frauen-bundesliga-steht-fest-alle-sportlich-qualifizierten-klubs-erhalten-zulassung" },
  { id: "eintracht-frankfurt-women", name: "Eintracht Frankfurt", league: "Google Pixel Frauen-Bundesliga", country: "Germany", leagueDirectory: "https://www.dfb.de/news/teilnehmerfeld-der-google-pixel-frauen-bundesliga-steht-fest-alle-sportlich-qualifizierten-klubs-erhalten-zulassung" },
  { id: "sc-freiburg-women", name: "SC Freiburg", league: "Google Pixel Frauen-Bundesliga", country: "Germany", leagueDirectory: "https://www.dfb.de/news/teilnehmerfeld-der-google-pixel-frauen-bundesliga-steht-fest-alle-sportlich-qualifizierten-klubs-erhalten-zulassung" },
  { id: "hamburger-sv-women", name: "Hamburger SV", league: "Google Pixel Frauen-Bundesliga", country: "Germany", leagueDirectory: "https://www.dfb.de/news/teilnehmerfeld-der-google-pixel-frauen-bundesliga-steht-fest-alle-sportlich-qualifizierten-klubs-erhalten-zulassung" },
  { id: "hoffenheim-women", name: "TSG 1899 Hoffenheim", league: "Google Pixel Frauen-Bundesliga", country: "Germany", leagueDirectory: "https://www.dfb.de/news/teilnehmerfeld-der-google-pixel-frauen-bundesliga-steht-fest-alle-sportlich-qualifizierten-klubs-erhalten-zulassung" },
  { id: "fc-koln-women", name: "1. FC Köln", league: "Google Pixel Frauen-Bundesliga", country: "Germany", leagueDirectory: "https://www.dfb.de/news/teilnehmerfeld-der-google-pixel-frauen-bundesliga-steht-fest-alle-sportlich-qualifizierten-klubs-erhalten-zulassung" },
  { id: "rb-leipzig-women", name: "RB Leipzig", league: "Google Pixel Frauen-Bundesliga", country: "Germany", leagueDirectory: "https://www.dfb.de/news/teilnehmerfeld-der-google-pixel-frauen-bundesliga-steht-fest-alle-sportlich-qualifizierten-klubs-erhalten-zulassung" },
  { id: "bayer-leverkusen-women", name: "Bayer 04 Leverkusen", league: "Google Pixel Frauen-Bundesliga", country: "Germany", leagueDirectory: "https://www.dfb.de/news/teilnehmerfeld-der-google-pixel-frauen-bundesliga-steht-fest-alle-sportlich-qualifizierten-klubs-erhalten-zulassung" },
  { id: "mainz-05-women", name: "1. FSV Mainz 05", league: "Google Pixel Frauen-Bundesliga", country: "Germany", leagueDirectory: "https://www.dfb.de/news/teilnehmerfeld-der-google-pixel-frauen-bundesliga-steht-fest-alle-sportlich-qualifizierten-klubs-erhalten-zulassung" },
  { id: "bayern-munich-women", name: "FC Bayern München", league: "Google Pixel Frauen-Bundesliga", country: "Germany", leagueDirectory: "https://www.dfb.de/news/teilnehmerfeld-der-google-pixel-frauen-bundesliga-steht-fest-alle-sportlich-qualifizierten-klubs-erhalten-zulassung" },
  { id: "nurnberg-women", name: "1. FC Nürnberg", league: "Google Pixel Frauen-Bundesliga", country: "Germany", leagueDirectory: "https://www.dfb.de/news/teilnehmerfeld-der-google-pixel-frauen-bundesliga-steht-fest-alle-sportlich-qualifizierten-klubs-erhalten-zulassung" },
  { id: "vfb-stuttgart-women", name: "VfB Stuttgart", league: "Google Pixel Frauen-Bundesliga", country: "Germany", leagueDirectory: "https://www.dfb.de/news/teilnehmerfeld-der-google-pixel-frauen-bundesliga-steht-fest-alle-sportlich-qualifizierten-klubs-erhalten-zulassung" },
  { id: "wolfsburg-women", name: "VfL Wolfsburg", league: "Google Pixel Frauen-Bundesliga", country: "Germany", leagueDirectory: "https://www.dfb.de/news/teilnehmerfeld-der-google-pixel-frauen-bundesliga-steht-fest-alle-sportlich-qualifizierten-klubs-erhalten-zulassung" },

  // Arkema Première Ligue (France, 2026-27 official FFF club ticketing directory)
  { id: "fc-fleury-91-women", name: "FC Fleury 91", league: "Arkema Première Ligue", country: "France", leagueDirectory: "https://billetterie.fff.fr/fr/arkema_premiere_ligue" },
  { id: "fc-nantes-women", name: "FC Nantes", league: "Arkema Première Ligue", country: "France", leagueDirectory: "https://billetterie.fff.fr/fr/arkema_premiere_ligue" },
  { id: "le-havre-ac-women", name: "Le Havre AC", league: "Arkema Première Ligue", country: "France", leagueDirectory: "https://billetterie.fff.fr/fr/arkema_premiere_ligue" },
  { id: "montpellier-fc-women", name: "Montpellier FC", league: "Arkema Première Ligue", country: "France", leagueDirectory: "https://billetterie.fff.fr/fr/arkema_premiere_ligue" },
  { id: "ol-lyonnes", name: "OL Lyonnes", league: "Arkema Première Ligue", country: "France", leagueDirectory: "https://billetterie.fff.fr/fr/arkema_premiere_ligue" },
  { id: "olympique-marseille-women", name: "Olympique de Marseille", league: "Arkema Première Ligue", country: "France", leagueDirectory: "https://billetterie.fff.fr/fr/arkema_premiere_ligue" },
  { id: "paris-fc-women", name: "Paris FC", league: "Arkema Première Ligue", country: "France", leagueDirectory: "https://billetterie.fff.fr/fr/arkema_premiere_ligue" },
  { id: "paris-saint-germain-women", name: "Paris Saint-Germain", league: "Arkema Première Ligue", country: "France", leagueDirectory: "https://billetterie.fff.fr/fr/arkema_premiere_ligue" },
  { id: "amiens-sc-women", name: "Amiens SC", league: "Arkema Première Ligue", country: "France", leagueDirectory: "https://billetterie.fff.fr/fr/arkema_premiere_ligue" },
  { id: "rc-strasbourg-alsace-women", name: "RC Strasbourg Alsace", league: "Arkema Première Ligue", country: "France", leagueDirectory: "https://billetterie.fff.fr/fr/arkema_premiere_ligue" },
  { id: "toulouse-fc-women", name: "Toulouse FC", league: "Arkema Première Ligue", country: "France", leagueDirectory: "https://billetterie.fff.fr/fr/arkema_premiere_ligue" },
  { id: "us-saint-malo-women", name: "US Saint-Malo", league: "Arkema Première Ligue", country: "France", leagueDirectory: "https://billetterie.fff.fr/fr/arkema_premiere_ligue" }
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
  "women", "women's football", "women’s football", "women's soccer", "women’s soccer",
  "women's super league", "barclays wsl", "wsl", "wsl 2", "nwsl",
  "uefa women's champions league", "women's champions league", "uwcl",
  "wafcon", "afc women's champions league", "liga mx femenil",
  "copa libertadores femenina", "liga f", "serie a femminile",
  "serie a women", "frauen-bundesliga", "bundesliga women",
  "a-league women", "we league", "damallsvenskan", "toppserien",
  "women's world cup", "women's euros", "uswnt", "matildas",
  "lionesses", "female football", "female soccer", "women's national team", "football ferns"
];

export const SOURCE_REGISTRY_VERSION = 9;
