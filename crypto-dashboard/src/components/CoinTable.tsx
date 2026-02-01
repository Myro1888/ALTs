import { useMemo } from 'react';
import type { CoinAnalysis, Filters } from '../types';
import { formatCurrency, formatNumber, formatPercent, formatRatio } from '../utils/format';
import { SparklineChart } from './SparklineChart';
import { ArrowUp, ArrowDown, Flame } from 'lucide-react';

interface CoinTableProps {
  coins: CoinAnalysis[];
  filters: Filters;
  onSort: (key: keyof CoinAnalysis) => void;
}

function getScoreColor(score: number, type: 'price' | 'fundamental' | 'divergence'): string {
  if (type === 'price') {
    const intensity = Math.min(Math.abs(score) / 60, 1);
    return `rgba(239, 68, 68, ${0.3 + intensity * 0.7})`;
  }
  if (type === 'fundamental') {
    const intensity = Math.min(score / 80, 1);
    return `rgba(34, 197, 94, ${0.3 + intensity * 0.7})`;
  }
  if (score >= 50) return '#fbbf24';
  if (score >= 30) return '#22c55e';
  if (score >= 10) return '#4ade80';
  if (score >= 0) return '#9498ad';
  return '#f87171';
}

function getDivergenceClass(score: number): string {
  if (score >= 40) return 'high';
  if (score >= 20) return 'medium';
  if (score >= 0) return 'low';
  return 'negative';
}

type SortableColumn = {
  key: keyof CoinAnalysis;
  label: string;
  align?: 'left' | 'right';
};

const columns: SortableColumn[] = [
  { key: 'marketCapRank', label: '#', align: 'left' },
  { key: 'name', label: 'Asset', align: 'left' },
  { key: 'marketCap', label: 'Market Cap', align: 'right' },
  { key: 'divergenceScore', label: 'Divergence', align: 'right' },
  { key: 'priceTrendScore', label: 'Price Trend', align: 'right' },
  { key: 'fundamentalScore', label: 'Fundamentals', align: 'right' },
  { key: 'priceChange30d', label: '30d', align: 'right' },
  { key: 'priceChange90d', label: '90d', align: 'right' },
  { key: 'socialScore', label: 'Social', align: 'right' },
  { key: 'devScore', label: 'Dev Activity', align: 'right' },
  { key: 'volumeMcapRatio', label: 'Vol/MCap', align: 'right' },
  { key: 'symbol', label: '7d Chart', align: 'right' },
];

export function CoinTable({ coins, filters, onSort }: CoinTableProps) {
  const filteredCoins = useMemo(() => {
    return coins.filter((coin) => {
      if (coin.divergenceScore < filters.minDivergence) return false;
      if (coin.totalVolume < filters.minVolume) return false;
      return true;
    });
  }, [coins, filters]);

  const sortedCoins = useMemo(() => {
    const sorted = [...filteredCoins].sort((a, b) => {
      const aVal = a[filters.sortBy];
      const bVal = b[filters.sortBy];
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return filters.sortDir === 'desc' ? bVal - aVal : aVal - bVal;
      }
      return filters.sortDir === 'desc'
        ? String(bVal).localeCompare(String(aVal))
        : String(aVal).localeCompare(String(bVal));
    });
    return sorted;
  }, [filteredCoins, filters.sortBy, filters.sortDir]);

  return (
    <div className="table-container">
      <div className="table-header-info">
        <h2>Divergence Opportunities</h2>
        <span className="count">
          {sortedCoins.length} of {coins.length} coins shown
        </span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={filters.sortBy === col.key ? 'active' : ''}
                  style={{ textAlign: col.align }}
                  onClick={() => onSort(col.key)}
                >
                  {col.label}
                  {filters.sortBy === col.key && (
                    <span className="sort-arrow">
                      {filters.sortDir === 'desc' ? '\u25BC' : '\u25B2'}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedCoins.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  <div className="empty-state">
                    <h3>No coins match your filters</h3>
                    <p>Try adjusting the minimum divergence or volume thresholds</p>
                  </div>
                </td>
              </tr>
            ) : (
              sortedCoins.map((coin) => (
                <tr
                  key={coin.id}
                  className={coin.divergenceScore >= 40 ? 'highlight' : ''}
                >
                  <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                    {coin.marketCapRank}
                  </td>
                  <td>
                    <div className="coin-info">
                      <img
                        className="coin-logo"
                        src={coin.image}
                        alt={coin.name}
                        loading="lazy"
                      />
                      <div>
                        <div className="coin-name">
                          {coin.name}
                          {coin.divergenceScore >= 40 && (
                            <>
                              {' '}
                              <span className="on-sale-tag">
                                <Flame size={10} /> ON SALE
                              </span>
                            </>
                          )}
                        </div>
                        <div className="coin-symbol">{coin.symbol}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <span className="metric-cell">
                      {formatCurrency(coin.marketCap)}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <span
                      className={`divergence-badge ${getDivergenceClass(coin.divergenceScore)}`}
                    >
                      {coin.divergenceScore >= 30 && <Flame size={12} />}
                      {coin.divergenceScore.toFixed(1)}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="score-bar">
                      <span
                        className="score-cell"
                        style={{ color: getScoreColor(coin.priceTrendScore, 'price') }}
                      >
                        {coin.priceTrendScore.toFixed(1)}
                      </span>
                      <div className="score-bar-track">
                        <div
                          className="score-bar-fill"
                          style={{
                            width: `${Math.abs(coin.priceTrendScore)}%`,
                            background: getScoreColor(coin.priceTrendScore, 'price'),
                          }}
                        />
                      </div>
                    </div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="score-bar">
                      <span
                        className="score-cell"
                        style={{
                          color: getScoreColor(coin.fundamentalScore, 'fundamental'),
                        }}
                      >
                        {coin.fundamentalScore.toFixed(1)}
                      </span>
                      <div className="score-bar-track">
                        <div
                          className="score-bar-fill"
                          style={{
                            width: `${coin.fundamentalScore}%`,
                            background: getScoreColor(
                              coin.fundamentalScore,
                              'fundamental'
                            ),
                          }}
                        />
                      </div>
                    </div>
                  </td>
                  <td
                    style={{ textAlign: 'right' }}
                    className={
                      coin.priceChange30d >= 0 ? 'change-positive' : 'change-negative'
                    }
                  >
                    <span className="score-cell">
                      {coin.priceChange30d >= 0 ? (
                        <ArrowUp size={12} style={{ verticalAlign: 'middle' }} />
                      ) : (
                        <ArrowDown size={12} style={{ verticalAlign: 'middle' }} />
                      )}
                      {formatPercent(coin.priceChange30d)}
                    </span>
                  </td>
                  <td
                    style={{ textAlign: 'right' }}
                    className={
                      coin.priceChange90d >= 0 ? 'change-positive' : 'change-negative'
                    }
                  >
                    <span className="score-cell">
                      {formatPercent(coin.priceChange90d)}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="metric-cell">
                      <div className="metric-value">
                        {coin.socialScore.toFixed(0)}
                      </div>
                      <div className="metric-label">
                        {formatNumber(coin.twitterFollowers)} tw
                      </div>
                    </div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="metric-cell">
                      <div className="metric-value">
                        {coin.devScore.toFixed(0)}
                      </div>
                      <div className="metric-label">
                        {coin.githubCommits4w} commits/4w
                      </div>
                    </div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <span className="metric-cell">
                      {formatRatio(coin.volumeMcapRatio)}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="sparkline-cell">
                      <SparklineChart data={coin.sparkline7d} />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
