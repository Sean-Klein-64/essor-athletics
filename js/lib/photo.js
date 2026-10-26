import { useEffect, useState } from "react";

/*
  The countdown photo: a picture of the race city, found automatically.

  Source: Wikimedia Commons — free to use in an app with the author and
  licence shown (the small credit on the card). No account or key needed.
  (Unsplash has nicer city shots but needs an API key and app approval;
  images pulled off Google are not ours to use.)

  Found once per race and kept in preferences.racePhotos[raceKey]:
    { query, skip, uri, credit, page }
  "Autre photo" bumps skip to take the next result. The image itself is
  cached by the phone, so it usually shows offline after the first load.
  A coach's own photo (goal.photo in js/lib/goal.js) always wins.
*/

/* Words to search with: the runner's own words, else the city + its landmark */
const LANDMARKS = {
  rome: "Rome Colosseum",
  paris: "Paris Eiffel Tower Seine",
  bayonne: "Bayonne Nive quais",
  biarritz: "Biarritz Grande Plage",
  bordeaux: "Bordeaux Place de la Bourse miroir",
  "saint-sebastien": "San Sebastian La Concha",
  "san sebastian": "San Sebastian La Concha",
  donostia: "San Sebastian La Concha",
  bilbao: "Bilbao Guggenheim",
  londres: "London Tower Bridge",
  london: "London Tower Bridge",
  berlin: "Berlin Brandenburger Tor",
  "new york": "New York Central Park skyline",
  barcelone: "Barcelona Sagrada Familia",
  barcelona: "Barcelona Sagrada Familia",
  valence: "Valencia Ciudad de las Artes",
  valencia: "Valencia Ciudad de las Artes",
  seville: "Sevilla Plaza de España",
  séville: "Sevilla Plaza de España",
  lisbonne: "Lisbon Praça do Comércio",
  lisbon: "Lisbon Praça do Comércio",
  amsterdam: "Amsterdam canal houses",
  pau: "Pau boulevard des Pyrénées",
  toulouse: "Toulouse Capitole Garonne",
  lyon: "Lyon Fourvière Saône",
  marseille: "Marseille Vieux-Port",
  nice: "Nice Promenade des Anglais",
};

export const photoQueryFor = (race) => {
  if (!race) return "";
  if (race.photoQuery && race.photoQuery.trim()) return race.photoQuery.trim();
  const place = String(race.place || "").trim();
  const known = LANDMARKS[place.toLowerCase()];
  if (known) return known;
  return place ? `${place} ville` : race.name || "";
};

const WIDTH = 1200;

export const commonsSearchUrl = (query) =>
  "https://commons.wikimedia.org/w/api.php?" +
  [
    "action=query",
    "format=json",
    "origin=*",
    "generator=search",
    "gsrnamespace=6",
    "gsrlimit=20",
    `gsrsearch=${encodeURIComponent(`${query} filetype:bitmap`)}`,
    "prop=imageinfo",
    "iiprop=url|size|mime|extmetadata",
    "iiextmetadatafilter=Artist|LicenseShortName",
    `iiurlwidth=${WIDTH}`,
  ].join("&");

const stripTags = (html) =>
  String(html || "")
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();

/*
  The search results, best first: landscape JPEGs big enough for the card,
  in the order Commons ranks them. [{ uri, credit, page }]
*/
export const photosFrom = (json) => {
  const pages = Object.values(json?.query?.pages || {}).sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  return pages
    .map((pg) => ({ pg, info: (pg.imageinfo || [])[0] }))
    .filter(({ info }) => info && /jpe?g/.test(info.mime || "") && info.width >= 1000 && info.width >= info.height * 1.2)
    .map(({ info }) => {
      const meta = info.extmetadata || {};
      const artist = stripTags(meta.Artist?.value).slice(0, 60);
      const licence = stripTags(meta.LicenseShortName?.value);
      return {
        uri: info.thumburl || info.url,
        credit: ["Photo", artist || null, licence || null, "Wikimedia Commons"].filter(Boolean).join(" · ").replace("Photo · ", "Photo : "),
        page: info.descriptionurl || null,
      };
    });
};

export const fetchPhoto = async (query, skip = 0) => {
  const res = await fetch(commonsSearchUrl(query), { headers: { "Api-User-Agent": "EssorAthletics/0.1 (CrossFit Essor run club app)" } });
  if (!res.ok) throw new Error(`commons ${res.status}`);
  const list = photosFrom(await res.json());
  if (!list.length) return null;
  return list[skip % list.length];
};

/*
  The photo for a race: { source, credit } ready for <Image>, or null while
  loading / when nothing was found (the card falls back to plain green).
  next() takes the following search result.
*/
export const useRacePhoto = (race, key, coachPhoto, preferences, setPreference) => {
  const saved = preferences.racePhotos?.[key];
  const query = photoQueryFor(race);
  const [busy, setBusy] = useState(false);

  const store = async (entry) => {
    const all = { ...(preferences.racePhotos || {}) };
    // keep it small: this race and at most three others
    const keys = Object.keys(all).filter((k) => k !== key).slice(-3);
    const kept = Object.fromEntries(keys.map((k) => [k, all[k]]));
    await setPreference("racePhotos", { ...kept, [key]: entry });
  };

  const load = async (skip) => {
    if (!query || busy) return;
    setBusy(true);
    try {
      const found = await fetchPhoto(query, skip);
      await store({ query, skip, uri: found?.uri || null, credit: found?.credit || "", page: found?.page || null });
    } catch {
      // offline or Commons down — try again next time Home opens
    } finally {
      setBusy(false);
    }
  };

  const stale = !saved || saved.query !== query;
  useEffect(() => {
    if (coachPhoto || !race || !stale) return undefined;
    const t = setTimeout(() => load(0), 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, query, coachPhoto]);

  if (coachPhoto) return { source: coachPhoto, credit: "", next: null, busy: false };
  if (!saved?.uri || stale) return { source: null, credit: "", next: () => load(0), busy };
  return { source: { uri: saved.uri }, credit: saved.credit, next: () => load((saved.skip || 0) + 1), busy };
};
