import type { CoinAnalysis } from '../types';
import { formatCurrency, formatNumber } from '../utils/format';
import { TrendingUp, Zap, AlertTriangle, BarChart3 } from 'lucide-react';

interface SummaryCardsProps {
  coins: CoinAnalysis[];
}

export function SummaryCards({ coins }: SummaryCardsProps) {
  const opportunities = coins.filter((c) => c.divergenceScore >= 30);
  const avgDivergence =
    coins.length > 0
      ? coins.reduce((sum, c) => sum + c.divergenceScore, 0) / coins.length
      : 0;
  const deepestSelloff = coins.reduce(
    (min, c) => (c.priceTrendScore < min ? c.priceTrendScore : min),
    0
  );
  const totalVolume = coins.reduce((sum, c) => sum + c.totalVolume, 0);

  return (
    <div className="summary-cards">
      <div className="summary-card gold">
        <div className="label">
          <Zap size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
          Buy Signals
        </div>
        <div className="value">{opportunities.length}</div>
        <div className="subtext">Coins with divergence ≥ 30</div>
      </div>
      <div className="summary-card green">
        <div className="label">
          <TrendingUp size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
          Avg Divergence
        </div>
        <div className="value">{avgDivergence.toFixed(1)}</div>
        <div className="subtext">Across {coins.length} analyzed coins</div>
      </div>
      <div className="summary-card red">
        <div className="label">
          <AlertTriangle size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
          Deepest Selloff
        </div>
        <div className="value">{deepestSelloff.toFixed(1)}</div>
        <div className="subtext">Worst price trend score</div>
      </div>
      <div className="summary-card blue">
        <div className="label">
          <BarChart3 size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
          Total Volume
        </div>
        <div className="value">{formatCurrency(totalVolume)}</div>
        <div className="subtext">{formatNumber(coins.length)} coins tracked</div>
      </div>
    </div>
  );
}
