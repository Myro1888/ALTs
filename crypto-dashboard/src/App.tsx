import { useState, useCallback, useEffect } from 'react';
import type { CoinAnalysis, Filters } from './types';
import { fetchAllMarketData, fetchCoinDetails } from './api/coingecko';
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
  const [enriching, setEnriching] = useState(false);
  const [progress, setProgress] = useState({ loaded: 0, total: 0, phase: '' });
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setEnriching(false);
    setError(null);
    setProgress({ loaded: 0, total: 0, phase: 'Fetching market data...' });

    try {
      const marketData = await fetchAllMarketData((loaded, phase) => {
        setProgress({ loaded, total: 0, phase });
      });

      // Show table immediately with market-only data (no social/dev yet)
      const initialAnalysis = analyzeCoins(marketData, new Map());
      initialAnalysis.sort((a, b) => b.divergenceScore - a.divergenceScore);
      setCoins(initialAnalysis);
      setLastUpdated(new Date());
      setLoading(false);

      // Only fetch details for coins in a downtrend (30d < -5%) — the actual candidates.
      // This keeps us well within CoinGecko free tier rate limits.
      const downtrendCoins = marketData.filter(
        (c) => (c.price_change_percentage_30d_in_currency ?? 0) < -5
      );
      const candidateIds = downtrendCoins.map((c) => c.id);

      if (candidateIds.length > 0) {
        setEnriching(true);
        setProgress({
          loaded: 0,
          total: candidateIds.length,
          phase: `Enriching ${candidateIds.length} downtrend coins with social/dev data...`,
        });

        await fetchCoinDetails(
          candidateIds,
          (loaded, total) => {
            setProgress({
              loaded,
              total,
              phase: `Enriching details (${loaded}/${total})...`,
            });
          },
          (detailsSoFar) => {
            // Progressively update the table as each coin's details arrive
            const updated = analyzeCoins(marketData, detailsSoFar);
            updated.sort((a, b) => b.divergenceScore - a.divergenceScore);
            setCoins(updated);
          }
        );
        setEnriching(false);
      }

      setProgress({ loaded: 0, total: 0, phase: '' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch data';
      setError(message);
      console.error('Data load error:', err);
    } finally {
      setLoading(false);
      setEnriching(false);
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
            <span className={`status-dot ${loading || enriching ? 'loading' : ''}`} />
            {loading ? (
              <span>{progress.phase}</span>
            ) : enriching ? (
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
              loading={loading || enriching}
            />
            {enriching && progress.total > 0 && (
              <div className="enriching-banner">
                <div className="loading-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                <span>{progress.phase}</span>
                <div className="progress-bar" style={{ width: 120 }}>
                  <div
                    className="progress-bar-fill"
                    style={{ width: `${(progress.loaded / progress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}
            <CoinTable coins={coins} filters={filters} onSort={handleSort} />
          </>
        )}
      </main>
    </div>
  );
}
