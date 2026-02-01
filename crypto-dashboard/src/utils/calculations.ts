import type { CoinGeckoMarketData, CoinDetailData, CoinAnalysis } from '../types';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Price Trend Score: -100 to 0
 * Weighted: 30d (50%) + 90d (30%) + 7d (20%)
 * More negative = stronger downtrend
 */
function calculatePriceTrendScore(
  change7d: number,
  change30d: number,
  change90d: number
): number {
  const weighted = change30d * 0.5 + change90d * 0.3 + change7d * 0.2;
  return clamp(weighted, -100, 0);
}

/**
 * Social Score: 0-100 based on social presence magnitude.
 * Since we only get a snapshot (not historical), we use magnitude-based scoring
 * with the active engagement ratio as a growth proxy.
 */
function calculateSocialScore(
  twitterFollowers: number,
  redditSubscribers: number,
  redditActive48h: number
): { score: number; growthPct: number } {
  let score = 0;

  // Twitter magnitude scoring (log scale)
  if (twitterFollowers > 0) {
    const twitterLog = Math.log10(twitterFollowers);
    // 1K = 3, 10K = 4, 100K = 5, 1M = 6
    score += clamp(((twitterLog - 2) / 4) * 40, 0, 40);
  }

  // Reddit magnitude scoring (log scale)
  if (redditSubscribers > 0) {
    const redditLog = Math.log10(redditSubscribers);
    score += clamp(((redditLog - 2) / 4) * 30, 0, 30);
  }

  // Reddit engagement ratio as proxy for community health
  let engagementRatio = 0;
  if (redditSubscribers > 0 && redditActive48h > 0) {
    engagementRatio = (redditActive48h / redditSubscribers) * 100;
    // Good engagement: >1% active in 48h
    score += clamp((engagementRatio / 5) * 30, 0, 30);
  }

  // Growth proxy based on engagement
  const growthPct = clamp(engagementRatio * 10, 0, 100);

  return { score: clamp(score, 0, 100), growthPct };
}

/**
 * Dev Score: 0-100 based on GitHub activity.
 * Uses commit count (4 weeks), stars, and forks.
 */
function calculateDevScore(
  commits4w: number,
  stars: number,
  forks: number,
  commitSeries: number[]
): { score: number; trend: number } {
  let score = 0;

  // Commit activity (0-50 points)
  // 10 commits/week = decent, 40+/week = very active => 160+ per 4 weeks
  score += clamp((commits4w / 160) * 50, 0, 50);

  // Stars as quality indicator (0-25 points)
  if (stars > 0) {
    const starLog = Math.log10(stars);
    // 100 = 2, 1K = 3, 10K = 4, 100K = 5
    score += clamp(((starLog - 1) / 4) * 25, 0, 25);
  }

  // Forks as engagement indicator (0-25 points)
  if (forks > 0) {
    const forkLog = Math.log10(forks);
    score += clamp(((forkLog - 1) / 3) * 25, 0, 25);
  }

  // Trend: compare recent half of commit series to earlier half
  let trend = 0;
  if (commitSeries.length >= 4) {
    const mid = Math.floor(commitSeries.length / 2);
    const firstHalf = commitSeries.slice(0, mid).reduce((a, b) => a + b, 0) / mid;
    const secondHalf = commitSeries.slice(mid).reduce((a, b) => a + b, 0) / (commitSeries.length - mid);
    if (firstHalf > 0) {
      trend = ((secondHalf - firstHalf) / firstHalf) * 100;
    } else if (secondHalf > 0) {
      trend = 100;
    }
  }

  return { score: clamp(score, 0, 100), trend: clamp(trend, -100, 100) };
}

/**
 * Volume Score: 0-100 based on volume/mcap ratio.
 * Higher ratio = more liquid and actively traded.
 */
function calculateVolumeScore(
  volume24h: number,
  marketCap: number
): { score: number; ratio: number } {
  if (marketCap <= 0) return { score: 0, ratio: 0 };

  const ratio = volume24h / marketCap;

  // Typical range: 0.01 (1%) to 0.3 (30%)
  // Healthy: 3-10% volume/mcap ratio
  let score = 0;
  if (ratio >= 0.03 && ratio <= 0.3) {
    score = clamp((ratio / 0.1) * 100, 0, 100);
  } else if (ratio > 0.3) {
    // Very high volume might indicate panic or manipulation
    score = 60;
  } else {
    score = clamp((ratio / 0.03) * 50, 0, 50);
  }

  return { score: clamp(score, 0, 100), ratio };
}

/**
 * Fundamental Growth Score: 0-100
 * Composite of social (35%), dev (40%), volume (25%)
 */
function calculateFundamentalScore(
  socialScore: number,
  devScore: number,
  volumeScore: number
): number {
  return clamp(
    socialScore * 0.35 + devScore * 0.4 + volumeScore * 0.25,
    0,
    100
  );
}

/**
 * Divergence Score: -100 to +100
 * Positive = fundamentals outpacing price = potential buy signal
 */
function calculateDivergenceScore(
  fundamentalScore: number,
  priceTrendScore: number
): number {
  // priceTrendScore is negative (-100 to 0), fundamentalScore is positive (0 to 100)
  // We want: high fundamental + deep negative price = high positive divergence
  return clamp((fundamentalScore + Math.abs(priceTrendScore)) / 2, -100, 100);
}

/**
 * Estimate 90-day price change from available data.
 * Uses 1y change to approximate if 90d is not directly available.
 */
function estimate90dChange(
  change30d: number,
  change1y: number | null,
  sparkline: number[]
): number {
  // If we have 1y data, estimate 90d as a proportion
  if (change1y !== null) {
    // Rough approximation: 90d ≈ 30d * scale toward 1y
    const ratio = change30d !== 0 ? change1y / (change30d * 4) : 1;
    return clamp(change30d * Math.min(Math.abs(ratio), 3) * Math.sign(ratio || 1), -95, 200);
  }

  // Fallback: use sparkline trend to extrapolate
  if (sparkline.length >= 2) {
    const first = sparkline[0];
    const last = sparkline[sparkline.length - 1];
    if (first > 0) {
      const weekChange = ((last - first) / first) * 100;
      // Very rough: 90d ≈ 7d trend * ~12 (dampened)
      return clamp(weekChange * 4, -95, 200);
    }
  }

  return change30d * 1.5;
}

export function analyzeCoins(
  marketData: CoinGeckoMarketData[],
  detailData: Map<string, CoinDetailData>
): CoinAnalysis[] {
  return marketData.map((coin) => {
    const detail = detailData.get(coin.id);

    const change7d = coin.price_change_percentage_7d_in_currency ?? 0;
    const change30d = coin.price_change_percentage_30d_in_currency ?? 0;
    const sparkline = coin.sparkline_in_7d?.price ?? [];
    const change90d = estimate90dChange(
      change30d,
      coin.price_change_percentage_1y_in_currency ?? null,
      sparkline
    );

    const priceTrendScore = calculatePriceTrendScore(change7d, change30d, change90d);

    const twitterFollowers = detail?.community_data?.twitter_followers ?? 0;
    const redditSubscribers = detail?.community_data?.reddit_subscribers ?? 0;
    const redditActive = detail?.community_data?.reddit_accounts_active_48h ?? 0;
    const githubCommits4w = detail?.developer_data?.commit_count_4_weeks ?? 0;
    const githubStars = detail?.developer_data?.stars ?? 0;
    const githubForks = detail?.developer_data?.forks ?? 0;
    const commitSeries = detail?.developer_data?.last_4_weeks_commit_activity_series ?? [];

    const { score: socialScore, growthPct: socialGrowthPct } = calculateSocialScore(
      twitterFollowers,
      redditSubscribers,
      redditActive
    );
    const { score: devScore, trend: devTrend } = calculateDevScore(
      githubCommits4w,
      githubStars,
      githubForks,
      commitSeries
    );
    const { score: volumeScore, ratio: volumeMcapRatio } = calculateVolumeScore(
      coin.total_volume,
      coin.market_cap
    );

    const fundamentalScore = calculateFundamentalScore(socialScore, devScore, volumeScore);
    const divergenceScore = calculateDivergenceScore(fundamentalScore, priceTrendScore);

    return {
      id: coin.id,
      symbol: coin.symbol,
      name: coin.name,
      image: coin.image,
      currentPrice: coin.current_price,
      marketCap: coin.market_cap,
      marketCapRank: coin.market_cap_rank,
      totalVolume: coin.total_volume,
      priceChange7d: change7d,
      priceChange30d: change30d,
      priceChange90d: change90d,
      sparkline7d: sparkline,
      priceTrendScore,
      socialScore,
      devScore,
      volumeScore,
      fundamentalScore,
      divergenceScore,
      twitterFollowers,
      redditSubscribers,
      githubCommits4w,
      githubStars,
      githubForks,
      volumeMcapRatio,
      socialGrowthPct,
      devTrend,
    };
  });
}
