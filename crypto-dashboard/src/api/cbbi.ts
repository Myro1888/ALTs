import axios from 'axios';

const CBBI_API_URL = 'https://colintalkscrypto.com/cbbi/data/latest.json';

export interface CBBIMetric {
  name: string;
  key: string;
  value: number;
  description: string;
  interpretation: 'bullish' | 'bearish' | 'neutral';
}

export interface CBBIData {
  price: number;
  confidence: number;
  metrics: CBBIMetric[];
  lastTimestamp: number;
}

interface CBBIRawResponse {
  Price: Record<string, number>;
  PiCycle: Record<string, number>;
  RUPL: Record<string, number>;
  RHODL: Record<string, number>;
  Puell: Record<string, number>;
  '2YMA': Record<string, number>;
  Trolololo: Record<string, number>;
  MVRV: Record<string, number>;
  ReserveRisk: Record<string, number>;
  Woobull: Record<string, number>;
  Confidence: Record<string, number>;
}

function getLatestValue(data: Record<string, number>): { value: number; timestamp: number } {
  const timestamps = Object.keys(data).map(Number).sort((a, b) => b - a);
  const latest = timestamps[0];
  return { value: data[String(latest)], timestamp: latest };
}

function getInterpretation(value: number): 'bullish' | 'bearish' | 'neutral' {
  if (value < 0.3) return 'bullish';
  if (value > 0.7) return 'bearish';
  return 'neutral';
}

const metricDescriptions: Record<string, string> = {
  PiCycle: 'Pi Cycle Top Indicator - MA crossover signal',
  RUPL: 'Relative Unrealized Profit/Loss - Market sentiment',
  RHODL: 'RHODL Ratio - Old vs new coin movement',
  Puell: 'Puell Multiple - Miner revenue vs average',
  '2YMA': '2 Year MA Multiplier - Price vs long-term average',
  Trolololo: 'Logarithmic Growth Curve - Price trajectory',
  MVRV: 'MVRV Z-Score - Market value vs realized value',
  ReserveRisk: 'Reserve Risk - HODLer confidence',
  Woobull: 'Top Cap vs CVDD - Valuation model',
};

export async function fetchCBBIData(): Promise<CBBIData> {
  const { data } = await axios.get<CBBIRawResponse>(CBBI_API_URL, {
    timeout: 15000,
  });

  const priceData = getLatestValue(data.Price);
  const confidenceData = getLatestValue(data.Confidence);

  const metricKeys: (keyof CBBIRawResponse)[] = [
    'Puell', 'MVRV', 'PiCycle', 'RUPL', 'RHODL', 'ReserveRisk', '2YMA', 'Trolololo', 'Woobull'
  ];

  const metrics: CBBIMetric[] = metricKeys.map((key) => {
    const { value } = getLatestValue(data[key]);
    return {
      name: key === '2YMA' ? '2Y MA Multiplier' : key,
      key,
      value,
      description: metricDescriptions[key] || '',
      interpretation: getInterpretation(value),
    };
  });

  return {
    price: priceData.value,
    confidence: confidenceData.value,
    metrics,
    lastTimestamp: priceData.timestamp,
  };
}
