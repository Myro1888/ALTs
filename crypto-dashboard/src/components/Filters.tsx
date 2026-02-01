import type { Filters } from '../types';
import { RefreshCw } from 'lucide-react';

interface FiltersBarProps {
  filters: Filters;
  onFilterChange: (filters: Filters) => void;
  onRefresh: () => void;
  loading: boolean;
}

export function FiltersBar({
  filters,
  onFilterChange,
  onRefresh,
  loading,
}: FiltersBarProps) {
  return (
    <div className="filters-bar">
      <div className="filter-group">
        <label>Min Divergence</label>
        <input
          type="number"
          value={filters.minDivergence}
          onChange={(e) =>
            onFilterChange({ ...filters, minDivergence: Number(e.target.value) })
          }
          min={-100}
          max={100}
          step={5}
        />
      </div>
      <div className="filter-group">
        <label>Min Volume ($)</label>
        <input
          type="number"
          value={filters.minVolume}
          onChange={(e) =>
            onFilterChange({ ...filters, minVolume: Number(e.target.value) })
          }
          min={0}
          step={1000000}
        />
      </div>
      <div className="filter-group">
        <label>Timeframe Focus</label>
        <select
          value={filters.timeframeFocus}
          onChange={(e) =>
            onFilterChange({
              ...filters,
              timeframeFocus: e.target.value as '30d' | '90d',
            })
          }
        >
          <option value="30d">30 Day</option>
          <option value="90d">90 Day</option>
        </select>
      </div>
      <button className="refresh-btn" onClick={onRefresh} disabled={loading}>
        <RefreshCw size={14} className={loading ? 'spinning' : ''} />
        {loading ? 'Loading...' : 'Refresh Data'}
      </button>
    </div>
  );
}
