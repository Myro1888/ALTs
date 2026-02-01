export interface CoinGeckoMarketData {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  total_volume: number;
  price_change_percentage_7d_in_currency: number | null;
  price_change_percentage_30d_in_currency: number | null;
  price_change_percentage_1y_in_currency: number | null;
  sparkline_in_7d: { price: number[] } | null;
  ath: number;
  ath_change_percentage: number;
}

export interface CoinDetailData {
  id: string;
  community_data: {
    twitter_followers: number | null;
    reddit_subscribers: number | null;
    reddit_accounts_active_48h: number | null;
  };
  developer_data: {
    forks: number | null;
    stars: number | null;
    commit_count_4_weeks: number | null;
    last_4_weeks_commit_activity_series: number[] | null;
  };
}

export interface CoinAnalysis {
  id: string;
  symbol: string;
  name: string;
  image: string;
  currentPrice: number;
  marketCap: number;
  marketCapRank: number;
  totalVolume: number;
  priceChange7d: number;
  priceChange30d: number;
  priceChange90d: number;
  sparkline7d: number[];
  priceTrendScore: number;
  socialScore: number;
  devScore: number;
  volumeScore: number;
  fundamentalScore: number;
  divergenceScore: number;
  twitterFollowers: number;
  redditSubscribers: number;
  githubCommits4w: number;
  githubStars: number;
  githubForks: number;
  volumeMcapRatio: number;
  socialGrowthPct: number;
  devTrend: number;
}

export interface Filters {
  minDivergence: number;
  minVolume: number;
  timeframeFocus: '30d' | '90d';
  sortBy: keyof CoinAnalysis;
  sortDir: 'asc' | 'desc';
}
