import axios from 'axios';
import type { CoinGeckoMarketData, CoinDetailData } from '../types';

const BASE_URL = 'https://api.coingecko.com/api/v3';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
});

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchMarketDataPage(
  page: number,
  perPage: number = 250
): Promise<CoinGeckoMarketData[]> {
  const { data } = await api.get<CoinGeckoMarketData[]>('/coins/markets', {
    params: {
      vs_currency: 'usd',
      order: 'market_cap_desc',
      per_page: perPage,
      page,
      sparkline: true,
      price_change_percentage: '7d,30d,1y',
    },
  });
  return data;
}

export async function fetchAllMarketData(
  onProgress?: (loaded: number, phase: string) => void
): Promise<CoinGeckoMarketData[]> {
  const allCoins: CoinGeckoMarketData[] = [];
  const perPage = 250;
  let page = 1;

  while (true) {
    onProgress?.(allCoins.length, `Fetching market data (page ${page})...`);
    try {
      const pageData = await fetchMarketDataPage(page, perPage);
      if (pageData.length === 0) break;
      allCoins.push(...pageData);
      // CoinGecko free tier caps at ~10,000 coins; stop if page returned less than full
      if (pageData.length < perPage) break;
      page++;
      await delay(1500);
    } catch {
      // Stop paginating on error (likely rate limit or end of data)
      break;
    }
  }

  return allCoins;
}

export async function fetchCoinDetail(coinId: string): Promise<CoinDetailData> {
  const { data } = await api.get<CoinDetailData>(`/coins/${coinId}`, {
    params: {
      localization: false,
      tickers: false,
      market_data: false,
      community_data: true,
      developer_data: true,
      sparkline: false,
    },
  });
  return data;
}

export async function fetchCoinDetails(
  coinIds: string[],
  onProgress?: (loaded: number, total: number) => void,
  onBatchComplete?: (results: Map<string, CoinDetailData>) => void
): Promise<Map<string, CoinDetailData>> {
  const results = new Map<string, CoinDetailData>();
  // CoinGecko free tier: ~10-30 req/min. Sequential requests with delay.
  const batchDelay = 4000;
  let consecutiveFailures = 0;

  for (let i = 0; i < coinIds.length; i++) {
    const id = coinIds[i];
    try {
      const detail = await fetchCoinDetail(id);
      results.set(id, detail);
      consecutiveFailures = 0;
    } catch {
      consecutiveFailures++;
      if (consecutiveFailures >= 5) {
        // Rate-limited hard — stop fetching
        break;
      }
      // Back off on failure
      await delay(batchDelay * consecutiveFailures);
      continue;
    }

    onProgress?.(i + 1, coinIds.length);
    onBatchComplete?.(results);

    if (i + 1 < coinIds.length) {
      await delay(batchDelay);
    }
  }

  return results;
}
