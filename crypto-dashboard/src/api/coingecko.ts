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
  onProgress?: (loaded: number, total: number) => void
): Promise<Map<string, CoinDetailData>> {
  const results = new Map<string, CoinDetailData>();
  const batchSize = 5;

  for (let i = 0; i < coinIds.length; i += batchSize) {
    const batch = coinIds.slice(i, i + batchSize);
    const promises = batch.map(async (id) => {
      try {
        const detail = await fetchCoinDetail(id);
        return { id, detail };
      } catch {
        return { id, detail: null };
      }
    });

    const batchResults = await Promise.all(promises);
    for (const { id, detail } of batchResults) {
      if (detail) {
        results.set(id, detail);
      }
    }

    onProgress?.(Math.min(i + batchSize, coinIds.length), coinIds.length);

    if (i + batchSize < coinIds.length) {
      await delay(1500);
    }
  }

  return results;
}
