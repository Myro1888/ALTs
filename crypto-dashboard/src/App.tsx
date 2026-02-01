import { useState, useCallback, useEffect } from 'react';
import type { CoinAnalysis, Filters } from './types';
import { fetchMarketData, fetchCoinDetails } from './api/coingecko';
import { analyzeCoins } from './utils/calculations';
import { SummaryCards } from './components/SummaryCards';
import { FiltersBar } from './components/Filters';
import { CoinTable } from './components/CoinTable';
import { AlertCircle } from 'lucide-react';

const DEFAULT_FILTERS: Filters = {
  minDivergence: 0,
  minVolume: 1_000_000,
  timeframeFocus: '30d',
  sortBy: 'divergenceScore',
  sortDir: 'desc',
};

export default function App() {
  const [coins, setCoins] = useState<CoinAnalysis[]>([]);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ loaded: 0, total: 0, phase: '' });
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setProgress({ loaded: 0, total: 0, phase: 'Fetching market data...' });

    try {
      const marketData = await fetchMarketData(1, 100);
      setProgress({ loaded: 0, total: marketData.length, phase: 'Fetching coin details...' });

      const coinIds = marketData.map((c) => c.id);
      const detailData = await fetchCoinDetails(coinIds, (loaded, total) => {
        setProgress({ loaded, total, phase: `Fetching details (${loaded}/${total})...` });
      });

      setProgress({ loaded: 0, total: 0, phase: 'Analyzing divergence...' });
      const analyzed = analyzeCoins(marketData, detailData);

      // Sort by divergence score descending by default
      analyzed.sort((a, b) => b.divergenceScore - a.divergenceScore);

      setCoins(analyzed);
      setLastUpdated(new Date());
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch data';
      setError(message);
      console.error('Data load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSort = useCallback(
    (key: keyof CoinAnalysis) => {
      setFilters((prev) => ({
        ...prev,
        sortBy: key,
        sortDir: prev.sortBy === key && prev.sortDir === 'desc' ? 'asc' : 'desc',
      }));
    },
    []
  );

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <div className="header-title">
            <div>
              <h1>Crypto Divergence Scanner</h1>
              <div className="subtitle">
                Find quality projects on sale — strong fundamentals, weak price
              </div>
            </div>
          </div>
          <div className="header-status">
            <span className={`status-dot ${loading ? 'loading' : ''}`} />
            {loading ? (
              <span>{progress.phase}</span>
            ) : lastUpdated ? (
              <span>Updated {lastUpdated.toLocaleTimeString()}</span>
            ) : (
              <span>Ready</span>
            )}
          </div>
        </div>
      </header>

      <main className="main-content">
        {error && (
          <div className="error-banner">
            <AlertCircle size={16} />
            {error}
            {error.includes('429') && ' — CoinGecko rate limit hit. Wait a minute and retry.'}
          </div>
        )}

        {loading && coins.length === 0 ? (
          <div className="loading-container">
            <div className="loading-spinner" />
            <div className="loading-text">{progress.phase}</div>
            {progress.total > 0 && (
              <div className="progress-bar">
                <div
                  className="progress-bar-fill"
                  style={{
                    width: `${(progress.loaded / progress.total) * 100}%`,
                  }}
                />
              </div>
            )}
          </div>
        ) : (
          <>
            <SummaryCards coins={coins} />
            <FiltersBar
              filters={filters}
              onFilterChange={setFilters}
              onRefresh={loadData}
              loading={loading}
            />
            <CoinTable coins={coins} filters={filters} onSort={handleSort} />
          </>
        )}
      </main>
    </div>
  );
}
