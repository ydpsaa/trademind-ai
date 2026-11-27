/** Read-only bridge for the market_candles contract observed in DAXIS main.
 * This validates structure, not the authenticity of a caller or a data provider.
 * Use only rows read by authenticated server code; never accept rows from an HTTP client as verified. */
import type { Bar, Market } from './types';
import { validateMarket, integer } from './math';
export const spotSymbols = ['BTCUSDT','ETHUSDT'] as const;
export const intervals = {'5m':300000,'15m':900000,'1h':3600000,'4h':14400000} as const;
export type SpotSymbol = typeof spotSymbols[number];
export type SpotTimeframe = keyof typeof intervals;
export type CandleRow = Readonly<{provider:string;symbol:string;timeframe:string;opened_at:string;open:number|string;high:number|string;low:number|string;close:number|string;volume:number|string|null;is_closed:boolean;fetched_at:string}>;
export type CandleRequest = Readonly<{symbols:readonly SpotSymbol[];timeframe:SpotTimeframe;startMs:number;endMs:number;asOfMs:number}>;
const numberCell=(x:number|string)=>{if(typeof x!=='number'&&(typeof x!=='string'||!x.trim()))throw new Error('missing numeric candle field');const n=Number(x);if(!Number.isFinite(n))throw new Error('invalid numeric candle field');return n;};
function timestamp(s:string){if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|\+00:00)$/.test(s))throw new Error('expected UTC timestamp');const n=Date.parse(s);if(!Number.isSafeInteger(n)||new Date(n).toISOString().slice(0,19)!==s.slice(0,19))throw new Error('invalid timestamp');return n;}
export function normalizeStoredSpotCandles(rows:readonly CandleRow[], req:CandleRequest){
 const dt=intervals[req.timeframe];if(!Number.isFinite(dt)||!Array.isArray(req.symbols)||!req.symbols.length||req.symbols.length>2||new Set(req.symbols).size!==req.symbols.length||req.symbols.some(s=>!spotSymbols.includes(s)))throw new Error('unsupported provider instruments or timeframe');
 const start=integer(req.startMs,'start',0),end=integer(req.endMs,'end',0),now=integer(req.asOfMs,'as of',0);
 if(start%dt||end%dt||end>now||end<=start)throw new Error('invalid or unfinished interval');
 const count=(end-start)/dt;if(count<2||count>1200||rows.length!==count*req.symbols.length)throw new Error('incomplete candle coverage or size limit');
 const market:Record<string,Bar[]>=Object.create(null);for(const s of req.symbols)market[s]=[];
 for(const row of rows){if(row.provider!=='bybit'||row.timeframe!==req.timeframe||!req.symbols.includes(row.symbol as SpotSymbol)||row.is_closed!==true)throw new Error('unexpected or unclosed candle');const t=timestamp(row.opened_at),f=timestamp(row.fetched_at);if(t<start||t>=end||t%dt||t+dt>now||f<t+dt||f>now)throw new Error('invalid candle or fetch time');market[row.symbol].push({time:t,open:numberCell(row.open),high:numberCell(row.high),low:numberCell(row.low),close:numberCell(row.close),volume:row.volume===null?undefined:numberCell(row.volume)});}
 for(const s of req.symbols){market[s].sort((a,b)=>a.time-b.time);if(market[s].length!==count||market[s].some((b,i)=>b.time!==start+i*dt))throw new Error('gap, duplicate or unequal coverage');}
 validateMarket(market);
 return{mode:'provider-candidate' as const,market:market as Market,provider:'bybit' as const,venue:'spot' as const,quoteCurrency:'USDT' as const,timeframe:req.timeframe,startMs:start,endMs:end,asOfMs:now,barCount:count,assets:[...req.symbols].sort(),limitations:['structural validation only; source authenticity and market completeness require trusted server context','no verified slippage, fees, liquidity, shorting or funding model','not a validated strategy']};
}
