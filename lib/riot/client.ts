/**
 * Browser-side Riot API client. The API answers CORS with `*` and accepts the
 * key as `?api_key=`, so a static site can call it directly. The key is the
 * user's own (developer or personal key from developer.riotgames.com) and
 * never leaves their browser except to api.riotgames.com.
 *
 * Rate limits for a development key: 20 requests / s, 100 / 2 min. We keep a
 * small concurrency and honour Retry-After on 429.
 */
import { PLATFORMS, type AccountDto, type LeagueEntryDto, type MatchDto, type Platform, type Region, type SummonerDto } from "./types";

export class RiotError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export interface RiotClientOptions {
  apiKey: string;
  platform: Platform;
  fetchImpl?: typeof fetch;
}

const STATUS_TEXT: Record<number, string> = {
  400: "bad request",
  401: "API key missing or malformed",
  403: "API key invalid or expired (development keys last 24 hours; make a new one at developer.riotgames.com)",
  404: "not found",
  415: "unsupported media type",
  429: "rate limited",
  500: "Riot server error",
  502: "Riot gateway error",
  503: "Riot service unavailable",
  504: "Riot gateway timeout",
};

export function regionOf(platform: Platform): Region {
  return PLATFORMS.find((p) => p.id === platform)?.region ?? "europe";
}

export function parseRiotId(input: string): { gameName: string; tagLine: string } | null {
  const s = input.trim();
  const m = s.match(/^(.+?)\s*#\s*([A-Za-z0-9]{2,7})$/);
  if (!m) return null;
  return { gameName: m[1]!.trim(), tagLine: m[2]!.trim() };
}

export class RiotClient {
  private key: string;
  private platform: Platform;
  private region: Region;
  private f: typeof fetch;
  constructor(o: RiotClientOptions) {
    this.key = o.apiKey.trim();
    this.platform = o.platform;
    this.region = regionOf(o.platform);
    this.f = o.fetchImpl ?? ((...a) => fetch(...a));
  }

  /** Raw GET against a routing host ("europe") or platform ("euw1"); path may include a query string. */
  async request<T>(host: string, path: string, attempt = 0): Promise<T> {
    const url = `https://${host}.api.riotgames.com${path}${path.includes("?") ? "&" : "?"}api_key=${encodeURIComponent(this.key)}`;
    const res = await this.f(url);
    if (res.status === 429 && attempt < 3) {
      const wait = Number(res.headers.get("Retry-After") ?? "2") * 1000;
      await new Promise((r) => setTimeout(r, Math.min(15000, wait || 2000)));
      return this.request<T>(host, path, attempt + 1);
    }
    if (!res.ok) throw new RiotError(`${STATUS_TEXT[res.status] ?? `HTTP ${res.status}`} (${path.split("?")[0]})`, res.status);
    return (await res.json()) as T;
  }

  accountByRiotId(gameName: string, tagLine: string): Promise<AccountDto> {
    return this.request<AccountDto>(this.region, `/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`);
  }
  summonerByPuuid(puuid: string): Promise<SummonerDto> {
    return this.request<SummonerDto>(this.platform, `/tft/summoner/v1/summoners/by-puuid/${puuid}`);
  }
  async leagueByPuuid(puuid: string): Promise<LeagueEntryDto[]> {
    try {
      return await this.request<LeagueEntryDto[]>(this.platform, `/tft/league/v1/by-puuid/${puuid}`);
    } catch (e) {
      if (e instanceof RiotError && (e.status === 404 || e.status === 403)) return [];
      throw e;
    }
  }
  matchIds(puuid: string, count = 20, start = 0): Promise<string[]> {
    return this.request<string[]>(this.region, `/tft/match/v1/matches/by-puuid/${puuid}/ids?start=${start}&count=${Math.min(200, count)}`);
  }
  match(id: string): Promise<MatchDto> {
    return this.request<MatchDto>(this.region, `/tft/match/v1/matches/${id}`);
  }

  /** Fetch several matches with bounded concurrency; skips ids that fail individually. */
  async matches(ids: string[], concurrency = 4, onProgress?: (done: number, total: number) => void): Promise<{ ok: MatchDto[]; failed: string[] }> {
    const ok: MatchDto[] = [];
    const failed: string[] = [];
    let i = 0;
    let done = 0;
    const worker = async () => {
      while (i < ids.length) {
        const id = ids[i++]!;
        try {
          ok.push(await this.match(id));
        } catch (e) {
          if (e instanceof RiotError && (e.status === 401 || e.status === 403)) throw e;
          failed.push(id);
        }
        done++;
        onProgress?.(done, ids.length);
      }
    };
    await Promise.all(Array.from({ length: Math.min(concurrency, ids.length) }, worker));
    return { ok, failed };
  }
}
