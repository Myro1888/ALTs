import { useState, useEffect, useCallback } from 'react';
import { fetchCBBIData, type CBBIData, type CBBIMetric } from '../api/cbbi';
import { RefreshCw, TrendingUp, TrendingDown, Minus, Bitcoin, ExternalLink } from 'lucide-react';

function MetricBar({ metric }: { metric: CBBIMetric }) {
  const percentage = metric.value * 100;

  const getBarColor = () => {
    if (metric.value < 0.3) return 'var(--green-medium)';
    if (metric.value > 0.7) return 'var(--red-medium)';
    if (metric.value > 0.5) return 'var(--gold-medium)';
    return 'var(--accent-blue)';
  };

  const getIcon = () => {
    if (metric.interpretation === 'bullish') return <TrendingUp size={12} />;
    if (metric.interpretation === 'bearish') return <TrendingDown size={12} />;
    return <Minus size={12} />;
  };

  return (
    <div className="metric-row">
      <div className="metric-header">
        <span className="metric-name">{metric.name}</span>
        <span className={`metric-signal ${metric.interpretation}`}>
          {getIcon()}
          {metric.interpretation}
        </span>
      </div>
      <div className="metric-bar-container">
        <div className="metric-bar-bg">
          <div
            className="metric-bar-fill"
            style={{
              width: `${percentage}%`,
              backgroundColor: getBarColor()
            }}
          />
          <div className="metric-zones">
            <span className="zone-label buy">Buy</span>
            <span className="zone-label neutral">Neutral</span>
            <span className="zone-label sell">Sell</span>
          </div>
        </div>
        <span className="metric-value">{(metric.value * 100).toFixed(1)}%</span>
      </div>
      <div className="metric-description">{metric.description}</div>
    </div>
  );
}

function ConfidenceGauge({ confidence }: { confidence: number }) {
  const percentage = confidence * 100;
  const rotation = (confidence * 180) - 90; // -90 to 90 degrees

  const getPhase = () => {
    if (confidence < 0.2) return 'Accumulation';
    if (confidence < 0.4) return 'Early Bull';
    if (confidence < 0.6) return 'Mid Cycle';
    if (confidence < 0.8) return 'Late Bull';
    return 'Distribution';
  };

  const getPhaseColor = () => {
    if (confidence < 0.3) return 'var(--green-medium)';
    if (confidence < 0.5) return 'var(--accent-blue)';
    if (confidence < 0.7) return 'var(--gold-medium)';
    return 'var(--red-medium)';
  };

  return (
    <div className="confidence-gauge">
      <div className="gauge-container">
        <svg viewBox="0 0 200 120" className="gauge-svg">
          {/* Background arc */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="var(--border-color)"
            strokeWidth="12"
            strokeLinecap="round"
          />
          {/* Colored segments */}
          <path
            d="M 20 100 A 80 80 0 0 1 56 38"
            fill="none"
            stroke="var(--green-medium)"
            strokeWidth="12"
            strokeLinecap="round"
            opacity="0.3"
          />
          <path
            d="M 56 38 A 80 80 0 0 1 100 20"
            fill="none"
            stroke="var(--accent-blue)"
            strokeWidth="12"
            opacity="0.3"
          />
          <path
            d="M 100 20 A 80 80 0 0 1 144 38"
            fill="none"
            stroke="var(--gold-medium)"
            strokeWidth="12"
            opacity="0.3"
          />
          <path
            d="M 144 38 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="var(--red-medium)"
            strokeWidth="12"
            strokeLinecap="round"
            opacity="0.3"
          />
          {/* Needle */}
          <line
            x1="100"
            y1="100"
            x2="100"
            y2="35"
            stroke={getPhaseColor()}
            strokeWidth="3"
            strokeLinecap="round"
            transform={`rotate(${rotation}, 100, 100)`}
          />
          <circle cx="100" cy="100" r="8" fill={getPhaseColor()} />
        </svg>
      </div>
      <div className="gauge-value" style={{ color: getPhaseColor() }}>
        {percentage.toFixed(1)}%
      </div>
      <div className="gauge-phase" style={{ color: getPhaseColor() }}>
        {getPhase()}
      </div>
    </div>
  );
}

export function BitcoinMetrics() {
  const [data, setData] = useState<CBBIData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const cbbiData = await fetchCBBIData();
      setData(cbbiData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch CBBI data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="bitcoin-metrics">
      <div className="bitcoin-metrics-header">
        <div className="header-left">
          <Bitcoin size={20} className="btc-icon" />
          <div>
            <h2>Bitcoin On-Chain Metrics</h2>
            <span className="source-link">
              Data from{' '}
              <a href="https://colintalkscrypto.com/cbbi/" target="_blank" rel="noopener noreferrer">
                CBBI Index <ExternalLink size={10} />
              </a>
            </span>
          </div>
        </div>
        <button
          className="refresh-btn-small"
          onClick={loadData}
          disabled={loading}
        >
          <RefreshCw size={14} className={loading ? 'spinning' : ''} />
        </button>
      </div>

      {error && (
        <div className="metrics-error">
          {error}
        </div>
      )}

      {loading && !data ? (
        <div className="metrics-loading">
          <div className="loading-spinner" style={{ width: 24, height: 24, borderWidth: 2 }} />
          <span>Loading CBBI data...</span>
        </div>
      ) : data ? (
        <div className="bitcoin-metrics-content">
          <div className="metrics-main">
            <div className="cbbi-confidence">
              <h3>CBBI Confidence Index</h3>
              <p className="confidence-desc">
                Combined score of 9 on-chain metrics. Higher = closer to market top.
              </p>
              <ConfidenceGauge confidence={data.confidence} />
              <div className="btc-price">
                BTC: ${data.price.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
            </div>
            <div className="metrics-grid">
              {data.metrics.map((metric) => (
                <MetricBar key={metric.key} metric={metric} />
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
