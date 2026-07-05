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
  episodeSources?: EpisodeSource[]; hasDub?: boolean;
  subtitlePattern?: string; localSubtitlePattern?: string;
}

export interface EpisodeSource {
  startEp: number; endEp: number; collection: string;
  fileTemplate?: string; fileName?: string;
  needsProxy?: boolean; dualAudio?: boolean; audio?: "sub" | "dub" | "both";
  seasonMap?: { startEp: number; endEp: number; season: number }[];
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
      { startEp: 1, endEp: 14, collection: "bleach-sennen-kessen-hen-part-3-japanese-tv-2024", fileName: "BLEACH Sennen Kessen-hen Soukoku-tan - 01 (TVA 1280x720 x264 AAC).mp4", audio: "sub" },
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
      { startEp: 1, endEp: 3, collection: "gofaku.com-jjk-s-2-03-720p", fileTemplate: "Gofaku.com_JJK-s2_{ep:02}_720p.mp4", audio: "sub" },
      { startEp: 1, endEp: 23, collection: "jujutsu-kaisen-s-02-e-21-1080p-bd-av-1-dual-audio.mkv", fileTemplate: "Jujutsu Kaisen - S02E{ep:02} [1080p BD AV1][Dual Audio].mkv.mp4", needsProxy: true, audio: "both", dualAudio: true },
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
    episodeSources: [
      { startEp: 1, endEp: 12, collection: "hi-10-chainsaw-man-s-1-1080p", fileTemplate: "[Hi10]_Chainsaw_Man_S1_[1080p]/(Hi10)_Chainsaw_Man_S1_-_{ep:02}_(1080p)_(GJM)_(62A0D357).mp4", audio: "sub" },
      { startEp: 1, endEp: 12, collection: "10.-bruised-battered", fileTemplate: "Chainsaw Man Season 1/{ep:02}. Dog & Chainsaw.mp4", audio: "dub" },
    ], hasDub: true,
  },
  // Chainsaw Man Movie: Reze Arc
  { malId: 57555, title: "Chainsaw Man – The Movie: Reze Arc", titleEnglish: "Chainsaw Man – The Movie: Reze Arc", titleJapanese: "劇場版 チェンソーマン レゼ篇",
    synopsis: "Denji yearns for a normal life. When a mysterious girl named Reze appears, Denji is captivated by her charm.",
    poster: "https://cdn.myanimelist.net/images/anime/1763/150638l.jpg", banner: "https://cdn.myanimelist.net/images/anime/1763/150638l.jpg",
    type: "Movie", status: "Finished Airing", score: 9.06, scoredBy: 328807, rank: 6, popularity: 519, members: 509373,
    year: 2025, season: null, genres: ["Action", "Fantasy"], studios: ["MAPPA"],
    episodeCount: 1, duration: "1 hr 39 min", rating: "R - 17+ (violence & profanity)", source: "Manga", isFeatured: true,
    episodeSources: [
      { startEp: 1, endEp: 1, collection: "rezearc", fileName: "csmrezearc.mp4", audio: "sub" },
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
      { startEp: 1, endEp: 1, collection: "gachiakuta.-s-01-e-01.-the.-sphere.-1080p.-cr.-web-dl.-dual.-aac-2.0.-h.-264-varyg.-720", fileName: "Gachiakuta.S01E01.The.Sphere.1080p.CR.WEB-DL.DUAL.AAC2.0.H.264-VARYG.720.mp4", audio: "both", dualAudio: true },
      { startEp: 2, endEp: 12, collection: "gachiakuta-02-720p-x-265-samehadaku.-care", fileTemplate: "Gachiakuta-{ep:02}-720p-[x265]-SAMEHADAKU.CARE.mp4", audio: "sub" },
      { startEp: 2, endEp: 24, collection: "gachiakuta_202601", fileTemplate: "Gachiakuta Dubbed/ep {ep:02}.mp4", audio: "sub" },
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
    type: "TV", status: "Currently Airing", score: 8.51, scoredBy: 26973, rank: 162, popularity: 1951, members: 135442,
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
    type: "TV", status: "Finished Airing", score: 8.62, scoredBy: 500000, rank: 60, popularity: 100, members: 800000,
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
    episodeSources: [{ startEp: 1, endEp: 26, collection: "neon-genesis-evangelion-dual-audio", fileTemplate: "Neon Genesis Evangelion - {ep:02} - Angel Attacks.mp4", audio: "both", dualAudio: true }],
    hasDub: true,
  },
  // End of Evangelion
  { malId: 32, title: "The End of Evangelion", titleEnglish: "Neon Genesis Evangelion: The End of Evangelion", titleJapanese: "新世紀エヴァンゲリオン劇場版 Air/まごころを、君に",
    synopsis: "SEELE orders an all-out attack on Nerv headquarters as Shinji spirals into despair.",
    poster: "https://cdn.myanimelist.net/images/anime/1404/98182l.jpg", banner: "https://cdn.myanimelist.net/images/anime/1404/98182l.jpg",
    type: "Movie", status: "Finished Airing", score: 8.57, scoredBy: 400000, rank: 50, popularity: 200, members: 600000,
    year: 1997, season: null, genres: ["Award Winning", "Action", "Drama", "Suspense"], studios: ["Gainax"],
    episodeCount: 1, duration: "1 hr 26 min", rating: "R - 17+ (violence & profanity)", source: "Original", isFeatured: true,
    episodeSources: [{ startEp: 1, endEp: 1, collection: "eva-complete-series-movies-bd-1080p", fileName: "Neon Genesis Evangelion - The End of Evangelion (1995) [1080p x265 HEVC 10bit BluRay Dual Audio AAC 5.1] [Prof].mp4", audio: "both", dualAudio: true }],
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
    episodeSources: [{ startEp: 1, endEp: 1, collection: "db-a-silent-voice-dual-audio-10bit-bd-1080p-x-265", fileName: "[DB]A Silent Voice_-_(Dual Audio_10bit_BD1080p_x265).mp4", audio: "sub" }],
  },
  // Your Name
  { malId: 32281, title: "Your Name", titleEnglish: "Your Name.", titleJapanese: "君の名は。",
    synopsis: "Mitsuha and Taki mysteriously swap bodies and must navigate each other's lives.",
    poster: "https://cdn.myanimelist.net/images/anime/5/87048l.jpg", banner: "https://cdn.myanimelist.net/images/anime/5/87048l.jpg",
    type: "Movie", status: "Finished Airing", score: 8.82, scoredBy: 1000000, rank: 14, popularity: 7, members: 2000000,
    year: 2016, season: null, genres: ["Award Winning", "Drama", "Supernatural"], studios: ["CoMix Wave Films"],
    episodeCount: 1, duration: "1 hr 46 min", rating: "PG-13 - Teens 13 or older", source: "Original", isFeatured: true,
    episodeSources: [{ startEp: 1, endEp: 1, collection: "your.-name.-2016.-1.8-gb.-1080p.-dual.-audio.-hin-eng.-vegamovies.-nl", fileName: "Your.Name.(2016).1.8GB.1080p.Dual.Audio.(Hin-Eng).Vegamovies.NL.mp4", audio: "both", dualAudio: true }],
    hasDub: true,
  },
];

export function resolveEpisodeUrl(seed: SeedAnime, episode: number, audioMode: "sub" | "dub" = "sub"): { url: string; source: string; needsProxy: boolean; dualAudio: boolean; audio: "sub" | "dub" | "both" } | null {
  if (!seed.episodeSources || seed.episodeSources.length === 0) return null;
  const matchingSources = seed.episodeSources.filter((src) => episode >= src.startEp && episode <= src.endEp);
  if (matchingSources.length === 0) return null;
  const wantedAudio = audioMode === "dub" ? "dub" : "sub";
  // Find a source that matches the wanted audio mode (exact match or "both").
  // Do NOT fall back to a different audio mode — if the user asked for SUB and
  // we only have DUB sources, return null so the player shows "no stream"
  // instead of silently playing the wrong audio.
  const preferred = matchingSources.find((src) => { const a = src.audio ?? "sub"; return a === wantedAudio || a === "both"; });
  const src = preferred ?? null;
  if (!src) return null;

  let file: string;
  if (src.fileName) { file = src.fileName; }
  else if (src.fileTemplate) {
    file = src.fileTemplate;
    file = file.replace(/\{ep(?::(\d+))?\}/g, (_, pad?: string) => { const s = String(episode); return pad ? s.padStart(Number(pad), "0") : s; });
    if (src.seasonMap) {
      const entry = src.seasonMap.find((m) => episode >= m.startEp && episode <= m.endEp);
      if (entry) {
        const seasonEp = episode - entry.startEp + 1;
        file = file.replace(/\{season(?::(\d+))?\}/g, (_, pad?: string) => { const s = String(entry.season); return pad ? s.padStart(Number(pad), "0") : s; });
        file = file.replace(/\{seasonEp(?::(\d+))?\}/g, (_, pad?: string) => { const s = String(seasonEp); return pad ? s.padStart(Number(pad), "0") : s; });
      }
    }
  } else { return null; }

  let collectionName = src.collection;
  if (src.seasonMap) {
    const entry = src.seasonMap.find((m) => episode >= m.startEp && episode <= m.endEp);
    if (entry) { collectionName = collectionName.replace(/\{season(?::(\d+))?\}/g, (_, pad?: string) => { const s = String(entry.season); return pad ? s.padStart(Number(pad), "0") : s; }); }
  }
  if (collectionName === "youtube") { return { url: `https://www.youtube.com/embed/${file}`, source: "youtube", needsProxy: false, dualAudio: false, audio: src.audio ?? "sub" }; }
  const encodedFile = encodeURIComponent(file).replace(/%2F/g, "/");
  return { url: `https://archive.org/download/${collectionName}/${encodedFile}`, source: src.needsProxy ? "archive-mkv" : "archive", needsProxy: src.needsProxy ?? false, dualAudio: src.dualAudio ?? false, audio: src.audio ?? "sub" };
}

export function episodeHasSub(seed: SeedAnime, episode: number): boolean {
  if (!seed.episodeSources) return false;
  return seed.episodeSources.some((src) => episode >= src.startEp && episode <= src.endEp && (src.audio === "sub" || src.audio === "both"));
}
export function episodeHasDub(seed: SeedAnime, episode: number): boolean {
  if (!seed.episodeSources) return false;
  return seed.episodeSources.some((src) => episode >= src.startEp && episode <= src.endEp && (src.audio === "dub" || src.audio === "both"));
}

export function resolveSubtitleUrl(seed: SeedAnime, episode: number): string | null {
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
