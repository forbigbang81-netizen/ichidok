// Ichidoki seed catalog — rebuilt with all anime

export interface SeedAnime {
  malId: number; title: string; titleEnglish?: string; titleJapanese?: string;
  synopsis: string; poster: string; banner: string; trailer?: string;
  type: "TV" | "Movie" | "Special" | "OVA" | "ONA";
  status: "Finished Airing" | "Currently Airing" | "Not yet aired";
  score: number; scoredBy: number; rank: number; popularity: number; members: number;
  year: number; season: "winter" | "spring" | "summer" | "fall" | null;
  genres: string[]; studios: string[]; episodeCount: number; duration: string;
  rating: string; source: string; isFeatured?: boolean;
  episodeSources?: EpisodeSource[]; hasDub?: boolean; hasSub?: boolean;
  subtitlePattern?: string; localSubtitlePattern?: string; noSubtitles?: boolean;
}

export interface EpisodeSource {
  startEp: number; endEp: number; collection: string;
  fileTemplate?: string; fileName?: string;
  needsProxy?: boolean; dualAudio?: boolean; audio?: "sub" | "dub" | "both";
  seasonMap?: { startEp: number; endEp: number; season: number }[];
  // Optional map from episode number to a literal filename fragment.
  // Used when each episode has a unique filename pattern that can't be
  // expressed with a single {ep}-template (e.g. DVD rips where each
  // episode file includes the episode title in the name).
  episodeFiles?: Record<number, string>;
}

export const SEED_ANIME: SeedAnime[] = [
  // Frieren
  { malId: 52991, title: "Frieren: Beyond Journey's End", titleEnglish: "Frieren: Beyond Journey's End", titleJapanese: "葬送のフリーレン",
    synopsis: "During their decade-long quest to defeat the Demon King, the members of the hero's party forge bonds through adventures and battles. However, the time that Frieren spends with her comrades is equivalent to merely a fraction of her life. As the years pass, Frieren gradually realizes how her days in the hero's party truly impacted her.",
    poster: "https://cdn.myanimelist.net/images/anime/1015/138006l.webp", banner: "https://img.youtube.com/vi/ZEkwCGJ3o7M/maxresdefault.jpg",
    trailer: "ZEkwCGJ3o7M", type: "TV", status: "Finished Airing", score: 9.26, scoredBy: 906724, rank: 1, popularity: 103, members: 1470685,
    year: 2023, season: "fall", genres: ["Adventure", "Award Winning", "Drama", "Fantasy"], studios: ["Madhouse"],
    episodeCount: 28, duration: "24 min per ep", rating: "PG-13 - Teens 13 or older", source: "Manga", isFeatured: true,
    // Archive.org MP4 derivatives only contain the English dub audio track (the JP audio
    // from the original dual-audio MKV was dropped during derivative creation). So these
    // files are DUB-only. hasDub=true so the player shows the DUB toggle.
    // For SUB mode, no JP-audio MP4 source is currently available.
    // The MKV has a "Signs & Songs" ASS track but no English dialogue subs.
    episodeSources: [{ startEp: 1, endEp: 28, collection: "frieren-beyond-journeys-end_1080p_2024", fileTemplate: "Frieren-Beyond-Journey's-End_S01E{ep:02}.mp4", audio: "dub" }], hasDub: true,
  },
  // Steins;Gate
  { malId: 9253, title: "Steins;Gate", titleEnglish: "Steins;Gate", titleJapanese: "STEINS;GATE",
    synopsis: "Eccentric scientist Rintarou Okabe has a never-ending thirst for scientific exploration. Together with his ditzy but well-meaning friend Mayuri Shiina and his roommate Itaru Hashida, Okabe founds the Future Gadget Laboratory.",
    poster: "https://cdn.myanimelist.net/images/anime/1935/127974l.webp", banner: "https://img.youtube.com/vi/27OZc-ku6is/maxresdefault.jpg",
    trailer: "27OZc-ku6is", type: "TV", status: "Finished Airing", score: 9.07, scoredBy: 1528717, rank: 5, popularity: 14, members: 2829293,
    year: 2011, season: "spring", genres: ["Drama", "Sci-Fi", "Suspense"], studios: ["White Fox"],
    episodeCount: 24, duration: "24 min per ep", rating: "PG-13 - Teens 13 or older", source: "Visual novel", isFeatured: true,
    episodeSources: [
      { startEp: 1, endEp: 21, collection: "steinsgate_1.130209", fileTemplate: "Steins;Gate_-_{ep:02}_-Blu-Ray.mp4", audio: "sub" },
      { startEp: 22, endEp: 24, collection: "steins-gte", fileTemplate: "{ep}.mp4", audio: "sub" },
    ],
  },
  // Bleach TYBW
  { malId: 41467, title: "Bleach: Thousand-Year Blood War", titleEnglish: "Bleach: Thousand-Year Blood War", titleJapanese: "BLEACH 千年血戦篇",
    synopsis: "Substitute Soul Reaper Ichigo Kurosaki faces the return of Yhwach, an ancient Quincy king who seeks to reignite the historic blood feud between Soul Reaper and Quincy.",
    poster: "https://cdn.myanimelist.net/images/anime/1908/135431l.webp", banner: "https://img.youtube.com/vi/e8YBesRKq_U/maxresdefault.jpg",
    trailer: "e8YBesRKq_U", type: "TV", status: "Finished Airing", score: 8.98, scoredBy: 387868, rank: 15, popularity: 332, members: 715955,
    year: 2022, season: "fall", genres: ["Action", "Adventure", "Supernatural"], studios: ["Studio Pierrot"],
    episodeCount: 13, duration: "24 min per ep", rating: "R - 17+ (violence & profanity)", source: "Manga", isFeatured: true,
    episodeSources: [
      { startEp: 1, endEp: 13, collection: "BleachTYBW1-28", fileTemplate: "Bleach TYBW Episode 00{ep:02}.mp4", audio: "dub" },
    ], hasDub: true,
  },
  // Bleach TYBW Separation
  { malId: 53998, title: "Bleach: Thousand-Year Blood War - The Separation", titleEnglish: "Bleach: Thousand-Year Blood War - The Separation", titleJapanese: "BLEACH 千年血戦篇-訣別譚-",
    synopsis: "After a brutal surprise attack by the forces of Quincy King Yhwach, the resident Reapers of the Soul Society lick their wounds and mourn their losses.",
    poster: "https://cdn.myanimelist.net/images/anime/1164/138058l.jpg", banner: "https://cdn.myanimelist.net/images/anime/1164/138058l.jpg",
    type: "TV", status: "Finished Airing", score: 8.7, scoredBy: 234567, rank: 115, popularity: 250, members: 456789,
    year: 2023, season: "summer", genres: ["Action", "Adventure", "Supernatural"], studios: ["Studio Pierrot"],
    episodeCount: 13, duration: "24 min per ep", rating: "R - 17+ (violence & profanity)", source: "Manga",
    episodeSources: [
      { startEp: 1, endEp: 13, collection: "BleachTYBW1-28", fileTemplate: "Bleach TYBW Episode 00{ep:02}.mp4", audio: "dub" },
    ], hasDub: true,
  },
  // Bleach TYBW Conflict (Cour 3)
  { malId: 56784, title: "Bleach: Thousand-Year Blood War - The Conflict", titleEnglish: "Bleach: Thousand-Year Blood War - The Conflict", titleJapanese: "BLEACH 千年血戦篇-相剋譚-",
    synopsis: "After an awe-inspiring battle with Ichibei Hyousube, the powerful Yhwach moves into the final stage of his master plan to slay the Soul King.",
    poster: "https://cdn.myanimelist.net/images/anime/1595/144074l.jpg", banner: "https://cdn.myanimelist.net/images/anime/1595/144074l.jpg",
    type: "TV", status: "Finished Airing", score: 8.68, scoredBy: 163936, rank: 74, popularity: 923, members: 306368,
    year: 2024, season: "fall", genres: ["Action", "Adventure", "Supernatural"], studios: ["Pierrot Films"],
    episodeCount: 14, duration: "24 min per ep", rating: "R - 17+ (violence & profanity)", source: "Manga",
    episodeSources: [
      { startEp: 1, endEp: 9, collection: "BleachTYBW1-28", fileTemplate: "Bleach TYBW Episode 00{ep:02}.mp4", audio: "dub" },
      
    ], hasDub: true,
  },
  // Bleach TYBW Calamity (upcoming)
  { malId: 60636, title: "Bleach: Thousand-Year Blood War - The Calamity", titleEnglish: "Bleach: Thousand-Year Blood War - The Calamity", titleJapanese: "BLEACH 千年血戦篇-禍相譚-",
    synopsis: "Final part of Bleach: Sennen Kessen-hen.", poster: "https://cdn.myanimelist.net/images/anime/1275/158595l.jpg", banner: "https://cdn.myanimelist.net/images/anime/1275/158595l.jpg",
    type: "TV", status: "Not yet aired", score: 0, scoredBy: 0, rank: 0, popularity: 380, members: 23456,
    year: 2026, season: "summer", genres: ["Action", "Adventure", "Supernatural"], studios: ["Pierrot Films"],
    episodeCount: 12, duration: "24 min per ep", rating: "R - 17+ (violence & profanity)", source: "Manga", episodeSources: [],
  },
  // Bleach 2004
  { malId: 269, title: "Bleach", titleEnglish: "Bleach", titleJapanese: "BLEACH - ブリーチ -",
    synopsis: "Ichigo Kurosaki is an ordinary high schooler—until his family is attacked by a Hollow. He meets a Soul Reaper named Rukia Kuchiki, and becomes a Soul Reaper himself.",
    poster: "https://cdn.myanimelist.net/images/anime/1541/147774l.jpg", banner: "https://cdn.myanimelist.net/images/anime/1541/147774l.jpg",
    type: "TV", status: "Finished Airing", score: 8.0, scoredBy: 1270540, rank: 738, popularity: 33, members: 2224150,
    year: 2004, season: "fall", genres: ["Action", "Adventure", "Supernatural"], studios: ["Studio Pierrot"],
    episodeCount: 366, duration: "24 min per ep", rating: "PG-13 - Teens 13 or older", source: "Manga", isFeatured: true,
    episodeSources: [{
      startEp: 1, endEp: 366, collection: "bl35ch-s35s0ns-{season}",
      fileTemplate: "Bleach Temporada {season}/Bleach (Dub) Episode {seasonEp}.mp4", audio: "dub",
      seasonMap: [
        { startEp: 1, endEp: 20, season: 1 }, { startEp: 21, endEp: 41, season: 2 }, { startEp: 42, endEp: 63, season: 3 },
        { startEp: 64, endEp: 91, season: 4 }, { startEp: 92, endEp: 109, season: 5 }, { startEp: 110, endEp: 131, season: 6 },
        { startEp: 132, endEp: 151, season: 7 }, { startEp: 152, endEp: 167, season: 8 }, { startEp: 168, endEp: 189, season: 9 },
        { startEp: 190, endEp: 205, season: 10 }, { startEp: 206, endEp: 212, season: 11 }, { startEp: 213, endEp: 229, season: 12 },
        { startEp: 230, endEp: 265, season: 13 }, { startEp: 266, endEp: 316, season: 14 }, { startEp: 317, endEp: 342, season: 15 },
        { startEp: 343, endEp: 366, season: 16 },
      ],
    }], hasDub: true,
  },
  // Frieren S2 (Season 2, aired Jan-Mar 2026 — 10 episodes)
  { malId: 59978, title: "Frieren: Beyond Journey's End Season 2", titleEnglish: "Frieren: Beyond Journey's End Season 2", titleJapanese: "葬送のフリーレン 第2クール",
    synopsis: "Following the First-Class Mage Exam, the trio gains access to the dangerous Northern Plateau.", poster: "https://cdn.myanimelist.net/images/anime/1921/154528l.jpg", banner: "https://cdn.myanimelist.net/images/anime/1921/154528l.jpg",
    type: "TV", status: "Finished Airing", score: 8.86, scoredBy: 87432, rank: 28, popularity: 121, members: 234567,
    year: 2026, season: "winter", genres: ["Adventure", "Drama", "Fantasy"], studios: ["Madhouse"],
    episodeCount: 10, duration: "24 min per ep", rating: "PG-13 - Teens 13 or older", source: "Manga", isFeatured: true,
    // S2 (2026) episodes are not yet available on archive.org. Episode sources
    // will be added once a streamable dual-audio or JP-audio MP4 collection is uploaded.
    episodeSources: [],
  },
  // Frieren Golden Land Arc (upcoming)
  { malId: 63816, title: "Frieren: Beyond Journey's End - Golden Land Arc", titleEnglish: "Frieren: Beyond Journey's End - Golden Land Arc", titleJapanese: "葬送のフリーレン 黄金郵編",
    synopsis: "Third season of Sousou no Frieren.", poster: "https://cdn.myanimelist.net/images/anime/1619/156313l.jpg", banner: "https://cdn.myanimelist.net/images/anime/1619/156313l.jpg",
    type: "TV", status: "Not yet aired", score: 0, scoredBy: 0, rank: 0, popularity: 400, members: 12345,
    year: 2027, season: "fall", genres: ["Adventure", "Drama", "Fantasy"], studios: ["Madhouse"],
    episodeCount: 12, duration: "24 min per ep", rating: "PG-13 - Teens 13 or older", source: "Manga", episodeSources: [],
  },
  // JJK S1
  { malId: 40748, title: "Jujutsu Kaisen", titleEnglish: "Jujutsu Kaisen", titleJapanese: "呪術廻戦",
    synopsis: "Idly indulging in baseless paranormal activities with the Occult Club, high schooler Yuuji Itadori spends his days at his grandfather's bedside.",
    poster: "https://cdn.myanimelist.net/images/anime/1171/109222l.jpg", banner: "https://cdn.myanimelist.net/images/anime/1171/109222l.jpg",
    type: "TV", status: "Finished Airing", score: 8.5, scoredBy: 2022419, rank: 166, popularity: 11, members: 3068158,
    year: 2020, season: "fall", genres: ["Action", "Award Winning", "Supernatural"], studios: ["MAPPA"],
    episodeCount: 24, duration: "23 min per ep", rating: "R - 17+ (violence & profanity)", source: "Manga", isFeatured: true,
    episodeSources: [{ startEp: 1, endEp: 24, collection: "jujutsu-kaisen-season-1-episode-17-eng.dub", fileTemplate: "JUJUTSU KAISEN Season 1 Episode {ep} eng.dub.mp4", audio: "dub" }],
    hasDub: true,
  },
  // JJK S2
  { malId: 51009, title: "Jujutsu Kaisen Season 2", titleEnglish: "Jujutsu Kaisen Season 2", titleJapanese: "呪術廻戦 第2期",
    synopsis: "The second season of Jujutsu Kaisen covering the Hidden Inventory and Shibuya Incident arcs.",
    poster: "https://cdn.myanimelist.net/images/anime/1792/138022l.jpg", banner: "https://cdn.myanimelist.net/images/anime/1792/138022l.jpg",
    type: "TV", status: "Finished Airing", score: 8.7, scoredBy: 765432, rank: 110, popularity: 18, members: 1987654,
    year: 2023, season: "summer", genres: ["Action", "Supernatural"], studios: ["MAPPA"],
    episodeCount: 23, duration: "23 min per ep", rating: "R - 17+ (violence & profanity)", source: "Manga", isFeatured: true,
    episodeSources: [
      
      { startEp: 1, endEp: 23, collection: "jujutsu-kaisen-s-02-e-21-1080p-bd-av-1-dual-audio.mkv", fileTemplate: "Jujutsu Kaisen - S02E{ep:02} [1080p BD AV1][Dual Audio].mkv.mp4", needsProxy: true, audio: "dub" },
    ], hasDub: true,
  },
  // JJK Culling Game (upcoming)
  { malId: 57658, title: "Jujutsu Kaisen: The Culling Game Part 1", titleEnglish: "Jujutsu Kaisen: The Culling Game Part 1", titleJapanese: "呪術廻戦 死滅回遊 前編",
    synopsis: "Kenjaku has initiated the next step in his plan, releasing curses across Japan.", poster: "https://cdn.myanimelist.net/images/anime/1659/154920l.jpg", banner: "https://cdn.myanimelist.net/images/anime/1659/154920l.jpg",
    type: "TV", status: "Finished Airing", score: 8.61, scoredBy: 12345, rank: 200, popularity: 350, members: 56789,
    year: 2026, season: "winter", genres: ["Action", "Supernatural"], studios: ["MAPPA"],
    episodeCount: 12, duration: "23 min per ep", rating: "R - 17+ (violence & profanity)", source: "Manga", episodeSources: [],
  },
  // Chainsaw Man
  { malId: 44511, title: "Chainsaw Man", titleEnglish: "Chainsaw Man", titleJapanese: "チェンソーマン",
    synopsis: "Denji has a simple dream—to live a happy and peaceful life. As a Devil Hunter, Denji works alongside Pochita to pay off his dead father's yakuza debts.",
    poster: "https://cdn.myanimelist.net/images/anime/1806/126216l.jpg", banner: "https://cdn.myanimelist.net/images/anime/1806/126216l.jpg",
    type: "TV", status: "Finished Airing", score: 8.42, scoredBy: 1162472, rank: 206, popularity: 47, members: 1992701,
    year: 2022, season: "fall", genres: ["Action", "Fantasy"], studios: ["MAPPA"],
    episodeCount: 12, duration: "24 min per ep", rating: "R - 17+ (violence & profanity)", source: "Manga", isFeatured: true,
    // Real English dialogue subtitles extracted from the embedded GJM ASS track
    // in the archive.org MKV files. See scripts/extract_chainsaw_subs.py.
    // Each episode has a unique hash in the filename, so we use per-episode fileName entries.
    episodeSources: [
                                                                              { startEp: 1, endEp: 1, collection: "10.-bruised-battered", fileName: "Chainsaw Man Season 1/01. Dog & Chainsaw.mp4", audio: "dub" },
      { startEp: 2, endEp: 2, collection: "10.-bruised-battered", fileName: "Chainsaw Man Season 1/02. Arrival in Tokyo.mp4", audio: "dub" },
      { startEp: 3, endEp: 3, collection: "10.-bruised-battered", fileName: "Chainsaw Man Season 1/03. Meowy's Whereabouts.mp4", audio: "dub" },
      { startEp: 4, endEp: 4, collection: "10.-bruised-battered", fileName: "Chainsaw Man Season 1/04. Rescue.mp4", audio: "dub" },
      { startEp: 5, endEp: 5, collection: "10.-bruised-battered", fileName: "Chainsaw Man Season 1/05. Gun Devil.mp4", audio: "dub" },
      { startEp: 6, endEp: 6, collection: "10.-bruised-battered", fileName: "Chainsaw Man Season 1/06. Kill Denji.mp4", audio: "dub" },
      { startEp: 7, endEp: 7, collection: "10.-bruised-battered", fileName: "Chainsaw Man Season 1/07. The Taste of a Kiss.mp4", audio: "dub" },
      { startEp: 8, endEp: 8, collection: "10.-bruised-battered", fileName: "Chainsaw Man Season 1/08. Gunfire.mp4", audio: "dub" },
      { startEp: 9, endEp: 9, collection: "10.-bruised-battered", fileName: "Chainsaw Man Season 1/09. From Kyoto.mp4", audio: "dub" },
      { startEp: 10, endEp: 10, collection: "10.-bruised-battered", fileName: "Chainsaw Man Season 1/10. Bruised & Battered.mp4", audio: "dub" },
      { startEp: 11, endEp: 11, collection: "10.-bruised-battered", fileName: "Chainsaw Man Season 1/11. Mission Start.mp4", audio: "dub" },
      { startEp: 12, endEp: 12, collection: "10.-bruised-battered", fileName: "Chainsaw Man Season 1/12. Katana vs. Chainsaw.mp4", audio: "dub" },
    ], hasDub: true,
  },
  // Chainsaw Man Movie: Reze Arc
  { malId: 57555, title: "Chainsaw Man – The Movie: Reze Arc", titleEnglish: "Chainsaw Man – The Movie: Reze Arc", titleJapanese: "劇場版 チェンソーマン レゼ篇",
    synopsis: "Denji yearns for a normal life. When a mysterious girl named Reze appears, Denji is captivated by her charm.",
    poster: "https://cdn.myanimelist.net/images/anime/1763/150638l.jpg", banner: "https://cdn.myanimelist.net/images/anime/1763/150638l.jpg",
    type: "Movie", status: "Finished Airing", score: 9.06, scoredBy: 328807, rank: 6, popularity: 519, members: 509373,
    year: 2025, season: null, genres: ["Action", "Fantasy"], studios: ["MAPPA"],
    episodeCount: 1, duration: "1 hr 39 min", rating: "R - 17+ (violence & profanity)", source: "Manga", isFeatured: true,
    // Sub = Japanese audio (FLE release), Dub = English audio (sam release)
    // No subtitles (user requested raw JP audio).
    noSubtitles: true,
    episodeSources: [
      { startEp: 1, endEp: 1, collection: "dropbox", fileName: "https://www.dropbox.com/scl/fi/gxa0w7njajt3a91nobcis/AnimePahe_Chainsaw_Man_Movie_-_Reze-hen_-_01_804p_FLE.mp4?rlkey=3dklwl2fb3vro231z1h8tytma&st=tmzmq2vw&dl=1", audio: "sub" },
      { startEp: 1, endEp: 1, collection: "sam-chainsaw-man-the-movie-reze-arc-2025-web-1080p-eac-3-c-24-c-4-dd-1.-1080", fileName: "[sam] Chainsaw Man - The Movie Reze Arc (2025) [WEB 1080p EAC-3] [C24C4DD1].1080.mp4", audio: "dub" },
    ], hasDub: true,
  },
  // Gachiakuta
  { malId: 59062, title: "Gachiakuta", titleEnglish: "Gachiakuta", titleJapanese: "ガチアクタ",
    synopsis: "Rudo lives in the slums. When his adoptive father is murdered, Rudo is thrown into the Pit where he joins the Cleaners.",
    poster: "https://cdn.myanimelist.net/images/anime/1682/150432l.jpg", banner: "https://cdn.myanimelist.net/images/anime/1682/150432l.jpg",
    type: "TV", status: "Finished Airing", score: 8.21, scoredBy: 232927, rank: 428, popularity: 497, members: 521210,
    year: 2025, season: "summer", genres: ["Action", "Fantasy"], studios: ["Bones Film"],
    episodeCount: 24, duration: "23 min per ep", rating: "PG-13 - Teens 13 or older", source: "Manga", isFeatured: true,
    episodeSources: [
      { startEp: 1, endEp: 1, collection: "gachiakuta.-s-01-e-01.-the.-sphere.-1080p.-cr.-web-dl.-dual.-aac-2.0.-h.-264-varyg.-720", fileName: "Gachiakuta.S01E01.The.Sphere.1080p.CR.WEB-DL.DUAL.AAC2.0.H.264-VARYG.720.mp4", audio: "dub" },
      { startEp: 2, endEp: 12, collection: "gachiakuta-02-720p-x-265-samehadaku.-care", fileTemplate: "Gachiakuta-{ep:02}-720p-[x265]-SAMEHADAKU.CARE.mp4", audio: "dub" },
      { startEp: 2, endEp: 24, collection: "gachiakuta_202601", fileTemplate: "Gachiakuta Dubbed/ep {ep:02}.mp4", audio: "dub" },
    ],
  },
  // Gachiakuta S2 (upcoming)
  { malId: 63147, title: "Gachiakuta Season 2", titleEnglish: "Gachiakuta Season 2", titleJapanese: "ガチアクタ 2期",
    synopsis: "Second season of Gachiakuta.", poster: "https://cdn.myanimelist.net/images/anime/1224/154534l.jpg", banner: "https://cdn.myanimelist.net/images/anime/1224/154534l.jpg",
    type: "TV", status: "Not yet aired", score: 0, scoredBy: 0, rank: 0, popularity: 3050, members: 68316,
    year: 2027, season: null, genres: ["Action", "Fantasy"], studios: ["Bones Film"],
    episodeCount: 12, duration: "23 min per ep", rating: "PG-13 - Teens 13 or older", source: "Manga", episodeSources: [],
  },
  // Smoking Behind the Supermarket
  { malId: 62076, title: "Smoking Behind the Supermarket with You", titleEnglish: "Smoking Behind the Supermarket with You", titleJapanese: "スーパーの裏でヤニ吸うふたり",
    synopsis: "The sole thing that gets Sasaki through his soul-sucking job is a cheerful smile from Yamada. After a grueling day, he meets Tayama behind the store.",
    poster: "https://cdn.myanimelist.net/images/anime/1768/156339l.jpg", banner: "https://cdn.myanimelist.net/images/anime/1768/156339l.jpg",
    type: "TV", status: "Finished Airing", score: 8.51, scoredBy: 26973, rank: 162, popularity: 1951, members: 135442,
    year: 2026, season: "summer", genres: ["Romance"], studios: ["Asahi Production"],
    episodeCount: 12, duration: "23 min per ep", rating: "PG-13 - Teens 13 or older", source: "Manga", isFeatured: true,
    // Real English dialogue subtitles extracted from the embedded Crunchyroll ASS
    // subtitle tracks in the archive.org MP4 files. See scripts/extract_smoking_subs.py.
    localSubtitlePattern: "/subtitles/62076_e{ep}.vtt",
    episodeSources: [
      { startEp: 1, endEp: 1, collection: "smoking-behind-the-supermarket-with-you-e1-ae27fe", fileName: "smoking behind the supermarket with you E1.mp4", audio: "sub" },
      { startEp: 2, endEp: 2, collection: "smoking-behind-the-supermarket-with-you-e2-0b8faa", fileName: "smoking behind the supermarket with you E2.mp4", audio: "sub" },
      { startEp: 3, endEp: 3, collection: "smoking-behind-the-supermarket-with-you-e3-53f07a", fileName: "smoking behind the supermarket with you E3.mp4", audio: "sub" },
      { startEp: 4, endEp: 4, collection: "smoking-behind-the-supermarket-with-you-e4-9cbc99", fileName: "smoking behind the supermarket with you E4.mp4", audio: "sub" },
      { startEp: 5, endEp: 5, collection: "smoking-behind-the-supermarket-with-you-e5-8f67e4", fileName: "smoking behind the supermarket with you E5.mp4", audio: "sub" },
      { startEp: 6, endEp: 6, collection: "smoking-behind-the-supermarket-with-you-e6-7488be", fileName: "smoking behind the supermarket with you E6.mp4", audio: "sub" },
      { startEp: 7, endEp: 7, collection: "smoking-behind-the-supermarket-with-you-e7-7dd743", fileName: "smoking behind the supermarket with you E7.mp4", audio: "sub" },
      { startEp: 8, endEp: 8, collection: "smoking-behind-the-supermarket-with-you-e8-79ae59", fileName: "smoking behind the supermarket with you E8.mp4", audio: "sub" },
      { startEp: 9, endEp: 9, collection: "smoking-behind-the-supermarket-with-you-e9-6c187a", fileName: "smoking behind the supermarket with you E9.mp4", audio: "sub" },
      { startEp: 10, endEp: 10, collection: "smoking-behind-the-supermarket-with-you-e10-50fe59", fileName: "smoking behind the supermarket with you E10.mp4", audio: "sub" },
      { startEp: 11, endEp: 11, collection: "smoking-behind-the-supermarket-with-you-e11-ff90a6", fileName: "smoking behind the supermarket with you E11.mp4", audio: "sub" },
      { startEp: 12, endEp: 12, collection: "smoking-behind-the-supermarket-with-you-e12-3874fb", fileName: "smoking behind the supermarket with you E12.mp4", audio: "sub" },
    ],
  },
  // Cowboy Bebop
  { malId: 1, title: "Cowboy Bebop", titleEnglish: "Cowboy Bebop", titleJapanese: "カウボーイビバップ",
    synopsis: "Crime is timeless. By the year 2071, humanity has expanded across the galaxy. Bounty hunters known as Cowboys chase criminals across the stars.",
    poster: "https://cdn.myanimelist.net/images/anime/4/19644l.jpg", banner: "https://cdn.myanimelist.net/images/anime/4/19644l.jpg",
    type: "TV", status: "Finished Airing", score: 8.75, scoredBy: 980000, rank: 55, popularity: 16, members: 2000000,
    year: 1998, season: "spring", genres: ["Action", "Award Winning", "Sci-Fi"], studios: ["Sunrise"],
    episodeCount: 26, duration: "24 min per ep", rating: "R - 17+ (violence & profanity)", source: "Original", isFeatured: true,
    episodeSources: [{ startEp: 1, endEp: 26, collection: "db-bebop-of-the-cowboys-1080p", fileTemplate: "[DB]Cowboy Bebop_-_{ep:02}_(Dual Audio_10bit_BD1080p_x265).mp4", audio: "dub" }],
    hasDub: true,
  },
  // Cyberpunk Edgerunners
  { malId: 42310, title: "Cyberpunk: Edgerunners", titleEnglish: "Cyberpunk: Edgerunners", titleJapanese: "サイバーパンク エッジランナーズ",
    synopsis: "Dreams are doomed to die in Night City. David Martinez enters the dangerous world of edgerunners.",
    poster: "https://cdn.myanimelist.net/images/anime/1818/126435l.jpg", banner: "https://cdn.myanimelist.net/images/anime/1818/126435l.jpg",
    type: "ONA", status: "Finished Airing", score: 8.62, scoredBy: 500000, rank: 60, popularity: 100, members: 800000,
    year: 2022, season: "fall", genres: ["Action", "Sci-Fi"], studios: ["Trigger"],
    episodeCount: 10, duration: "25 min per ep", rating: "R+ - Mild Nudity", source: "Game", isFeatured: true,
    episodeSources: [
      { startEp: 1, endEp: 10, collection: "1-cybpnk", fileTemplate: "Cyberpunk.Edgerunners.S01E{ep:02}.mp4", audio: "sub" },
      { startEp: 1, endEp: 1, collection: "CyberpunkEdge", fileName: "S01-E01 - Let You Down.mp4", audio: "dub" },
      { startEp: 2, endEp: 2, collection: "CyberpunkEdge", fileName: "S01-E02 - Like A Boy.mp4", audio: "dub" },
      { startEp: 3, endEp: 3, collection: "CyberpunkEdge", fileName: "S01-E03 - Smooth Criminal.mp4", audio: "dub" },
      { startEp: 4, endEp: 4, collection: "CyberpunkEdge", fileName: "S01-E04 - Lucky You.mp4", audio: "dub" },
      { startEp: 5, endEp: 5, collection: "CyberpunkEdge", fileName: "S01-E05 - All Eyez On Me.mp4", audio: "dub" },
      { startEp: 6, endEp: 6, collection: "CyberpunkEdge", fileName: "S01-E06 - Girl On Fire.mp4", audio: "dub" },
      { startEp: 7, endEp: 7, collection: "CyberpunkEdge", fileName: "S01-E07 - Stronger.mp4", audio: "dub" },
      { startEp: 8, endEp: 8, collection: "CyberpunkEdge", fileName: "S01-E08 - Stay.mp4", audio: "dub" },
      { startEp: 9, endEp: 9, collection: "CyberpunkEdge", fileName: "S01-E09 - Humanity.mp4", audio: "dub" },
      { startEp: 10, endEp: 10, collection: "CyberpunkEdge", fileName: "S01-E10 - My Moon My Man.mp4", audio: "dub" },
    ], hasDub: true,
  },
  // NGE
  { malId: 30, title: "Neon Genesis Evangelion", titleEnglish: "Neon Genesis Evangelion", titleJapanese: "新世紀エヴァンゲリオン",
    synopsis: "In the year 2015, Shinji Ikari is summoned to pilot Evangelion Unit-01 against the Angels.",
    poster: "https://cdn.myanimelist.net/images/anime/1314/108941l.jpg", banner: "https://cdn.myanimelist.net/images/anime/1314/108941l.jpg",
    type: "TV", status: "Finished Airing", score: 8.48, scoredBy: 1500000, rank: 180, popularity: 8, members: 2200000,
    year: 1995, season: "fall", genres: ["Award Winning", "Action", "Drama", "Suspense"], studios: ["Gainax"],
    episodeCount: 26, duration: "24 min per ep", rating: "R - 17+ (violence & profanity)", source: "Original", isFeatured: true,
    episodeSources: [{ startEp: 1, endEp: 26, collection: "neon-genesis-evangelion-dual-audio", fileTemplate: "Neon Genesis Evangelion - {ep:02} - Angel Attacks.mp4", audio: "dub" }],
    hasDub: true,
  },
  // End of Evangelion
  { malId: 32, title: "The End of Evangelion", titleEnglish: "Neon Genesis Evangelion: The End of Evangelion", titleJapanese: "新世紀エヴァンゲリオン劇場版 Air/まごころを、君に",
    synopsis: "SEELE orders an all-out attack on Nerv headquarters as Shinji spirals into despair.",
    poster: "https://cdn.myanimelist.net/images/anime/1404/98182l.jpg", banner: "https://cdn.myanimelist.net/images/anime/1404/98182l.jpg",
    type: "Movie", status: "Finished Airing", score: 8.57, scoredBy: 400000, rank: 50, popularity: 200, members: 600000,
    year: 1997, season: null, genres: ["Award Winning", "Action", "Drama", "Suspense"], studios: ["Gainax"],
    episodeCount: 1, duration: "1 hr 26 min", rating: "R - 17+ (violence & profanity)", source: "Original", isFeatured: true,
    episodeSources: [{ startEp: 1, endEp: 1, collection: "eva-complete-series-movies-bd-1080p", fileName: "Neon Genesis Evangelion - The End of Evangelion (1995) [1080p x265 HEVC 10bit BluRay Dual Audio AAC 5.1] [Prof].mp4", audio: "dub" }],
    hasDub: true,
  },
  // Eva 1.0
  { malId: 2759, title: "Evangelion: 1.0 You Are (Not) Alone", titleEnglish: "Evangelion: 1.0 You Are (Not) Alone", titleJapanese: "ヱヴァンゲリヲン新劇場版:序",
    synopsis: "The first Rebuild of Evangelion film retelling the beginning of the series.",
    poster: "https://cdn.myanimelist.net/images/anime/7/74975l.jpg", banner: "https://cdn.myanimelist.net/images/anime/7/74975l.jpg",
    type: "Movie", status: "Finished Airing", score: 8.0, scoredBy: 350000, rank: 350, popularity: 300, members: 500000,
    year: 2007, season: null, genres: ["Action", "Award Winning", "Drama", "Sci-Fi"], studios: ["Gainax"],
    episodeCount: 1, duration: "1 hr 41 min", rating: "R - 17+ (violence & profanity)", source: "Original", isFeatured: true,
    episodeSources: [{ startEp: 1, endEp: 1, collection: "eva-complete-series-movies-bd-1080p", fileName: "Evangelion_1.11_You_Are_(Not)_Alone_(2009)_[1080p,BluRay,x264,DTS-ES]_-_THORA/Evangelion_1.11_You_Are_(Not)_Alone_(2009)_[1080p,BluRay,x264,DTS-ES]_-_THORA.mp4", audio: "sub" }],
  },
  // Eva 3.0+1.0
  { malId: 3786, title: "Evangelion: 3.0+1.0 Thrice Upon a Time", titleEnglish: "Evangelion: 3.0+1.0 Thrice Upon a Time", titleJapanese: "シン・エヴァンゲリオン劇場版:||",
    synopsis: "The final installment of the Rebuild of Evangelion tetralogy.",
    poster: "https://cdn.myanimelist.net/images/anime/1422/113533l.jpg", banner: "https://cdn.myanimelist.net/images/anime/1422/113533l.jpg",
    type: "Movie", status: "Finished Airing", score: 8.58, scoredBy: 300000, rank: 45, popularity: 400, members: 400000,
    year: 2021, season: null, genres: ["Action", "Award Winning", "Drama", "Sci-Fi"], studios: ["Studio Khara"],
    episodeCount: 1, duration: "2 hr 35 min", rating: "R - 17+ (violence & profanity)", source: "Original", isFeatured: true,
    episodeSources: [{ startEp: 1, endEp: 1, collection: "eva-complete-series-movies-bd-1080p", fileName: "Evangelion.3.0+1.01.Thrice.Upon.a.Time.2021.1080p.AMZN.WEB-DL.DD+.5.1.H.264-RMB.mp4", audio: "sub" }],
  },
  // A Silent Voice
  { malId: 28851, title: "A Silent Voice", titleEnglish: "A Silent Voice", titleJapanese: "聲の形",
    synopsis: "As a wild youth, Shouya Ishida bullied the deaf Shouko Nishimiya. Years later, he tracks her down to make amends.",
    poster: "https://cdn.myanimelist.net/images/anime/1122/96435l.jpg", banner: "https://cdn.myanimelist.net/images/anime/1122/96435l.jpg",
    type: "Movie", status: "Finished Airing", score: 8.93, scoredBy: 600000, rank: 10, popularity: 40, members: 900000,
    year: 2016, season: null, genres: ["Award Winning", "Drama", "Romance"], studios: ["Kyoto Animation"],
    episodeCount: 1, duration: "2 hr 10 min", rating: "R - 17+ (violence & profanity)", source: "Manga", isFeatured: true,
    // The MP4 derivative only contains the English dub audio (stream 1 = eng).
    // The MKV has both English and Japanese audio, but browsers can't play MKV.
    // So this file is DUB-only. hasDub=true so the player shows the DUB toggle.
    // For SUB mode, no JP-audio MP4 source is currently available.
    episodeSources: [{ startEp: 1, endEp: 1, collection: "db-a-silent-voice-dual-audio-10bit-bd-1080p-x-265", fileName: "[DB]A Silent Voice_-_(Dual Audio_10bit_BD1080p_x265).mp4", audio: "dub" }], hasDub: true,
  },
  // Your Name
  { malId: 32281, title: "Your Name", titleEnglish: "Your Name.", titleJapanese: "君の名は。",
    synopsis: "Mitsuha and Taki mysteriously swap bodies and must navigate each other's lives.",
    poster: "https://cdn.myanimelist.net/images/anime/5/87048l.jpg", banner: "https://cdn.myanimelist.net/images/anime/5/87048l.jpg",
    type: "Movie", status: "Finished Airing", score: 8.82, scoredBy: 1000000, rank: 14, popularity: 7, members: 2000000,
    year: 2016, season: null, genres: ["Award Winning", "Drama", "Supernatural"], studios: ["CoMix Wave Films"],
    episodeCount: 1, duration: "1 hr 46 min", rating: "PG-13 - Teens 13 or older", source: "Original", isFeatured: true,
    episodeSources: [{ startEp: 1, endEp: 1, collection: "your.-name.-2016.-1.8-gb.-1080p.-dual.-audio.-hin-eng.-vegamovies.-nl", fileName: "Your.Name.(2016).1.8GB.1080p.Dual.Audio.(Hin-Eng).Vegamovies.NL.mp4", audio: "dub" }],
    hasDub: true,
  },
  // 100 Girlfriends S1
  { malId: 54714, title: "The 100 Girlfriends Who Really, Really, Really, Really, Really Love You", titleEnglish: "The 100 Girlfriends Who Really, Really, Really, Really, Really Love You", titleJapanese: "君のことが大大大大大好きな100人の彼女",
    synopsis: "Rentarou Aijou has it all: looks, intelligence, athletic skill, and popularity with peers and mentors alike. Unfortunately, none of these qualities help Rentarou with his love life. On the day of his middle school graduation, he ends up confessing his love to the girl he likes and gets rejected. This marks his 100th rejection in a row.",
    poster: "https://cdn.myanimelist.net/images/anime/1812/136764l.jpg", banner: "https://cdn.myanimelist.net/images/anime/1812/136764l.jpg",
    type: "TV", status: "Finished Airing", score: 7.67, scoredBy: 500000, rank: 0, popularity: 500, members: 800000,
    year: 2023, season: "fall", genres: ["Comedy", "Romance"], studios: ["Bibury Animation Studios"],
    episodeCount: 12, duration: "23 min per ep", rating: "PG-13 - Teens 13 or older", source: "Manga", isFeatured: true,
    episodeSources: [
      { startEp: 1, endEp: 1, collection: "dropbox", fileName: "https://www.dropbox.com/scl/fi/a25ireq1khtgx7moggxu8/AnimePahe_Kimi_no_Koto_ga_Daidaidaidaidaisuki_na_100-nin_no_Kanojo_-_01_BD_1080p_YURASUKA.mp4?rlkey=ebxvj9r1hj1xzcgpu22s2a6ea&st=ertiqkyn&dl=1", audio: "sub" },
      { startEp: 2, endEp: 2, collection: "dropbox", fileName: "https://www.dropbox.com/scl/fi/phdlkmwb07v7stmzffrt9/AnimePahe_Kimi_no_Koto_ga_Daidaidaidaidaisuki_na_100-nin_no_Kanojo_-_02_BD_1080p_YURASUKA.mp4?rlkey=m8aqfh9kczydutkdp2kamk2z4&st=ozari3vm&dl=1", audio: "sub" },
      { startEp: 3, endEp: 3, collection: "dropbox", fileName: "https://www.dropbox.com/scl/fi/igqxmc7uogzplma6pxqq6/AnimePahe_Kimi_no_Koto_ga_Daidaidaidaidaisuki_na_100-nin_no_Kanojo_-_03_BD_1080p_YURASUKA.mp4?rlkey=7v53cv1j2km3iiflp6t7vx8zt&st=3v26cmm8&dl=1", audio: "sub" },
      { startEp: 4, endEp: 4, collection: "dropbox", fileName: "https://www.dropbox.com/scl/fi/k08zvy7xmk1wqxhm8rhbl/AnimePahe_Kimi_no_Koto_ga_Daidaidaidaidaisuki_na_100-nin_no_Kanojo_-_04_BD_1080p_YURASUKA.mp4?rlkey=5a9gk38z2dbcx3u3j322tme7k&st=op2zj9fn&dl=1", audio: "sub" },
      { startEp: 5, endEp: 5, collection: "dropbox", fileName: "https://www.dropbox.com/scl/fi/mrtxis3n90vp908viqmit/AnimePahe_Kimi_no_Koto_ga_Daidaidaidaidaisuki_na_100-nin_no_Kanojo_-_05_BD_1080p_YURASUKA.mp4?rlkey=71augiyidvqu01d8nata6j8jp&st=492gb3j1&dl=1", audio: "sub" },
      { startEp: 6, endEp: 6, collection: "dropbox", fileName: "https://www.dropbox.com/scl/fi/l2kx63gt1e24zez1g82ma/AnimePahe_Kimi_no_Koto_ga_Daidaidaidaidaisuki_na_100-nin_no_Kanojo_-_06_BD_1080p_YURASUKA.mp4?rlkey=8cfczn60ksctdhu35vvjdv5as&st=a6tsow5s&dl=1", audio: "sub" },
      { startEp: 7, endEp: 7, collection: "dropbox", fileName: "https://www.dropbox.com/scl/fi/xtvqo8mwg4rwp6zx9lctg/AnimePahe_Kimi_no_Koto_ga_Daidaidaidaidaisuki_na_100-nin_no_Kanojo_-_07_BD_1080p_YURASUKA.mp4?rlkey=3m6ubi5ef76zre94mwuqib798&st=uhb944vk&dl=1", audio: "sub" },
      { startEp: 8, endEp: 8, collection: "dropbox", fileName: "https://www.dropbox.com/scl/fi/yxzk902zd0cbdzfgvdya9/AnimePahe_Kimi_no_Koto_ga_Daidaidaidaidaisuki_na_100-nin_no_Kanojo_-_08_BD_1080p_YURASUKA.mp4?rlkey=tbrwgtfceety5o523i27dmva6&st=7qb7pd3i&dl=1", audio: "sub" },
      { startEp: 9, endEp: 9, collection: "dropbox", fileName: "https://www.dropbox.com/scl/fi/zjfaz2icrvtqbro958n72/AnimePahe_Kimi_no_Koto_ga_Daidaidaidaidaisuki_na_100-nin_no_Kanojo_-_09_BD_1080p_YURASUKA.mp4?rlkey=xd5wp0ptijprp6vkzizg1qf4a&st=zumnm87p&dl=1", audio: "sub" },
      { startEp: 10, endEp: 10, collection: "dropbox", fileName: "https://www.dropbox.com/scl/fi/s3gakgodzynzy8hw2k8mt/AnimePahe_Kimi_no_Koto_ga_Daidaidaidaidaisuki_na_100-nin_no_Kanojo_-_10_BD_1080p_YURASUKA.mp4?rlkey=ietjqhqdfakylcx3jrya1yuef&st=6jigwevm&dl=1", audio: "sub" },
      { startEp: 11, endEp: 11, collection: "dropbox", fileName: "https://www.dropbox.com/scl/fi/ldia1xo5gdnq0uss0pw10/AnimePahe_Kimi_no_Koto_ga_Daidaidaidaidaisuki_na_100-nin_no_Kanojo_-_11_BD_1080p_YURASUKA.mp4?rlkey=k04m1ubizxi9j3o0l8jn26v2n&st=asbjey99&dl=1", audio: "sub" },
      { startEp: 12, endEp: 12, collection: "dropbox", fileName: "https://www.dropbox.com/scl/fi/wwgv7agou1a3bioa09nfl/AnimePahe_Kimi_no_Koto_ga_Daidaidaidaidaisuki_na_100-nin_no_Kanojo_-_12_BD_1080p_YURASUKA.mp4?rlkey=ce8xwm70qzy2r41j2id7w9z9p&st=gt2zfgas&dl=1", audio: "sub" },
    ],
  },
  // 100 Girlfriends S2
  { malId: 57616, title: "The 100 Girlfriends Who Really, Really, Really, Really, Really Love You Season 2", titleEnglish: "The 100 Girlfriends Who Really, Really, Really, Really, Really Love You Season 2", titleJapanese: "君のことが大大大大大好きな100人の彼女 2期",
    synopsis: "Second season of The 100 Girlfriends Who Really, Really, Really, Really, Really Love You. Rentarou continues to meet more of his 100 soulmates.",
    poster: "https://cdn.myanimelist.net/images/anime/1093/145470l.jpg", banner: "https://cdn.myanimelist.net/images/anime/1093/145470l.jpg",
    type: "TV", status: "Finished Airing", score: 7.87, scoredBy: 300000, rank: 0, popularity: 700, members: 500000,
    year: 2025, season: "winter", genres: ["Comedy", "Romance"], studios: ["Bibury Animation Studios"],
    episodeCount: 12, duration: "23 min per ep", rating: "PG-13 - Teens 13 or older", source: "Manga",
    episodeSources: [],
  },
  // 100 Girlfriends S3
  { malId: 62811, title: "The 100 Girlfriends Who Really, Really, Really, Really, Really Love You Season 3", titleEnglish: "The 100 Girlfriends Who Really, Really, Really, Really, Really Love You Season 3", titleJapanese: "君のことが大大大大大好きな100人の彼女 3期",
    synopsis: "Third season of The 100 Girlfriends Who Really, Really, Really, Really, Really Love You.",
    poster: "https://cdn.myanimelist.net/images/anime/1106/157174l.jpg", banner: "https://cdn.myanimelist.net/images/anime/1106/157174l.jpg",
    type: "TV", status: "Currently Airing", score: 0, scoredBy: 0, rank: 0, popularity: 1000, members: 100000,
    year: 2026, season: "summer", genres: ["Comedy", "Romance"], studios: ["Bibury Animation Studios"],
    episodeCount: 12, duration: "23 min per ep", rating: "PG-13 - Teens 13 or older", source: "Manga",
    episodeSources: [
      { startEp: 1, endEp: 1, collection: "dropbox", fileName: "https://www.dropbox.com/scl/fi/4ikt9w93moutar909dq2r/AnimePahe_Kimi_no_Koto_ga_Daidaidaidaidaisuki_na_100-nin_no_Kanojo_-_25_1080p_SubsPlease.mp4?rlkey=pu7b995o3l529vicp42d8uitp&st=md10iehv&dl=1", audio: "sub" },
    ],
  },
  // Me and You Are Polar Opposites S1
  { malId: 60371, title: "Me and You Are Polar Opposites", titleEnglish: "Me and You Are Polar Opposites", titleJapanese: "正反対な君と僕",
    synopsis: "Miyu Suzuki is a high school girl whose cheerful outlook on life is tempered by her need to fit in. Beside her sits Yusuke Tani, her polar opposite. Despite their differences, the two find themselves drawn to each other.",
    poster: "https://cdn.myanimelist.net/images/anime/1140/154457l.jpg", banner: "https://cdn.myanimelist.net/images/anime/1140/154457l.jpg",
    type: "TV", status: "Finished Airing", score: 8.28, scoredBy: 50000, rank: 0, popularity: 600, members: 200000,
    year: 2026, season: "winter", genres: ["Comedy", "Romance"], studios: ["Lapin Track"],
    episodeCount: 12, duration: "23 min per ep", rating: "PG-13 - Teens 13 or older", source: "Manga", isFeatured: true,
    episodeSources: [],
  },
  // Me and You Are Polar Opposites S2
  { malId: 63832, title: "Me and You Are Polar Opposites Season 2", titleEnglish: "Me and You Are Polar Opposites Season 2", titleJapanese: "正反対な君と僕 第2期",
    synopsis: "Second season of Me and You Are Polar Opposites.",
    poster: "https://cdn.myanimelist.net/images/anime/1143/158409l.jpg", banner: "https://cdn.myanimelist.net/images/anime/1143/158409l.jpg",
    type: "TV", status: "Currently Airing", score: 8.03, scoredBy: 30000, rank: 0, popularity: 800, members: 100000,
    year: 2026, season: "summer", genres: ["Comedy", "Romance"], studios: ["Lapin Track"],
    episodeCount: 13, duration: "23 min per ep", rating: "PG-13 - Teens 13 or older", source: "Manga",
    episodeSources: [
      { startEp: 1, endEp: 1, collection: "dropbox", fileName: "https://www.dropbox.com/scl/fi/6yxbhkr3tt6e2q7ix7umw/AnimePahe_Seihantai_na_Kimi_to_Boku_-_13_1080p_SubsPlease.mp4?rlkey=k15xut763opcnqgaad6vs2r7j&st=cw2pcp6j&dl=1", audio: "sub" },
    ],
  },
  // Prison School (Uncensored)
  { malId: 30240, title: "Prison School (Uncensored)", titleEnglish: "Prison School (Uncensored)", titleJapanese: "監獄学園〈プリズンスクール〉",
    synopsis: "Located on the outskirts of Tokyo, Hachimitsu Private Academy is a prestigious all-girls boarding school. However, this is about to change with the revision of the school's traditional policy: for the first time, boys are being accepted.",
    poster: "https://cdn.myanimelist.net/images/anime/1286/112161l.jpg", banner: "https://cdn.myanimelist.net/images/anime/1286/112161l.jpg",
    type: "TV", status: "Finished Airing", score: 7.58, scoredBy: 600000, rank: 0, popularity: 300, members: 1200000,
    year: 2015, season: "summer", genres: ["Comedy", "Ecchi"], studios: ["J.C.Staff"],
    episodeCount: 12, duration: "24 min per ep", rating: "R+ - Mild Nudity", source: "Manga", isFeatured: true,
    episodeSources: [
      { startEp: 1, endEp: 1, collection: "Prison-School-", fileName: "Prison School [Dubbed] [Uncensored] [720p]/Episode 01 - The Peep Job.mp4", audio: "dub" },
      { startEp: 2, endEp: 2, collection: "Prison-School-", fileName: "Prison School [Dubbed] [Uncensored] [720p]/Episode 02 - The Man Who Viewed Too Much.mp4", audio: "dub" },
      { startEp: 3, endEp: 3, collection: "Prison-School-", fileName: "Prison School [Dubbed] [Uncensored] [720p]/Episode 03 - A Mighty Spurt.mp4", audio: "dub" },
      { startEp: 4, endEp: 4, collection: "Prison-School-", fileName: "Prison School [Dubbed] [Uncensored] [720p]/Episode 04 - Take Me Out to the Sumoland.mp4", audio: "dub" },
      { startEp: 5, endEp: 5, collection: "Prison-School-", fileName: "Prison School [Dubbed] [Uncensored] [720p]/Episode 05 - The School's Number One Most Treacherous Man.mp4", audio: "dub" },
      { startEp: 6, endEp: 6, collection: "Prison-School-", fileName: "Prison School [Dubbed] [Uncensored] [720p]/Episode 06 - Vengeance is Hana's.mp4", audio: "dub" },
      { startEp: 7, endEp: 7, collection: "Prison-School-", fileName: "Prison School [Dubbed] [Uncensored] [720p]/Episode 07 Meiko's Delicious Restaurant.mp4", audio: "dub" },
      { startEp: 8, endEp: 8, collection: "Prison-School-", fileName: "Prison School [Dubbed] [Uncensored] [720p]/Episode 08 - The Diary of Andre.mp4", audio: "dub" },
      { startEp: 9, endEp: 9, collection: "Prison-School-", fileName: "Prison School [Dubbed] [Uncensored] [720p]/Episode 09 - Full of Bodily Fluids.mp4", audio: "dub" },
      { startEp: 10, endEp: 10, collection: "Prison-School-", fileName: "Prison School [Dubbed] [Uncensored] [720p]/Episode 10 - It's a Bum-derful Life.mp4", audio: "dub" },
      { startEp: 11, endEp: 11, collection: "Prison-School-", fileName: "Prison School [Dubbed] [Uncensored] [720p]/Episode 11 - Eryngii Brockovich.mp4", audio: "dub" },
      { startEp: 12, endEp: 12, collection: "Prison-School-", fileName: "Prison School [Dubbed] [Uncensored] [720p]/Episode 12 - Good Morning, Prison.mp4", audio: "dub" },
    ], hasDub: true,
  },
  // The Apothecary Diaries S2 (Top 10 #10)
  { malId: 58514, title: "The Apothecary Diaries Season 2", titleEnglish: "The Apothecary Diaries Season 2", titleJapanese: "薬屋のひとりごと 第2期",
    synopsis: "Maomao, a pharmacist in the imperial court, continues to solve mysteries and navigate palace politics in ancient China.",
    poster: "https://cdn.myanimelist.net/images/anime/1025/147458l.jpg", banner: "https://cdn.myanimelist.net/images/anime/1025/147458l.jpg",
    type: "TV", status: "Finished Airing", score: 8.91, scoredBy: 300000, rank: 0, popularity: 200, members: 600000,
    year: 2025, season: "winter", genres: ["Drama", "Mystery", "Romance"], studios: ["OLM"],
    episodeCount: 24, duration: "24 min per ep", rating: "PG-13 - Teens 13 or older", source: "Light novel", isFeatured: true,
    episodeSources: [
      { startEp: 1, endEp: 24, collection: "the-apothecary-diaries-s-2", fileTemplate: "The Apothecary Diaries S2Ep{ep}.mp4", audio: "dub" },
    ], hasDub: true,
  },
  // Haikyuu!! S3 (Top 10 #7)
  { malId: 32935, title: "Haikyuu!! Karasuno vs Shiratorizawa", titleEnglish: "Haikyuu!! Third Season", titleJapanese: "ハイキュー!! 烏野高校 VS 白鳥沢学園高校",
    synopsis: "Karasuno High School's volleyball team faces Shiratorizawa Academy in the Miyagi Prefecture finals for a spot in the national tournament.",
    poster: "https://cdn.myanimelist.net/images/anime/7/81992l.jpg", banner: "https://cdn.myanimelist.net/images/anime/7/81992l.jpg",
    type: "TV", status: "Finished Airing", score: 8.77, scoredBy: 400000, rank: 0, popularity: 400, members: 800000,
    year: 2016, season: "fall", genres: ["Award Winning", "Sports"], studios: ["Production I.G"],
    episodeCount: 10, duration: "24 min per ep", rating: "PG-13 - Teens 13 or older", source: "Manga", isFeatured: true,
    episodeSources: [
      { startEp: 1, endEp: 10, collection: "haikyuu-karasuno-koukou-vs.-shiratorizawa-gakuen-koukou-dub-episode-4", fileTemplate: "Season 3/Haikyuu!! Karasuno Koukou vs. Shiratorizawa Gakuen Koukou (Dub) Episode {ep}.mp4", audio: "dub" },
    ], hasDub: true,
  },
  // Haikyuu!! S1
  { malId: 20583, title: "Haikyuu!!", titleEnglish: "Haikyuu!!", titleJapanese: "ハイキュー!!",
    synopsis: "Shoyo Hinata, a short but passionate volleyball player, joins Karasuno High School's volleyball team and aims to compete at the national level.",
    poster: "https://cdn.myanimelist.net/images/anime/7/76014l.jpg", banner: "https://cdn.myanimelist.net/images/anime/7/76014l.jpg",
    type: "TV", status: "Finished Airing", score: 8.47, scoredBy: 900000, rank: 0, popularity: 50, members: 1800000,
    year: 2014, season: "spring", genres: ["Award Winning", "Sports"], studios: ["Production I.G"],
    episodeCount: 25, duration: "24 min per ep", rating: "PG-13 - Teens 13 or older", source: "Manga", isFeatured: true,
    episodeSources: [
      { startEp: 1, endEp: 25, collection: "haikyuu-dub-episode-23_20250823", fileTemplate: "Season 1/Haikyuu!! (Dub) Episode {ep}.mp4", audio: "dub" },
    ], hasDub: true,
  },
  // Haikyuu!! S2 — correct malId is 28891 (20584 is a different anime)
  { malId: 28891, title: "Haikyuu!! Second Season", titleEnglish: "Haikyuu!! Second Season", titleJapanese: "ハイキュー!! セカンドシーズン",
    synopsis: "Karasuno continues their training and competes in the summer tournament, facing new rivals and growing stronger.",
    poster: "https://cdn.myanimelist.net/images/anime/9/76662l.jpg", banner: "https://cdn.myanimelist.net/images/anime/9/76662l.jpg",
    type: "TV", status: "Finished Airing", score: 8.54, scoredBy: 700000, rank: 0, popularity: 80, members: 1400000,
    year: 2015, season: "fall", genres: ["Award Winning", "Sports"], studios: ["Production I.G"],
    episodeCount: 25, duration: "24 min per ep", rating: "PG-13 - Teens 13 or older", source: "Manga",
    episodeSources: [
      { startEp: 1, endEp: 25, collection: "haikyuu-second-season-dub-episode-21", fileTemplate: "Season 2/Haikyuu!! Second Season (Dub) Episode {ep}.mp4", audio: "dub" },
    ], hasDub: true,
  },
  // Haikyuu!! S4 — To the Top (correct malId 38883; 38500 was a music video)
  { malId: 38883, title: "Haikyuu!! To the Top", titleEnglish: "Haikyuu!! To the Top", titleJapanese: "ハイキュー!! TO THE TOP",
    synopsis: "After their victory over Shiratorizawa, Karasuno heads to the national tournament in Tokyo.",
    poster: "/posters/haikyuu-to-the-top.jpg", banner: "/posters/haikyuu-to-the-top.jpg",
    type: "TV", status: "Finished Airing", score: 8.24, scoredBy: 500000, rank: 0, popularity: 120, members: 1000000,
    year: 2020, season: "winter", genres: ["Award Winning", "Sports"], studios: ["Production I.G"],
    episodeCount: 13, duration: "24 min per ep", rating: "PG-13 - Teens 13 or older", source: "Manga",
    episodeSources: [
      { startEp: 1, endEp: 13, collection: "haikyuu-to-the-top-dub-episode-11", fileTemplate: "Season 4 - Part 1/Haikyuu!! To the Top (Dub) Episode {ep}.mp4", audio: "dub" },
    ], hasDub: true,
  },
  // The Apothecary Diaries S1
  { malId: 52412, title: "The Apothecary Diaries", titleEnglish: "The Apothecary Diaries", titleJapanese: "薬屋のひとりごと",
    synopsis: "Maomao, a young pharmacist kidnapped and sold to the imperial palace, uses her knowledge of medicine and poisons to solve mysteries.",
    poster: "https://cdn.myanimelist.net/images/anime/1708/138033l.jpg", banner: "https://cdn.myanimelist.net/images/anime/1708/138033l.jpg",
    type: "TV", status: "Finished Airing", score: 8.83, scoredBy: 800000, rank: 0, popularity: 15, members: 1500000,
    year: 2023, season: "fall", genres: ["Award Winning", "Drama", "Mystery", "Romance"], studios: ["OLM"],
    episodeCount: 24, duration: "24 min per ep", rating: "PG-13 - Teens 13 or older", source: "Light novel", isFeatured: true,
    episodeSources: [
      { startEp: 1, endEp: 1, collection: "anime-pahe-kusuriya-no-hitorigoto-eng-dub-01-bd-720p-sam.mp-4-kw", fileName: "AnimePahe_Kusuriya_no_Hitorigoto_Eng_Dub_-_01_BD_720p_sam.mp4 Kw.mp4", audio: "dub" },
      { startEp: 2, endEp: 24, collection: "anime-pahe-kusuriya-no-hitorigoto-eng-dub-01-bd-720p-sam.mp-4-kw", fileTemplate: "AnimePahe_Kusuriya_no_Hitorigoto_Eng_Dub_-_{ep:02}_BD_720p_sam.mp4", audio: "dub" },
    ], hasDub: true,
  },
  // Fushigi Yuugi
  { malId: 123, title: "Fushigi Yuugi", titleEnglish: "Fushigi Yuugi", titleJapanese: "ふしぎ遊戯",
    synopsis: "Two friends are transported into a mysterious book and find themselves in ancient China, destined to become priestesses of rival kingdoms.",
    poster: "https://cdn.myanimelist.net/images/anime/1281/101838l.jpg", banner: "https://cdn.myanimelist.net/images/anime/1281/101838l.jpg",
    type: "TV", status: "Finished Airing", score: 7.60, scoredBy: 200000, rank: 0, popularity: 800, members: 400000,
    year: 1995, season: "spring", genres: ["Action", "Adventure", "Fantasy", "Romance"], studios: ["Studio Pierrot"],
    episodeCount: 52, duration: "24 min per ep", rating: "PG-13 - Teens 13 or older", source: "Manga",
    episodeSources: [
      { startEp: 1, endEp: 52, collection: "Cartoons-and-Anime", fileTemplate: "Fushigi Yugi (1995)/Fushigi Yuugi - 4x3 - S01E{ep:02}.mp4", audio: "dub" },
    ], hasDub: true,
  },
  // Great Teacher Onizuka
  { malId: 245, title: "Great Teacher Onizuka", titleEnglish: "Great Teacher Onizuka", titleJapanese: "GTO",
    synopsis: "Former gang leader Eikichi Onizuka becomes a teacher at a troubled middle school, using unconventional methods to reach his students.",
    poster: "https://cdn.myanimelist.net/images/anime/13/11460l.jpg", banner: "https://cdn.myanimelist.net/images/anime/13/11460l.jpg",
    type: "TV", status: "Finished Airing", score: 8.68, scoredBy: 400000, rank: 0, popularity: 200, members: 800000,
    year: 1999, season: "summer", genres: ["Comedy"], studios: ["Studio Pierrot"],
    episodeCount: 43, duration: "24 min per ep", rating: "R - 17+ (violence & profanity)", source: "Manga", isFeatured: true,
    episodeSources: [
      { startEp: 1, endEp: 43, collection: "Cartoons-and-Anime", fileTemplate: "Great Teacher Onizuka (1999)/Great Teacher Onizuka S01E{ep:02} - 4x3.mp4", audio: "dub" },
    ], hasDub: true,
  },
  // Nadia: The Secret of Blue Water
  { malId: 1251, title: "Nadia: The Secret of Blue Water", titleEnglish: "Nadia: The Secret of Blue Water", titleJapanese: "ふしぎの海のナディア",
    synopsis: "A young acrobat and an inventor boy uncover the secrets of the mysterious Blue Water jewel while pursued by villains.",
    poster: "https://cdn.myanimelist.net/images/anime/1750/118570l.jpg", banner: "https://cdn.myanimelist.net/images/anime/1750/118570l.jpg",
    type: "TV", status: "Finished Airing", score: 7.52, scoredBy: 100000, rank: 0, popularity: 1000, members: 250000,
    year: 1990, season: "spring", genres: ["Adventure", "Comedy", "Romance", "Sci-Fi"], studios: ["Gainax"],
    episodeCount: 39, duration: "24 min per ep", rating: "PG-13 - Teens 13 or older", source: "Original",
    episodeSources: [
      { startEp: 1, endEp: 1, collection: "Cartoons-and-Anime", fileName: "Nadia - The Secret of Blue Water (1990)/Nadia - The Secret of Blue Water S01E01 - The Girl at the Eiffel Tower.mp4", audio: "dub" },
      { startEp: 2, endEp: 2, collection: "Cartoons-and-Anime", fileName: "Nadia - The Secret of Blue Water (1990)/Nadia - The Secret of Blue Water S01E02 - The Little Fugitive.mp4", audio: "dub" },
      { startEp: 3, endEp: 3, collection: "Cartoons-and-Anime", fileName: "Nadia - The Secret of Blue Water (1990)/Nadia - The Secret of Blue Water S01E03 - The Riddle of the Giant Sea Monsters.mp4", audio: "dub" },
      { startEp: 4, endEp: 4, collection: "Cartoons-and-Anime", fileName: "Nadia - The Secret of Blue Water (1990)/Nadia - The Secret of Blue Water S01E04 - Nautilus, the Fantastic Submarine.mp4", audio: "dub" },
      { startEp: 5, endEp: 5, collection: "Cartoons-and-Anime", fileName: "Nadia - The Secret of Blue Water (1990)/Nadia - The Secret of Blue Water S01E05 - Marie`s Island.mp4", audio: "dub" },
      { startEp: 6, endEp: 6, collection: "Cartoons-and-Anime", fileName: "Nadia - The Secret of Blue Water (1990)/Nadia - The Secret of Blue Water S01E06 - Infiltration of the Secret Base.mp4", audio: "dub" },
      { startEp: 7, endEp: 7, collection: "Cartoons-and-Anime", fileName: "Nadia - The Secret of Blue Water (1990)/Nadia - The Secret of Blue Water S01E07 - The Tower of Babel.mp4", audio: "dub" },
      { startEp: 8, endEp: 8, collection: "Cartoons-and-Anime", fileName: "Nadia - The Secret of Blue Water (1990)/Nadia - The Secret of Blue Water S01E08 - Mission to Rescue Nadia.mp4", audio: "dub" },
      { startEp: 9, endEp: 9, collection: "Cartoons-and-Anime", fileName: "Nadia - The Secret of Blue Water (1990)/Nadia - The Secret of Blue Water S01E09 - Nemo`s Secret.mp4", audio: "dub" },
      { startEp: 10, endEp: 10, collection: "Cartoons-and-Anime", fileName: "Nadia - The Secret of Blue Water (1990)/Nadia - The Secret of Blue Water S01E10 - A Crowning Performance by the Gratan.mp4", audio: "dub" },
      { startEp: 11, endEp: 11, collection: "Cartoons-and-Anime", fileName: "Nadia - The Secret of Blue Water (1990)/Nadia - The Secret of Blue Water S01E11 - New Recruits for the Nautilus.mp4", audio: "dub" },
      { startEp: 12, endEp: 12, collection: "Cartoons-and-Anime", fileName: "Nadia - The Secret of Blue Water (1990)/Nadia - The Secret of Blue Water S01E12 - Grandis and Her First Love.mp4", audio: "dub" },
      { startEp: 13, endEp: 13, collection: "Cartoons-and-Anime", fileName: "Nadia - The Secret of Blue Water (1990)/Nadia - The Secret of Blue Water S01E13 - Run Marie Run!.mp4", audio: "dub" },
      { startEp: 14, endEp: 14, collection: "Cartoons-and-Anime", fileName: "Nadia - The Secret of Blue Water (1990)/Nadia - The Secret of Blue Water S01E14 - The Valley of Dinicthys.mp4", audio: "dub" },
      { startEp: 15, endEp: 15, collection: "Cartoons-and-Anime", fileName: "Nadia - The Secret of Blue Water (1990)/Nadia - The Secret of Blue Water S01E15 - The Nautilus Faces Its Biggest Crisis.mp4", audio: "dub" },
      { startEp: 16, endEp: 16, collection: "Cartoons-and-Anime", fileName: "Nadia - The Secret of Blue Water (1990)/Nadia - The Secret of Blue Water S01E16 - The Mystery of the Lost Continent.mp4", audio: "dub" },
      { startEp: 17, endEp: 17, collection: "Cartoons-and-Anime", fileName: "Nadia - The Secret of Blue Water (1990)/Nadia - The Secret of Blue Water S01E17 - Jean`s New Invention.mp4", audio: "dub" },
      { startEp: 18, endEp: 18, collection: "Cartoons-and-Anime", fileName: "Nadia - The Secret of Blue Water (1990)/Nadia - The Secret of Blue Water S01E18 - Nautilus vs Nautilus.mp4", audio: "dub" },
      { startEp: 19, endEp: 19, collection: "Cartoons-and-Anime", fileName: "Nadia - The Secret of Blue Water (1990)/Nadia - The Secret of Blue Water S01E19 - Nemo`s Best Friend.mp4", audio: "dub" },
      { startEp: 20, endEp: 20, collection: "Cartoons-and-Anime", fileName: "Nadia - The Secret of Blue Water (1990)/Nadia - The Secret of Blue Water S01E20 - Jean Makes a Mistake.mp4", audio: "dub" },
      { startEp: 21, endEp: 21, collection: "Cartoons-and-Anime", fileName: "Nadia - The Secret of Blue Water (1990)/Nadia - The Secret of Blue Water S01E21 - Farewell Nautilus.mp4", audio: "dub" },
      { startEp: 22, endEp: 22, collection: "Cartoons-and-Anime", fileName: "Nadia - The Secret of Blue Water (1990)/Nadia - The Secret of Blue Water S01E22 - Electra the Traitor.mp4", audio: "dub" },
      { startEp: 23, endEp: 23, collection: "Cartoons-and-Anime", fileName: "Nadia - The Secret of Blue Water (1990)/Nadia - The Secret of Blue Water S01E23 - Young Drifters.mp4", audio: "dub" },
      { startEp: 24, endEp: 24, collection: "Cartoons-and-Anime", fileName: "Nadia - The Secret of Blue Water (1990)/Nadia - The Secret of Blue Water S01E24 - Lincoln Island.mp4", audio: "dub" },
      { startEp: 25, endEp: 25, collection: "Cartoons-and-Anime", fileName: "Nadia - The Secret of Blue Water (1990)/Nadia - The Secret of Blue Water S01E25 - The First kiss.mp4", audio: "dub" },
      { startEp: 26, endEp: 26, collection: "Cartoons-and-Anime", fileName: "Nadia - The Secret of Blue Water (1990)/Nadia - The Secret of Blue Water S01E26 - King, the Lonely Lion.mp4", audio: "dub" },
      { startEp: 27, endEp: 27, collection: "Cartoons-and-Anime", fileName: "Nadia - The Secret of Blue Water (1990)/Nadia - The Secret of Blue Water S01E27 - The Island of the Witch.mp4", audio: "dub" },
      { startEp: 28, endEp: 28, collection: "Cartoons-and-Anime", fileName: "Nadia - The Secret of Blue Water (1990)/Nadia - The Secret of Blue Water S01E28 - The Floating Island.mp4", audio: "dub" },
      { startEp: 29, endEp: 29, collection: "Cartoons-and-Anime", fileName: "Nadia - The Secret of Blue Water (1990)/Nadia - The Secret of Blue Water S01E29 - King vs King.mp4", audio: "dub" },
      { startEp: 30, endEp: 30, collection: "Cartoons-and-Anime", fileName: "Nadia - The Secret of Blue Water (1990)/Nadia - The Secret of Blue Water S01E30 - Labyrinth in the Earth.mp4", audio: "dub" },
      { startEp: 31, endEp: 31, collection: "Cartoons-and-Anime", fileName: "Nadia - The Secret of Blue Water (1990)/Nadia - The Secret of Blue Water S01E31 - Farewell, Red Noah.mp4", audio: "dub" },
      { startEp: 32, endEp: 32, collection: "Cartoons-and-Anime", fileName: "Nadia - The Secret of Blue Water (1990)/Nadia - The Secret of Blue Water S01E32 - Nadia`s Love.mp4", audio: "dub" },
      { startEp: 33, endEp: 33, collection: "Cartoons-and-Anime", fileName: "Nadia - The Secret of Blue Water (1990)/Nadia - The Secret of Blue Water S01E33 - King`s Rescue.mp4", audio: "dub" },
      { startEp: 35, endEp: 35, collection: "Cartoons-and-Anime", fileName: "Nadia - The Secret of Blue Water (1990)/Nadia - The Secret of Blue Water S01E35 - The Secret of Blue Water.mp4", audio: "dub" },
      { startEp: 36, endEp: 36, collection: "Cartoons-and-Anime", fileName: "Nadia - The Secret of Blue Water (1990)/Nadia - The Secret of Blue Water S01E36 - The New Nautilus.mp4", audio: "dub" },
      { startEp: 37, endEp: 37, collection: "Cartoons-and-Anime", fileName: "Nadia - The Secret of Blue Water (1990)/Nadia - The Secret of Blue Water S01E37 - Emperor Neo.mp4", audio: "dub" },
      { startEp: 38, endEp: 38, collection: "Cartoons-and-Anime", fileName: "Nadia - The Secret of Blue Water (1990)/Nadia - The Secret of Blue Water S01E38 - To the Sky.mp4", audio: "dub" },
      { startEp: 39, endEp: 39, collection: "Cartoons-and-Anime", fileName: "Nadia - The Secret of Blue Water (1990)/Nadia - The Secret of Blue Water S01E39 - Successor of the Stars.mp4", audio: "dub" },
    ], hasDub: true,
  },
  // Shinzo
  { malId: 1372, title: "Shinzo", titleEnglish: "Shinzo", titleJapanese: "マシュランボー",
    synopsis: "In a post-apocalyptic world, a human girl and three cyborgs journey to find Shinzo, the last human sanctuary.",
    poster: "https://cdn.myanimelist.net/images/anime/4/16767l.jpg", banner: "https://cdn.myanimelist.net/images/anime/4/16767l.jpg",
    type: "TV", status: "Finished Airing", score: 7.30, scoredBy: 50000, rank: 0, popularity: 2000, members: 100000,
    year: 2000, season: "spring", genres: ["Action", "Adventure", "Sci-Fi"], studios: ["Studio Gallop"],
    episodeCount: 32, duration: "24 min per ep", rating: "PG-13 - Teens 13 or older", source: "Manga",
    episodeSources: [
      { startEp: 1, endEp: 32, collection: "Cartoons-and-Anime", fileTemplate: "Shinzo (2000)/Shinzo - S01E{ep:02} - 4x3.mp4", audio: "dub" },
    ], hasDub: true,
  },
  // Slayers — dual source: Japanese sub (Cartoons-and-Anime) + English dub
  // (The-Slayers-Season-1). User confirmed the audio was swapped: the
  // Cartoons-and-Anime source is Japanese audio and The-Slayers-Season-1
  // source is English dub. Swapped the labels accordingly.
  { malId: 534, title: "Slayers", titleEnglish: "Slayers", titleJapanese: "スレイヤーズ",
    synopsis: "The teenage sorceress Lina Inverse travels the world fighting bandits and monsters, accompanied by the swordsman Gourry.",
    poster: "https://cdn.myanimelist.net/images/anime/6/19870l.jpg", banner: "https://cdn.myanimelist.net/images/anime/6/19870l.jpg",
    type: "TV", status: "Finished Airing", score: 7.72, scoredBy: 150000, rank: 0, popularity: 700, members: 300000,
    year: 1995, season: "spring", genres: ["Action", "Adventure", "Comedy", "Fantasy"], studios: ["E&G Films"],
    episodeCount: 26, duration: "24 min per ep", rating: "PG-13 - Teens 13 or older", source: "Light novel",
    episodeSources: [
      // Japanese audio (sub) — from the Cartoons-and-Anime TV rip collection.
      { startEp: 1, endEp: 26, collection: "Cartoons-and-Anime", fileTemplate: "Slayers/Slayers - S01E{ep:02} - 4x3.mp4", audio: "sub" },
      // English dub — from The-Slayers-Season-1 collection.
      // Each episode file has the episode title baked into the filename.
      {
        startEp: 1, endEp: 26, collection: "The-Slayers-Season-1", audio: "dub",
        episodeFiles: {
          1: "(1) (NSSB) Slayers Episode 1 Angry Lina's Furious Dragon Slave!.mp4",
          2: "(2) (NSSB) Slayers Episode 2 Bad! Mummy Men Aren't My Type!.mp4",
          3: "(NSSB) Slayers Episode 3 Crash! Red and White and Suspicious All Over!.mp4",
          4: "(NSSB) Slayers Episode 4 Dash! Run for It! My Magic Doesn't Work!.mp4",
          5: "(NSSB) Slayers Episode 5 Escape! Noonsa, the Flaming Fish Man!.mp4",
          6: "(NSSB) Slayers Episode 6  Focus! Rezo's the Real Enemy!.mp4",
          7: "(NSSB) Slayers Episode 7 Give Up! But Just Before We Do, the Sure Kill Sword Appears!.mp4",
          8: "(NSSB) Slayers Episode 8 Help! Shabranigdu is Reborn!.mp4",
          9: "(NSSB) Slayers Episode 9 Impact! The Eve of the Great Life or Death Struggle!.mp4",
          10: "(NSSB) Slayers Episode 10 Jackpot! The Great Life or Death Gamble!.mp4",
          11: "(NSSB) Slayers Episode 11 Knockout! The Seyruun Family Feud!.mp4",
          12: "(NSSB) Slayers Episode 12 Lovely! Amelia's Magic Training!.mp4",
          13: "(NSSB) Slayers Episode 13 Money! Knock Out Those Bounty Hunters!.mp4",
          14: "(NSSB) Slayers Episode 14 Navigation! An Invitation to Sairaag!.mp4",
          15: "(NSSB) Slayers Episode 15 Oh No! Lina's Wedding Rhapsody.mp4",
          16: "(NSSB) Slayers Episode 16 Passion! Shall We Give Our Lives for the Stage.mp4",
          17: "(NSSB) Slayers Episode 17 Question He's Proposing to THAT Girl.mp4",
          18: "(NSSB) Slayers Episode 18 Return! The Red Priest is Back!.mp4",
          19: "(NSSB) Slayers Episode 19 Shock! Sairaag Falls!.mp4",
          20: "(NSSB) Slayers Episode 20 Trouble! Rahanimu, the Furious Fish Man!.mp4",
          21: "(NSSB) Slayers Episode 21 Upset! Gourry vs. Zangulus!.mp4",
          22: "(NSSB) Slayers Episode 22 Vice! The One Who Was Left Behind!.mp4",
          23: "(NSSB) Slayers Episode 23 Warning! Eris' Wrath!.mp4",
          24: "(NSSB) Slayers Episode 24 X-DAY! The Demon Beast Is Reborn!.mp4",
          25: "(NSSB) Slayers Episode 25 Yes A Final Hope The Blessed Blade.mp4",
          26: "(NSSB) Slayers Episode 26 Zap! Victory is Always Mine!.mp4",
        },
      },
    ], hasSub: true, hasDub: true, noSubtitles: true,
  },
  // Berserk (1997) — dual source: Japanese sub + English dub
  // The Cartoons-and-Anime source was previously mislabeled as "dub" but is
  // actually Japanese audio (verified via ASR). The berserk-1997-complete
  // collection is a Blu-Ray rip with English dub as the default audio track.
  // English dialogue VTT subtitles for the Japanese audio track are stored
  // locally at /public/subtitles/33_e{ep}.vtt (haiku BluRay release subs
  // downloaded from OpenSubtitles).
  { malId: 33, title: "Berserk", titleEnglish: "Berserk", titleJapanese: "ベルセルク",
    synopsis: "Guts, a wandering mercenary, joins the Band of the Hawk led by the charismatic Griffith, leading to a dark and tragic fate.",
    poster: "https://cdn.myanimelist.net/images/anime/1384/119988l.jpg", banner: "https://cdn.myanimelist.net/images/anime/1384/119988l.jpg",
    type: "TV", status: "Finished Airing", score: 8.61, scoredBy: 700000, rank: 0, popularity: 100, members: 1400000,
    year: 1997, season: "fall", genres: ["Action", "Adventure", "Drama", "Fantasy", "Horror"], studios: ["OLM"],
    episodeCount: 25, duration: "23 min per ep", rating: "R+ - Mild Nudity", source: "Manga", isFeatured: true,
    localSubtitlePattern: "/subtitles/33_e{ep}.vtt",
    episodeSources: [
      // Japanese audio (sub) — from the Cartoons-and-Anime TV rip collection.
      { startEp: 1, endEp: 25, collection: "Cartoons-and-Anime", fileTemplate: "Berserk (1997)/Berserk - S01E{ep:02} - 4x3.mp4", audio: "sub" },
      // English dub — from the berserk-1997-complete Blu-Ray rip (English is
      // the default audio track in the source MKV; the MP4 was encoded from it).
      // Each episode has its title in the filename, so we use episodeFiles.
      {
        startEp: 1, endEp: 25, collection: "berserk-1997-complete", audio: "dub",
        episodeFiles: {
          1: "Berserk (1997) S1E01 - The Black Swordsman.mp4",
          2: "Berserk (1997) S1E02 - The Band of the Hawk.mp4",
          3: "Berserk (1997) S1E03 - First Battle.mp4",
          4: "Berserk (1997) S1E04 - The Hand of God.mp4",
          5: "Berserk (1997) S1E05 - Sword and the Wind.mp4",
          6: "Berserk (1997) S1E06 - Zodd the Immortal.mp4",
          7: "Berserk (1997) S1E07 - The Sword Master.mp4",
          8: "Berserk (1997) S1E08 - Conspiracy.mp4",
          9: "Berserk (1997) S1E09 - Assassination.mp4",
          10: "Berserk (1997) S1E10 - Nobleman.mp4",
          11: "Berserk (1997) S1E11 - Battle Engagement.mp4",
          12: "Berserk (1997) S1E12 - Two People.mp4",
          13: "Berserk (1997) S1E13 - Suicidal Act.mp4",
          14: "Berserk (1997) S1E14 - Campfire of Dreams.mp4",
          15: "Berserk (1997) S1E15 - The Decisive Battle.mp4",
          16: "Berserk (1997) S1E16 - The Conqueror.mp4",
          17: "Berserk (1997) S1E17 - Moment of Glory.mp4",
          18: "Berserk (1997) S1E18 - Tombstone of Flames.mp4",
          19: "Berserk (1997) S1E19 - Parting.mp4",
          20: "Berserk (1997) S1E20 - The Spark.mp4",
          21: "Berserk (1997) S1E21 - Confession.mp4",
          22: "Berserk (1997) S1E22 - The Infiltration.mp4",
          23: "Berserk (1997) S1E23 - Eve of the Feast.mp4",
          24: "Berserk (1997) S1E24 - Eclipse.mp4",
          25: "Berserk (1997) S1E25 - Perpetual Time.mp4",
        },
      },
    ], hasSub: true, hasDub: true,
  },
  // Megas XLR — not on MAL (Cartoon Network show). Use a sentinel
  // malId of -1 so it doesn't clash with real MAL entries, and so the
  // /api/auto-import and /api/jikan/[malId] routes can still resolve it
  // (we relaxed the malId>0 check in auto-import to allow malId<1 for
  // non-MAL titles like this). Poster is the archive.org item thumbnail
  // since no official MAL/Wikipedia art exists.
  { malId: -1, title: "Megas XLR", titleEnglish: "Megas XLR", titleJapanese: "Megas XLR",
    synopsis: "Two Jersey guys find a giant robot and customize it with car parts, using it to fight alien threats.",
    poster: "https://archive.org/download/Cartoons-and-Anime/Cartoons-and-Anime.thumbs/Megas%20XLR%20(2004)/Megas%20XLR%20-%20S01E01%20-%204x3_000001.jpg",
    banner: "https://archive.org/download/Cartoons-and-Anime/Cartoons-and-Anime.thumbs/Megas%20XLR%20(2004)/Megas%20XLR%20-%20S01E01%20-%204x3_000001.jpg",
    type: "TV", status: "Finished Airing", score: 7.80, scoredBy: 30000, rank: 0, popularity: 3000, members: 60000,
    year: 2004, season: "spring", genres: ["Action", "Comedy", "Sci-Fi"], studios: ["Cartoon Network Studios"],
    episodeCount: 26, duration: "22 min per ep", rating: "PG - Children", source: "Original",
    episodeSources: [
      { startEp: 1, endEp: 26, collection: "Cartoons-and-Anime", fileTemplate: "Megas XLR (2004)/Megas XLR - S01E{ep:02} - 4x3.mp4", audio: "dub" },
    ], hasDub: true,
  },
  // ===== My Hero Academia (all 7 seasons) =====
  // S1: sub+dub | S2: sub+dub | S3: sub only | S4: sub only | S5: sub only
  // S6: sub+dub | S7: sub only
  // Sub sources are 1080p BD rips from mha-sN-full collections (Japanese audio).
  // Dub sources from dedicated English dub collections where available.
  // MHA S6 dub is missing episode 10 (the collection only has 24 of 25 eps).
  // My Hero Academia S1
  { malId: 31964, title: "My Hero Academia", titleEnglish: "My Hero Academia", titleJapanese: "僕のヒーローアカデミア",
    synopsis: "Izuku Midoriya dreams of becoming a hero in a world where almost everyone has superpowers called Quirks. Born without a Quirk, he is chosen by the legendary hero All Might to inherit his power.",
    poster: "/posters/mha-s1.jpg", banner: "/posters/mha-s1.jpg",
    type: "TV", status: "Finished Airing", score: 7.82, scoredBy: 500000, rank: 0, popularity: 50, members: 2500000,
    year: 2016, season: "spring", genres: ["Action", "Adventure", "Comedy", "Fantasy"], studios: ["Bones"],
    episodeCount: 13, duration: "24 min per ep", rating: "PG-13 - Teens 13 or older", source: "Manga", isFeatured: true,
    episodeSources: [
      { startEp: 1, endEp: 13, collection: "my-hero-episode-1-season-1-dub", audio: "dub", episodeFiles: {
        1: "My hero episode 1 season 1 - dub.mp4", 2: "my hero_episode 2 _season1.mp4", 3: "My hero_episode 3_season 1.mp4",
        4: "my hero_episode 4 _season1.mp4", 5: "my hero_episode 5 _season 1.mp4", 6: "my hero_episode 6 _season1.mp4",
        7: "my hero_episode 7 _season1.mp4", 8: "my hero_episode 8_season1.mp4", 9: "My hero_episode 9_season 1.mp4",
        10: "My hero_episode10_season 1.mp4", 11: "my hero_episode 11 _season1.mp4", 12: "my hero_episode 12 _season1.mp4",
        13: "My hero_episode 13_season 1.mp4",
      }},
      { startEp: 1, endEp: 13, collection: "mha-s1-full", audio: "sub", episodeFiles: {
        1: "AnimePahe_Boku_no_Hero_Academia_-_001_BD_1080p_Nep_Blanc.mp4", 2: "AnimePahe_Boku_no_Hero_Academia_-_002_BD_1080p_Nep_Blanc.mp4",
        3: "AnimePahe_Boku_no_Hero_Academia_-_003_BD_1080p_Nep_Blanc.mp4", 4: "AnimePahe_Boku_no_Hero_Academia_-_004_BD_1080p_Nep_Blanc.mp4",
        5: "AnimePahe_Boku_no_Hero_Academia_-_005_BD_1080p_Nep_Blanc.mp4", 6: "AnimePahe_Boku_no_Hero_Academia_-_006_BD_1080p_Nep_Blanc.mp4",
        7: "AnimePahe_Boku_no_Hero_Academia_-_007_BD_1080p_Nep_Blanc.mp4", 8: "AnimePahe_Boku_no_Hero_Academia_-_008_BD_1080p_Nep_Blanc.mp4",
        9: "AnimePahe_Boku_no_Hero_Academia_-_009_BD_1080p_Nep_Blanc.mp4", 10: "AnimePahe_Boku_no_Hero_Academia_-_010_BD_1080p_Nep_Blanc.mp4",
        11: "AnimePahe_Boku_no_Hero_Academia_-_011_BD_1080p_Nep_Blanc.mp4", 12: "AnimePahe_Boku_no_Hero_Academia_-_012_BD_1080p_Nep_Blanc.mp4",
        13: "AnimePahe_Boku_no_Hero_Academia_-_013_BD_1080p_Nep_Blanc.mp4",
      }},
    ], hasSub: true, hasDub: true,
  },
  // My Hero Academia S2
  { malId: 33458, title: "My Hero Academia Season 2", titleEnglish: "My Hero Academia Season 2", titleJapanese: "僕のヒーローアカデミア 2ndシーズン",
    synopsis: "The U.A. High School students participate in the sports festival and begin their internships with pro heroes, facing new threats.",
    poster: "/posters/mha-s2.jpg", banner: "/posters/mha-s2.jpg",
    type: "TV", status: "Finished Airing", score: 8.00, scoredBy: 500000, rank: 0, popularity: 80, members: 2000000,
    year: 2017, season: "spring", genres: ["Action", "Adventure", "Comedy", "Fantasy"], studios: ["Bones"],
    episodeCount: 25, duration: "24 min per ep", rating: "PG-13 - Teens 13 or older", source: "Manga", isFeatured: true,
    episodeSources: [
      { startEp: 1, endEp: 25, collection: "myheroacademiaseasontwo", audio: "dub", episodeFiles: {
        1: "1ThatsTheIdeaOchaco2.mp4", 2: "2RoaringSportsFestival2.mp4", 3: "3InTheirOwnQuirkyWays2.mp4",
        4: "4StrategyStrategyStrategy2.mp4", 5: "5CavalryBattleFinale2.mp4", 6: "6TheBoyBornWithEverything2.mp4",
        7: "7VictoryorDefeat2.mp4", 8: "8BattleOnChallengers!.mp4", 9: "9BakugoVSUraraka2.mp4",
        10: "10ShotoTodorokiOrigin2.mp4", 11: "11FightOnIida.mp4", 12: "12TodorokiVSBakugo2.mp4",
        13: "13TimetoPickSomeNames2.mp4", 14: "14Bizarre!GranTorinoAppears2.mp4", 15: "15MidoriyaandShigaraki2.mp4",
        16: "16HeroKillerStainVSUAStudents2.mp4", 17: "17Climax2.mp4", 18: "18TheAftermathofHeroKillerStain2.mp4",
        19: "19EveryonesInternships2.mp4", 20: "20ListenUp!!ATalefromthePast2.mp4", 21: "21GearUpforFinalExams2.mp4",
        22: "22YaoyorozuRising2.mp4", 23: "23StrippingtheVarnish2.mp4", 24: "24KatsukiBakugoOrigin2.mp4",
        25: "25Encounter2.mp4",
      }},
      { startEp: 1, endEp: 25, collection: "mha-s2-full", audio: "sub", episodeFiles: {
        1: "AnimePahe_Boku_no_Hero_Academia_-_014_BD_1080p_ITH.mp4", 2: "AnimePahe_Boku_no_Hero_Academia_-_015_BD_1080p_ITH.mp4",
        3: "AnimePahe_Boku_no_Hero_Academia_-_016_BD_1080p_ITH.mp4", 4: "AnimePahe_Boku_no_Hero_Academia_-_017_BD_1080p_ITH.mp4",
        5: "AnimePahe_Boku_no_Hero_Academia_-_018_BD_1080p_ITH.mp4", 6: "AnimePahe_Boku_no_Hero_Academia_-_019_BD_1080p_ITH (1).mp4",
        7: "AnimePahe_Boku_no_Hero_Academia_-_020_BD_1080p_ITH.mp4", 8: "AnimePahe_Boku_no_Hero_Academia_-_021_BD_1080p_ITH.mp4",
        9: "AnimePahe_Boku_no_Hero_Academia_-_022_BD_1080p_ITH.mp4", 10: "AnimePahe_Boku_no_Hero_Academia_-_023_BD_1080p_ITH.mp4",
        11: "AnimePahe_Boku_no_Hero_Academia_-_024_BD_1080p_ITH.mp4", 12: "AnimePahe_Boku_no_Hero_Academia_-_025_BD_1080p_ITH.mp4",
        13: "AnimePahe_Boku_no_Hero_Academia_-_026_BD_1080p_ITH.mp4", 14: "AnimePahe_Boku_no_Hero_Academia_-_027_BD_1080p_ITH.mp4",
        15: "AnimePahe_Boku_no_Hero_Academia_-_028_BD_1080p_ITH.mp4", 16: "AnimePahe_Boku_no_Hero_Academia_-_029_BD_1080p_ITH.mp4",
        17: "AnimePahe_Boku_no_Hero_Academia_-_030_BD_1080p_ITH.mp4", 18: "AnimePahe_Boku_no_Hero_Academia_-_031_BD_1080p_ITH.mp4",
        19: "AnimePahe_Boku_no_Hero_Academia_-_032_BD_1080p_ITH.mp4", 20: "AnimePahe_Boku_no_Hero_Academia_-_033_BD_1080p_ITH.mp4",
        21: "AnimePahe_Boku_no_Hero_Academia_-_034_BD_1080p_ITH.mp4", 22: "AnimePahe_Boku_no_Hero_Academia_-_035_BD_1080p_ITH.mp4",
        23: "AnimePahe_Boku_no_Hero_Academia_-_036_BD_1080p_ITH.mp4", 24: "AnimePahe_Boku_no_Hero_Academia_-_037_BD_1080p_ITH.mp4",
        25: "AnimePahe_Boku_no_Hero_Academia_-_038_BD_1080p_ITH.mp4",
      }},
    ], hasSub: true, hasDub: true,
  },
  // My Hero Academia S3 (sub only — no dub MP4 collection found)
  { malId: 36474, title: "My Hero Academia Season 3", titleEnglish: "My Hero Academia Season 3", titleJapanese: "僕のヒーローアカデミア 3rdシーズン",
    synopsis: "Class 1-A goes to a summer training camp, but the League of Villains attacks. All Might faces All For One in a battle that changes everything.",
    poster: "/posters/mha-s3.jpg", banner: "/posters/mha-s3.jpg",
    type: "TV", status: "Finished Airing", score: 7.93, scoredBy: 500000, rank: 0, popularity: 100, members: 1800000,
    year: 2018, season: "spring", genres: ["Action", "Adventure", "Comedy", "Fantasy"], studios: ["Bones"],
    episodeCount: 25, duration: "24 min per ep", rating: "PG-13 - Teens 13 or older", source: "Manga", isFeatured: true,
    episodeSources: [
      { startEp: 1, endEp: 25, collection: "mha-s3-full", audio: "sub", episodeFiles: {
        1: "AnimePahe_Boku_no_Hero_Academia_-_039_BD_1080p_Yūrei.mp4", 2: "AnimePahe_Boku_no_Hero_Academia_-_040_BD_1080p_Yūrei.mp4",
        3: "AnimePahe_Boku_no_Hero_Academia_-_041_BD_1080p_Yūrei.mp4", 4: "AnimePahe_Boku_no_Hero_Academia_-_042_BD_1080p_Yūrei.mp4",
        5: "AnimePahe_Boku_no_Hero_Academia_-_043_BD_1080p_Yūrei.mp4", 6: "AnimePahe_Boku_no_Hero_Academia_-_044_BD_1080p_Yūrei.mp4",
        7: "AnimePahe_Boku_no_Hero_Academia_-_045_BD_1080p_Yūrei.mp4", 8: "AnimePahe_Boku_no_Hero_Academia_-_046_BD_1080p_Yūrei.mp4",
        9: "AnimePahe_Boku_no_Hero_Academia_-_047_BD_1080p_Yūrei.mp4", 10: "AnimePahe_Boku_no_Hero_Academia_-_048_BD_1080p_Yūrei.mp4",
        11: "AnimePahe_Boku_no_Hero_Academia_-_049_BD_1080p_Yūrei.mp4", 12: "AnimePahe_Boku_no_Hero_Academia_-_050_BD_1080p_Yūrei.mp4",
        13: "AnimePahe_Boku_no_Hero_Academia_-_051_BD_1080p_Yūrei.mp4", 14: "AnimePahe_Boku_no_Hero_Academia_-_052_BD_1080p_Yūrei.mp4",
        15: "AnimePahe_Boku_no_Hero_Academia_-_053_BD_1080p_Yūrei.mp4", 16: "AnimePahe_Boku_no_Hero_Academia_-_054_BD_1080p_Yūrei.mp4",
        17: "AnimePahe_Boku_no_Hero_Academia_-_055_BD_1080p_Yūrei.mp4", 18: "AnimePahe_Boku_no_Hero_Academia_-_056_BD_1080p_Yūrei.mp4",
        19: "AnimePahe_Boku_no_Hero_Academia_-_057_BD_1080p_Yūrei.mp4", 20: "AnimePahe_Boku_no_Hero_Academia_-_058_BD_1080p_Yūrei.mp4",
        21: "AnimePahe_Boku_no_Hero_Academia_-_059_BD_1080p_Yūrei.mp4", 22: "AnimePahe_Boku_no_Hero_Academia_-_060_BD_1080p_Yūrei.mp4",
        23: "AnimePahe_Boku_no_Hero_Academia_-_061_BD_1080p_Yūrei.mp4", 24: "AnimePahe_Boku_no_Hero_Academia_-_062_BD_1080p_Yūrei.mp4",
        25: "AnimePahe_Boku_no_Hero_Academia_-_063_BD_1080p_Yūrei.mp4",
      }},
    ], hasSub: true,
  },
  // My Hero Academia S4 (sub only — no dub MP4 collection found)
  { malId: 38408, title: "My Hero Academia Season 4", titleEnglish: "My Hero Academia Season 4", titleJapanese: "僕のヒーローアカデミア 4thシーズン",
    synopsis: "Deku works with Sir Nighteye to investigate the Shie Hassaikai yakuza group and rescue a young girl named Eri.",
    poster: "/posters/mha-s4.jpg", banner: "/posters/mha-s4.jpg",
    type: "TV", status: "Finished Airing", score: 7.50, scoredBy: 500000, rank: 0, popularity: 120, members: 1700000,
    year: 2019, season: "fall", genres: ["Action", "Adventure", "Comedy", "Fantasy"], studios: ["Bones"],
    episodeCount: 25, duration: "24 min per ep", rating: "PG-13 - Teens 13 or older", source: "Manga", isFeatured: true,
    episodeSources: [
      { startEp: 1, endEp: 25, collection: "mha-s4-full", audio: "sub", episodeFiles: {
        1: "AnimePahe_Boku_no_Hero_Academia_-_064_BD_1080p_EMBER.mp4", 2: "AnimePahe_Boku_no_Hero_Academia_-_065_BD_1080p_EMBER.mp4",
        3: "AnimePahe_Boku_no_Hero_Academia_-_066_BD_1080p_EMBER.mp4", 4: "AnimePahe_Boku_no_Hero_Academia_-_067_BD_1080p_EMBER.mp4",
        5: "AnimePahe_Boku_no_Hero_Academia_-_068_BD_1080p_EMBER.mp4", 6: "AnimePahe_Boku_no_Hero_Academia_-_069_BD_1080p_EMBER.mp4",
        7: "AnimePahe_Boku_no_Hero_Academia_-_070_BD_1080p_EMBER.mp4", 8: "AnimePahe_Boku_no_Hero_Academia_-_071_BD_1080p_EMBER.mp4",
        9: "AnimePahe_Boku_no_Hero_Academia_-_072_BD_1080p_EMBER.mp4", 10: "AnimePahe_Boku_no_Hero_Academia_-_073_BD_1080p_EMBER.mp4",
        11: "AnimePahe_Boku_no_Hero_Academia_-_074_BD_1080p_EMBER.mp4", 12: "AnimePahe_Boku_no_Hero_Academia_-_075_BD_1080p_EMBER.mp4",
        13: "AnimePahe_Boku_no_Hero_Academia_-_076_BD_1080p_EMBER.mp4", 14: "AnimePahe_Boku_no_Hero_Academia_-_077_BD_1080p_EMBER.mp4",
        15: "AnimePahe_Boku_no_Hero_Academia_-_078_BD_1080p_EMBER.mp4", 16: "AnimePahe_Boku_no_Hero_Academia_-_079_BD_1080p_EMBER.mp4",
        17: "AnimePahe_Boku_no_Hero_Academia_-_080_BD_1080p_EMBER.mp4", 18: "AnimePahe_Boku_no_Hero_Academia_-_081_BD_1080p_EMBER.mp4",
        19: "AnimePahe_Boku_no_Hero_Academia_-_082_BD_1080p_EMBER.mp4", 20: "AnimePahe_Boku_no_Hero_Academia_-_083_BD_1080p_EMBER.mp4",
        21: "AnimePahe_Boku_no_Hero_Academia_-_084_BD_1080p_EMBER.mp4", 22: "AnimePahe_Boku_no_Hero_Academia_-_085_BD_1080p_EMBER.mp4",
        23: "AnimePahe_Boku_no_Hero_Academia_-_086_BD_1080p_EMBER.mp4", 24: "AnimePahe_Boku_no_Hero_Academia_-_087_BD_1080p_EMBER.mp4",
        25: "AnimePahe_Boku_no_Hero_Academia_-_088_BD_1080p_EMBER.mp4",
      }},
    ], hasSub: true,
  },
  // My Hero Academia S5 (sub only — no dub MP4 collection found)
  { malId: 41587, title: "My Hero Academia Season 5", titleEnglish: "My Hero Academia Season 5", titleJapanese: "僕のヒーローアカデミア 5thシーズン",
    synopsis: "Class 1-A and 1-B participate in joint training exercises, while the Meta Liberation Army and the League of Villains merge.",
    poster: "/posters/mha-s5.jpg", banner: "/posters/mha-s5.jpg",
    type: "TV", status: "Finished Airing", score: 7.30, scoredBy: 500000, rank: 0, popularity: 150, members: 1500000,
    year: 2021, season: "spring", genres: ["Action", "Adventure", "Comedy", "Fantasy"], studios: ["Bones"],
    episodeCount: 25, duration: "24 min per ep", rating: "PG-13 - Teens 13 or older", source: "Manga", isFeatured: true,
    episodeSources: [
      { startEp: 1, endEp: 25, collection: "mha-s5-full", audio: "sub", episodeFiles: {
        1: "AnimePahe_Boku_no_Hero_Academia_-_089_BD_1080p_EMBER.mp4", 2: "AnimePahe_Boku_no_Hero_Academia_-_090_BD_1080p_EMBER.mp4",
        3: "AnimePahe_Boku_no_Hero_Academia_-_091_BD_1080p_EMBER.mp4", 4: "AnimePahe_Boku_no_Hero_Academia_-_092_BD_1080p_EMBER.mp4",
        5: "AnimePahe_Boku_no_Hero_Academia_-_093_BD_1080p_EMBER.mp4", 6: "AnimePahe_Boku_no_Hero_Academia_-_094_BD_1080p_EMBER.mp4",
        7: "AnimePahe_Boku_no_Hero_Academia_-_095_BD_1080p_EMBER.mp4", 8: "AnimePahe_Boku_no_Hero_Academia_-_096_BD_1080p_EMBER.mp4",
        9: "AnimePahe_Boku_no_Hero_Academia_-_097_BD_1080p_EMBER.mp4", 10: "AnimePahe_Boku_no_Hero_Academia_-_098_BD_1080p_EMBER.mp4",
        11: "AnimePahe_Boku_no_Hero_Academia_-_099_BD_1080p_EMBER.mp4", 12: "AnimePahe_Boku_no_Hero_Academia_-_100_BD_1080p_EMBER.mp4",
        13: "AnimePahe_Boku_no_Hero_Academia_-_101_BD_1080p_EMBER.mp4", 14: "AnimePahe_Boku_no_Hero_Academia_-_102_BD_1080p_EMBER.mp4",
        15: "AnimePahe_Boku_no_Hero_Academia_-_103_BD_1080p_EMBER.mp4", 16: "AnimePahe_Boku_no_Hero_Academia_-_104_BD_1080p_EMBER.mp4",
        17: "AnimePahe_Boku_no_Hero_Academia_-_105_BD_1080p_EMBER.mp4", 18: "AnimePahe_Boku_no_Hero_Academia_-_106_BD_1080p_EMBER.mp4",
        19: "AnimePahe_Boku_no_Hero_Academia_-_107_BD_1080p_EMBER.mp4", 20: "AnimePahe_Boku_no_Hero_Academia_-_108_BD_1080p_EMBER.mp4",
        21: "AnimePahe_Boku_no_Hero_Academia_-_109_BD_1080p_EMBER.mp4", 22: "AnimePahe_Boku_no_Hero_Academia_-_110_BD_1080p_EMBER.mp4",
        23: "AnimePahe_Boku_no_Hero_Academia_-_111_BD_1080p_EMBER.mp4", 24: "AnimePahe_Boku_no_Hero_Academia_-_112_BD_1080p_EMBER.mp4",
        25: "AnimePahe_Boku_no_Hero_Academia_-_113_BD_1080p_EMBER.mp4",
      }},
    ], hasSub: true,
  },
  // My Hero Academia S6 (sub + dub; dub missing ep 10)
  { malId: 49992, title: "My Hero Academia Season 6", titleEnglish: "My Hero Academia Season 6", titleJapanese: "僕のヒーローアカデミア 6thシーズン",
    synopsis: "The Paranormal Liberation War begins as heroes launch a massive raid on the villains' headquarters. Deku discovers the true power of One For All.",
    poster: "/posters/mha-s6.jpg", banner: "/posters/mha-s6.jpg",
    type: "TV", status: "Finished Airing", score: 8.17, scoredBy: 500000, rank: 0, popularity: 130, members: 1600000,
    year: 2022, season: "fall", genres: ["Action", "Adventure", "Comedy", "Fantasy"], studios: ["Bones"],
    episodeCount: 25, duration: "24 min per ep", rating: "PG-13 - Teens 13 or older", source: "Manga", isFeatured: true,
    episodeSources: [
      { startEp: 1, endEp: 25, collection: "s-6.-e-8-league-of-villains-vs.-u.-a.-students", audio: "dub", episodeFiles: {
        1: "S6.E1 ∙ A Quiet Beginning.mp4", 2: "S6.E2 ∙ Mirko, the No. 5 Hero.mp4", 3: "S6.E3 ∙ One's Justice.mp4",
        4: "S6.E4 ∙ Inheritance.mp4", 5: "S6.E5 ∙ The Thrill of Destruction.mp4", 6: "S6.E6 ∙ Encounter, Part 2.mp4",
        7: "S6.E7 ∙ Disaster Walker.mp4", 8: "S6.E8 ∙ League of Villains vs. U.A. Students.mp4",
        9: "S6.E9 ∙ Katsuki Bakugo Rising.mp4",
        // ep 10 missing from the dub collection — will fall through to sub
        11: "S6.E11 ∙ Dabi's Dance.mp4", 12: "S6.E12 ∙ Threads of Hope.mp4", 13: "S6.E13 ∙ Final Performance.mp4",
        14: "S6.E14 ∙ Hellish Hell.mp4", 15: "S6.E15 ∙ Tartarus.mp4", 16: "S6.E16 ∙ The Hellish Todoroki Family, Part 2.mp4",
        17: "S6.E17 ∙ The Wrong Way to Put Out a Fire.mp4", 18: "S6.E18 ∙ Izuku Midoriya and Tomura Shigaraki.mp4",
        19: "S6.E19 ∙ Full Power!!.mp4", 20: "S6.E20 ∙ Hired Gun.mp4", 21: "S6.E21 ∙ The Lovely Lady Nagant.mp4",
        22: "S6.E22 ∙ Friend.mp4", 23: "S6.E23 ∙ Deku vs. Class A.mp4", 24: "S6.E24 ∙ A Young Woman's Declaration.mp4",
        25: "S6.E25 ∙ No Man Is an Island.mp4",
      }},
      { startEp: 1, endEp: 25, collection: "mha-s6-full", audio: "sub", episodeFiles: {
        1: "AnimePahe_Boku_no_Hero_Academia_-_114_1080p_SubsPlease.mp4", 2: "AnimePahe_Boku_no_Hero_Academia_-_115_1080p_SubsPlease.mp4",
        3: "AnimePahe_Boku_no_Hero_Academia_-_116_1080p_SubsPlease.mp4", 4: "AnimePahe_Boku_no_Hero_Academia_-_117_1080p_SubsPlease (1).mp4",
        5: "AnimePahe_Boku_no_Hero_Academia_-_118_1080p_SubsPlease.mp4", 6: "AnimePahe_Boku_no_Hero_Academia_-_119_1080p_SubsPlease.mp4",
        7: "AnimePahe_Boku_no_Hero_Academia_-_120_1080p_SubsPlease.mp4", 8: "AnimePahe_Boku_no_Hero_Academia_-_121_1080p_SubsPlease.mp4",
        9: "AnimePahe_Boku_no_Hero_Academia_-_122_1080p_SubsPlease.mp4", 10: "AnimePahe_Boku_no_Hero_Academia_-_123_1080p_SubsPlease.mp4",
        11: "AnimePahe_Boku_no_Hero_Academia_-_124_1080p_SubsPlease.mp4", 12: "AnimePahe_Boku_no_Hero_Academia_-_125_1080p_SubsPlease.mp4",
        13: "AnimePahe_Boku_no_Hero_Academia_-_126_1080p_SubsPlease.mp4", 14: "AnimePahe_Boku_no_Hero_Academia_-_127_1080p_SubsPlease.mp4",
        15: "AnimePahe_Boku_no_Hero_Academia_-_128_1080p_SubsPlease.mp4", 16: "AnimePahe_Boku_no_Hero_Academia_-_129_1080p_SubsPlease.mp4",
        17: "AnimePahe_Boku_no_Hero_Academia_-_130_1080p_SubsPlease.mp4", 18: "AnimePahe_Boku_no_Hero_Academia_-_131_1080p_SubsPlease.mp4",
        19: "AnimePahe_Boku_no_Hero_Academia_-_132_1080p_SubsPlease.mp4", 20: "AnimePahe_Boku_no_Hero_Academia_-_133_1080p_SubsPlease.mp4",
        21: "AnimePahe_Boku_no_Hero_Academia_-_134_1080p_SubsPlease.mp4", 22: "AnimePahe_Boku_no_Hero_Academia_-_135_1080p_SubsPlease.mp4",
        23: "AnimePahe_Boku_no_Hero_Academia_-_136_1080p_SubsPlease.mp4", 24: "AnimePahe_Boku_no_Hero_Academia_-_137_1080p_SubsPlease.mp4",
        25: "AnimePahe_Boku_no_Hero_Academia_-_138_1080p_SubsPlease.mp4",
      }},
    ], hasSub: true, hasDub: true,
  },
  // My Hero Academia S7 (sub only — no dub MP4 collection found)
  { malId: 54945, title: "My Hero Academia Season 7", titleEnglish: "My Hero Academia Season 7", titleJapanese: "僕のヒーローアカデミア 7thシーズン",
    synopsis: "Star and Stripe arrives to fight Shigaraki, while the final war between heroes and villains reaches its climax.",
    poster: "/posters/mha-s7.jpg", banner: "/posters/mha-s7.jpg",
    type: "TV", status: "Finished Airing", score: 8.24, scoredBy: 500000, rank: 0, popularity: 200, members: 800000,
    year: 2024, season: "spring", genres: ["Action", "Adventure", "Comedy", "Fantasy"], studios: ["Bones"],
    episodeCount: 21, duration: "24 min per ep", rating: "PG-13 - Teens 13 or older", source: "Manga", isFeatured: true,
    episodeSources: [
      { startEp: 1, endEp: 21, collection: "mha-s7-full", audio: "sub", episodeFiles: {
        1: "AnimePahe_Boku_no_Hero_Academia_-_139_1080p_SubsPlease.mp4", 2: "AnimePahe_Boku_no_Hero_Academia_-_140_1080p_SubsPlease.mp4",
        3: "AnimePahe_Boku_no_Hero_Academia_-_141_1080p_SubsPlease.mp4", 4: "AnimePahe_Boku_no_Hero_Academia_-_142_1080p_SubsPlease.mp4",
        5: "AnimePahe_Boku_no_Hero_Academia_-_143_1080p_SubsPlease.mp4", 6: "AnimePahe_Boku_no_Hero_Academia_-_144_1080p_SubsPlease.mp4",
        7: "AnimePahe_Boku_no_Hero_Academia_-_145_1080p_SubsPlease.mp4", 8: "AnimePahe_Boku_no_Hero_Academia_-_146_1080p_SubsPlease (1).mp4",
        9: "AnimePahe_Boku_no_Hero_Academia_-_147_1080p_SubsPlease.mp4", 10: "AnimePahe_Boku_no_Hero_Academia_-_148_1080p_SubsPlease.mp4",
        11: "AnimePahe_Boku_no_Hero_Academia_-_149_1080p_SubsPlease.mp4", 12: "AnimePahe_Boku_no_Hero_Academia_-_150_1080p_SubsPlease.mp4",
        13: "AnimePahe_Boku_no_Hero_Academia_-_151_1080p_SubsPlease.mp4", 14: "AnimePahe_Boku_no_Hero_Academia_-_152_1080p_SubsPlease.mp4",
        15: "AnimePahe_Boku_no_Hero_Academia_-_153_1080p_SubsPlease.mp4", 16: "AnimePahe_Boku_no_Hero_Academia_-_154_1080p_SubsPlease.mp4",
        17: "AnimePahe_Boku_no_Hero_Academia_-_155_1080p_SubsPlease.mp4", 18: "AnimePahe_Boku_no_Hero_Academia_-_156_1080p_SubsPlease.mp4",
        19: "AnimePahe_Boku_no_Hero_Academia_-_157_1080p_SubsPlease.mp4", 20: "AnimePahe_Boku_no_Hero_Academia_-_158_1080p_SubsPlease.mp4",
        21: "AnimePahe_Boku_no_Hero_Academia_-_159_1080p_SubsPlease.mp4",
      }},
    ], hasSub: true,
  },
  // My Hero Academia S8 (Final Season) — sub + dub. Currently airing.
  // Sub: mha-final-season collection (1080p SubsPlease, Japanese audio, eps 160-170).
  // Dub: anime-pahe-...-yameii collection (English dub, eps 160-167, mixed quality).
  // Dub is missing eps 8-11 (168-170) — those will fall through to sub.
  // malId -2 is a sentinel since the real MAL ID couldn't be verified via Jikan
  // (rate-limited). All data is provided in-seed so the catalog/detail views work.
  { malId: -2, title: "My Hero Academia Final Season", titleEnglish: "My Hero Academia Final Season", titleJapanese: "僕のヒーローアカデミア Final Season",
    synopsis: "The final war between heroes and villains reaches its conclusion as Deku and his classmates face All For One and Shigaraki in their last battle.",
    poster: "/posters/mha-s8.jpg", banner: "/posters/mha-s8.jpg",
    type: "TV", status: "Currently Airing", score: 8.30, scoredBy: 100000, rank: 0, popularity: 300, members: 400000,
    year: 2025, season: "winter", genres: ["Action", "Adventure", "Comedy", "Fantasy"], studios: ["Bones"],
    episodeCount: 11, duration: "24 min per ep", rating: "PG-13 - Teens 13 or older", source: "Manga", isFeatured: true,
    episodeSources: [
      { startEp: 1, endEp: 11, collection: "anime-pahe-boku-no-hero-academia-eng-dub-160-720p-yameii", audio: "dub", episodeFiles: {
        1: "AnimePahe_Boku_no_Hero_Academia_Eng_Dub_-_160_720p_Yameii.mp4",
        2: "AnimePahe_Boku_no_Hero_Academia_Eng_Dub_-_161_720p_Yameii.mp4",
        3: "AnimePahe_Boku_no_Hero_Academia_Eng_Dub_-_162_720p_Yameii.mp4",
        4: "AnimePahe_Boku_no_Hero_Academia_Eng_Dub_-_163_360p_Yameii.mp4",
        5: "AnimePahe_Boku_no_Hero_Academia_Eng_Dub_-_164_1080p_Yameii.mp4",
        6: "AnimePahe_Boku_no_Hero_Academia_Eng_Dub_-_165_1080p_Yameii.mp4",
        7: "AnimePahe_Boku_no_Hero_Academia_Eng_Dub_-_166_1080p_Yameii.mp4",
        8: "AnimePahe_Boku_no_Hero_Academia_Eng_Dub_-_167_1080p_Yameii.mp4",
        // eps 9-11 (168-170) not yet dubbed — fall through to sub
      }},
      { startEp: 1, endEp: 11, collection: "mha-final-season", audio: "sub", episodeFiles: {
        1: "AnimePahe_Boku_no_Hero_Academia_-_160_1080p_SubsPlease.mp4",
        2: "AnimePahe_Boku_no_Hero_Academia_-_161_1080p_SubsPlease.mp4",
        3: "AnimePahe_Boku_no_Hero_Academia_-_162_1080p_SubsPlease.mp4",
        4: "AnimePahe_Boku_no_Hero_Academia_-_163_1080p_SubsPlease.mp4",
        5: "AnimePahe_Boku_no_Hero_Academia_-_164v2_1080p_SubsPlease.mp4",
        6: "AnimePahe_Boku_no_Hero_Academia_-_165_1080p_SubsPlease.mp4",
        7: "AnimePahe_Boku_no_Hero_Academia_-_166_1080p_SubsPlease.mp4",
        8: "AnimePahe_Boku_no_Hero_Academia_-_167_1080p_SubsPlease.mp4",
        9: "AnimePahe_Boku_no_Hero_Academia_-_168_1080p_SubsPlease.mp4",
        10: "AnimePahe_Boku_no_Hero_Academia_-_169_1080p_SubsPlease.mp4",
        11: "AnimePahe_Boku_no_Hero_Academia_-_170_1080p_SubsPlease.mp4",
      }},
    ], hasSub: true, hasDub: true,
  },
];

/**
 * Season groupings — maps a franchise name to an ordered list of MAL IDs
 * that represent the seasons/parts/cours of that anime.
 * Used by the "Seasons" tab in AnimeDetailView to show related seasons.
 */
export const SEASON_GROUPS: { franchise: string; seasons: { malId: number; label: string }[] }[] = [
  {
    franchise: "Bleach: Thousand-Year Blood War",
    seasons: [
      { malId: 41467, label: "Cour 1 — Thousand-Year Blood War" },
      { malId: 53998, label: "Cour 2 — The Separation" },
      { malId: 56784, label: "Cour 3 — The Conflict" },
      { malId: 60636, label: "Cour 4 — The Calamity" },
    ],
  },
  {
    franchise: "Frieren: Beyond Journey's End",
    seasons: [
      { malId: 52991, label: "Season 1" },
      { malId: 59978, label: "Season 2" },
      { malId: 63816, label: "Golden Land Arc" },
    ],
  },
  {
    franchise: "Jujutsu Kaisen",
    seasons: [
      { malId: 40748, label: "Season 1" },
      { malId: 51009, label: "Season 2" },
      { malId: 57658, label: "The Culling Game Part 1" },
    ],
  },
  {
    franchise: "Chainsaw Man",
    seasons: [
      { malId: 44511, label: "Season 1" },
      { malId: 57555, label: "Movie: Reze Arc" },
    ],
  },
  {
    franchise: "Evangelion",
    seasons: [
      { malId: 30, label: "Neon Genesis Evangelion" },
      { malId: 32, label: "The End of Evangelion" },
      { malId: 2759, label: "1.0 You Are (Not) Alone" },
      { malId: 3786, label: "3.0+1.0 Thrice Upon a Time" },
    ],
  },
  {
    franchise: "Gachiakuta",
    seasons: [
      { malId: 59062, label: "Season 1" },
      { malId: 63147, label: "Season 2" },
    ],
  },
  {
    franchise: "Bleach",
    seasons: [
      { malId: 269, label: "Season 1 — Bleach (2004)" },
      { malId: 41467, label: "Season 2 — TYBW Cour 1" },
      { malId: 53998, label: "Season 3 — TYBW Cour 2 (Separation)" },
      { malId: 56784, label: "Season 4 — TYBW Cour 3 (Conflict)" },
      { malId: 60636, label: "Season 5 — TYBW Cour 4 (Calamity)" },
    ],
  },
  {
    franchise: "The 100 Girlfriends",
    seasons: [
      { malId: 54714, label: "Season 1" },
      { malId: 57616, label: "Season 2" },
      { malId: 62811, label: "Season 3" },
    ],
  },
  {
    franchise: "Me and You Are Polar Opposites",
    seasons: [
      { malId: 60371, label: "Season 1" },
      { malId: 63832, label: "Season 2" },
    ],
  },
  {
    franchise: "Haikyuu!!",
    seasons: [
      { malId: 20583, label: "Season 1" },
      { malId: 28891, label: "Season 2" },
      { malId: 32935, label: "Season 3 — Karasuno vs Shiratorizawa" },
      { malId: 38883, label: "Season 4 — To the Top" },
    ],
  },
  {
    franchise: "The Apothecary Diaries",
    seasons: [
      { malId: 52412, label: "Season 1" },
      { malId: 58514, label: "Season 2" },
    ],
  },
  {
    franchise: "My Hero Academia",
    seasons: [
      { malId: 31964, label: "Season 1" },
      { malId: 33458, label: "Season 2" },
      { malId: 36474, label: "Season 3" },
      { malId: 38408, label: "Season 4" },
      { malId: 41587, label: "Season 5" },
      { malId: 49992, label: "Season 6" },
      { malId: 54945, label: "Season 7" },
      { malId: -2, label: "Final Season (S8)" },
    ],
  },
];

/** Find the season group that contains the given malId. */
export function findSeasonGroup(malId: number) {
  return SEASON_GROUPS.find((g) => g.seasons.some((s) => s.malId === malId));
}

export function resolveEpisodeUrl(seed: SeedAnime, episode: number, audioMode: "sub" | "dub" = "sub"): { url: string; source: string; needsProxy: boolean; dualAudio: boolean; audio: "sub" | "dub" | "both" } | null {
  if (!seed.episodeSources || seed.episodeSources.length === 0) return null;
  const matchingSources = seed.episodeSources.filter((src) => episode >= src.startEp && episode <= src.endEp);
  if (matchingSources.length === 0) return null;
  const wantedAudio = audioMode === "dub" ? "dub" : "sub";
  const otherAudio = wantedAudio === "dub" ? "sub" : "dub";

  // Try to resolve the file from a source matching the wanted audio mode.
  // If that source doesn't have this specific episode (e.g. episodeFiles map
  // doesn't include it), fall through to the other audio mode so the user
  // still gets a playable stream instead of a "no stream" error.
  function tryResolve(src: EpisodeSource): string | null {
    if (src.episodeFiles && src.episodeFiles[episode]) {
      return src.episodeFiles[episode];
    }
    if (src.fileName) return src.fileName;
    if (src.fileTemplate) {
      let file = src.fileTemplate;
      file = file.replace(/\{ep(?::(\d+))?\}/g, (_, pad?: string) => { const s = String(episode); return pad ? s.padStart(Number(pad), "0") : s; });
      if (src.seasonMap) {
        const entry = src.seasonMap.find((m) => episode >= m.startEp && episode <= m.endEp);
        if (entry) {
          const seasonEp = episode - entry.startEp + 1;
          file = file.replace(/\{season(?::(\d+))?\}/g, (_, pad?: string) => { const s = String(entry.season); return pad ? s.padStart(Number(pad), "0") : s; });
          file = file.replace(/\{seasonEp(?::(\d+))?\}/g, (_, pad?: string) => { const s = String(seasonEp); return pad ? s.padStart(Number(pad), "0") : s; });
        }
      }
      return file;
    }
    return null;
  }

  function buildResult(src: EpisodeSource, file: string) {
    let collectionName = src.collection;
    if (src.seasonMap) {
      const entry = src.seasonMap.find((m) => episode >= m.startEp && episode <= m.endEp);
      if (entry) { collectionName = collectionName.replace(/\{season(?::(\d+))?\}/g, (_, pad?: string) => { const s = String(entry.season); return pad ? s.padStart(Number(pad), "0") : s; }); }
    }
    if (collectionName === "youtube") { return { url: `https://www.youtube.com/embed/${file}`, source: "youtube", needsProxy: false, dualAudio: false, audio: src.audio ?? "sub" as const }; }
    if (collectionName === "dropbox" || collectionName === "external") { return { url: file, source: "external", needsProxy: false, dualAudio: false, audio: src.audio ?? "sub" as const }; }
    const encodedFile = encodeURIComponent(file).replace(/%2F/g, "/");
    return { url: `https://archive.org/download/${collectionName}/${encodedFile}`, source: src.needsProxy ? "archive-mkv" : "archive", needsProxy: src.needsProxy ?? false, dualAudio: src.dualAudio ?? false, audio: src.audio ?? "sub" as const };
  }

  // 1) Try the wanted audio mode first.
  const preferred = matchingSources.find((src) => { const a = src.audio ?? "sub"; return a === wantedAudio || a === "both"; });
  if (preferred) {
    const file = tryResolve(preferred);
    if (file) return buildResult(preferred, file);
  }

  // 2) Fall through to the other audio mode if the wanted source doesn't
  //    have this specific episode (e.g. dub is missing ep 9 — play sub instead).
  const fallback = matchingSources.find((src) => { const a = src.audio ?? "sub"; return a === otherAudio || a === "both"; });
  if (fallback) {
    const file = tryResolve(fallback);
    if (file) return buildResult(fallback, file);
  }

  return null;
}

export function episodeHasSub(seed: SeedAnime, episode: number): boolean {
  if (!seed.episodeSources) return false;
  return seed.episodeSources.some((src) => {
    if (!(episode >= src.startEp && episode <= src.endEp)) return false;
    if (src.audio !== "sub" && src.audio !== "both") return false;
    // If episodeFiles is set, verify the specific episode exists.
    if (src.episodeFiles && !src.episodeFiles[episode]) return false;
    return true;
  });
}
export function episodeHasDub(seed: SeedAnime, episode: number): boolean {
  if (!seed.episodeSources) return false;
  return seed.episodeSources.some((src) => {
    if (!(episode >= src.startEp && episode <= src.endEp)) return false;
    if (src.audio !== "dub" && src.audio !== "both") return false;
    // If episodeFiles is set, verify the specific episode exists.
    if (src.episodeFiles && !src.episodeFiles[episode]) return false;
    return true;
  });
}

export function resolveSubtitleUrl(seed: SeedAnime, episode: number): string | null {
  // If the anime is explicitly marked as no-subtitles (e.g. sub player = JP audio raw),
  // return null so no subtitle track is loaded at all.
  if (seed.noSubtitles) return null;
  // Prefer a user-provided static VTT file (real dialogue subs dropped into
  // /public/subtitles/{malId}_e{ep}.vtt). This is the override path.
  if (seed.localSubtitlePattern) {
    let url = seed.localSubtitlePattern;
    url = url.replace(/\{ep(?::(\d+))?\}/g, (_, pad?: string) => { const s = String(episode); return pad ? s.padStart(Number(pad), "0") : s; });
    return url;
  }
  // Archive.org subtitle file path (rare; only set if the collection includes .vtt/.srt).
  if (seed.subtitlePattern) {
    let file = seed.subtitlePattern;
    file = file.replace(/\{ep(?::(\d+))?\}/g, (_, pad?: string) => { const s = String(episode); return pad ? s.padStart(Number(pad), "0") : s; });
    const collection = seed.episodeSources?.[0]?.collection ?? "";
    return `https://archive.org/download/${collection}/${file}`;
  }
  // Default: dynamic endpoint that returns a VTT with real MAL episode
  // titles (fetched from Jikan v4 and cached in the DB Episode table).
  // Cues are timed to standard 24-min anime episode structure (OP at 0:00,
  // main story at 1:30, ED at 21:30, next-episode preview at 23:30).
  return `/api/subtitles?malId=${seed.malId}&episode=${episode}`;
}

/**
 * Top 10 Anime of the Decade (2016-2026)
 * The #1 highest-scored TV anime from each year, ranked by score.
 */
export const TOP_10_DECADE: { malId: number; title: string; year: number; score: number; poster: string; rank: number }[] = [
  { malId: 38524, title: "Attack on Titan Season 3 Part 2", year: 2019, score: 9.05, poster: "https://cdn.myanimelist.net/images/anime/1517/100633l.jpg", rank: 1 },
  { malId: 34096, title: "Gintama.", year: 2017, score: 8.98, poster: "https://cdn.myanimelist.net/images/anime/3/83528l.jpg", rank: 2 },
  { malId: 41467, title: "Bleach: Thousand-Year Blood War", year: 2022, score: 8.98, poster: "https://cdn.myanimelist.net/images/anime/1908/135431l.jpg", rank: 3 },
  { malId: 37491, title: "Gintama.: Silver Soul Arc Part 2", year: 2018, score: 8.88, poster: "https://cdn.myanimelist.net/images/anime/1776/96566l.jpg", rank: 4 },
  { malId: 59978, title: "Frieren: Beyond Journey's End Season 2", year: 2026, score: 8.86, poster: "https://cdn.myanimelist.net/images/anime/1921/154528l.jpg", rank: 5 },
  { malId: 49387, title: "Vinland Saga Season 2", year: 2023, score: 8.83, poster: "https://cdn.myanimelist.net/images/anime/1170/124312l.jpg", rank: 6 },
  { malId: 32935, title: "Haikyuu!! Karasuno vs Shiratorizawa", year: 2016, score: 8.77, poster: "https://cdn.myanimelist.net/images/anime/7/81992l.jpg", rank: 7 },
  { malId: 39894, title: "Sound! Euphonium 3", year: 2024, score: 8.73, poster: "https://cdn.myanimelist.net/images/anime/1216/142086l.jpg", rank: 8 },
  { malId: 42938, title: "Fruits Basket: The Final", year: 2021, score: 8.93, poster: "https://cdn.myanimelist.net/images/anime/1085/114792l.jpg", rank: 9 },
  { malId: 58514, title: "The Apothecary Diaries Season 2", year: 2025, score: 8.91, poster: "https://cdn.myanimelist.net/images/anime/1025/147458l.jpg", rank: 10 },
];
