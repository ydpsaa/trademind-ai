import { backtest } from './backtest';
import { createQuantStrategy, type QuantSpec } from './registry';
import { marketMakingQuote } from './models/market-making';
import { marketRegime } from './regime';
import { exactSymmetricPass, monteCarlo } from './prop';
import { integer, range, validateMarket } from './math';
import type { Bar, Market } from './types';

export const LAB_VERSION = '0.2.0';
export const modelNames = ['momentum', 'mean-reversion', 'trend-following', 'breakout', 'pairs-trading', 'market-making'] as const;
export type LabModel = typeof modelNames[number];
export type Dataset = Readonly<{ kind: 'synthetic' | 'user-supplied'; id: string; market: Market }>;
export type LabSettings = Readonly<{ model: LabModel; symbol: string; pair: string; fast: number; slow: number; window: number; exitWindow: number; entryZ: number; exitZ: number; stopZ: number; grossPct: number; short: boolean; initialCapital: number; feeBps: number; slippageBps: number }>;
export const defaultLabSettings: LabSettings = {model:'trend-following',symbol:'A',pair:'B',fast:15,slow:50,window:20,exitWindow:10,entryZ:2,exitZ:0.5,stopZ:4,grossPct:25,short:false,initialCapital:10000,feeBps:3,slippageBps:2};

/** Synthetic scenarios are deterministic, deliberately not representative market data. */
export function fixture(scenario: 'mixed' | 'trend' | 'range' = 'mixed', count = 240): Dataset {
  integer(count,'bars',80); if(count>1000)throw new Error('fixture bar limit');
  if(!['mixed','trend','range'].includes(scenario))throw new Error('unknown scenario');
  const market: Record<string, Bar[]> = {A:[],B:[],C:[]};
  for(let i=0;i<count;i++) {
    const trend=scenario==='trend'?i*.16:scenario==='range'?0:i<80?i*.17:i<150?13.6-(i-80)*.19:.3+(i-150)*.23;
    const shared=100+trend+2.5*Math.sin(i*.13)+.55*Math.sin(i*.87);
    const prices={A:shared+1.9*Math.sin(i*.41)+(i%61===0?3:0),B:shared*.86+.65*Math.sin(i*.3),C:112-trend*.52+2.9*Math.cos(i*.2)};
    for(const key of ['A','B','C'] as const){const close=prices[key],open=i?market[key][i-1].close*(1+.0008*Math.sin(i*1.43)):close;market[key].push({time:Date.UTC(2025,0,1)+i*3600000,open,close,high:Math.max(open,close)*1.002,low:Math.min(open,close)*.998,volume:1000+i%19*40});}
  }
  validateMarket(market); return {kind:'synthetic',id:`fixture-${scenario}-${count}-v1`,market};
}

/** Strict simple CSV: no quoted cells; exact header; UTC ISO timestamp or epoch ms. Never authenticates a data source. */
export function parseMarketCsv(csv:string):Dataset {
  if(typeof csv!=='string'||csv.length>2_000_000)throw new Error('CSV exceeds 2 MB text limit');
  const lines=csv.replace(/^\uFEFF/,'').trim().split(/\r?\n/);
  if(lines.shift()?.trim()!=='symbol,time,open,high,low,close,volume')throw new Error('expected header: symbol,time,open,high,low,close,volume');
  if(lines.length>12000||lines.length<2)throw new Error('CSV row limit (2–12000)');
  const market:Record<string,Bar[]>=Object.create(null);let hash=2166136261;
  for(const line of lines){
    if(!line.trim())throw new Error('blank CSV row'); const parts=line.split(',').map(x=>x.trim());
    if(parts.length!==7)throw new Error('invalid CSV row width'); const [symbol,rawTime,...raw]=parts;
    if(!/^[A-Za-z0-9][A-Za-z0-9._-]{0,31}$/.test(symbol)||symbol in Object.prototype||symbol==='prototype')throw new Error('invalid symbol');
    let time:number;
    if(/^\d{13}$/.test(rawTime))time=Number(rawTime);else {if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(rawTime))throw new Error('time must be UTC ISO or 13 digit epoch ms');time=Date.parse(rawTime);if(!Number.isFinite(time)||new Date(time).toISOString().replace('.000Z','Z')!==rawTime.replace('.000Z','Z'))throw new Error('invalid UTC time');}
    if(raw.slice(0,4).some(x=>!x||!/^[-+]?\d+(?:\.\d+)?(?:e[-+]?\d+)?$/i.test(x))||raw[4]&&!/^[-+]?\d+(?:\.\d+)?(?:e[-+]?\d+)?$/i.test(raw[4]))throw new Error('invalid numeric cell');
    const [open,high,low,close]=raw.map(Number);const volume=raw[4]===''?undefined:Number(raw[4]);
    (market[symbol]??=[]).push({time,open,high,low,close,volume});
    for(let i=0;i<line.length;i++)hash=Math.imul(hash^line.charCodeAt(i),16777619);hash=Math.imul(hash^10,16777619);
  }
  const keys=validateMarket(market);if(keys.length>8||market[keys[0]].length>1200)throw new Error('CSV limit: 8 assets, 1200 bars each');
  const bars=market[keys[0]]; const interval=bars[1].time-bars[0].time;
  if(!bars.every((b,i)=>i===0||b.time-bars[i-1].time===interval))throw new Error('irregular/missing bars: only equally spaced datasets supported');
  return{kind:'user-supplied',id:`csv-${(hash>>>0).toString(16)}-${lines.length}`,market};
}

export function runResearch(data:Dataset, s:LabSettings){
  if(!['synthetic','user-supplied'].includes(data.kind))throw new Error('unverified source only');
  const keys=validateMarket(data.market), bars=data.market[keys[0]].length;
  if(keys.length>8||bars>1200)throw new Error('dataset too large');
  if(!modelNames.includes(s.model)||s.model==='market-making')throw new Error('market making requires separate quote sandbox');
  if(!keys.includes(s.symbol))throw new Error('symbol not present');
  if(typeof s.short!=='boolean')throw new Error('invalid short flag');
  const gross=range(s.grossPct,'gross %',0,100)/100;
  const warmup=s.model==='momentum'?integer(s.window,'lookback',2)+1:s.model==='trend-following'?integer(s.slow,'slow',2):s.model==='pairs-trading'?integer(s.window,'window',3)+1:integer(s.window,'window',2)+(s.model==='breakout'?1:0);
  if(warmup>=bars)throw new Error('insufficient bars for parameters plus next-bar execution');
  let spec:QuantSpec;
  switch(s.model){
    case 'momentum': if(s.short&&keys.length<2)throw new Error('long-short momentum needs two assets');spec={version:1,model:s.model,parameters:{lookback:s.window,skip:1,top:1,bottom:s.short?1:0,gross}};break;
    case 'mean-reversion':spec={version:1,model:s.model,parameters:{symbol:s.symbol,window:s.window,entryZ:s.entryZ,exitZ:s.exitZ,stopZ:s.stopZ,gross,short:s.short}};break;
    case 'trend-following':spec={version:1,model:s.model,parameters:{symbol:s.symbol,fast:s.fast,slow:s.slow,gross,short:s.short}};break;
    case 'breakout':spec={version:1,model:s.model,parameters:{symbol:s.symbol,entryWindow:s.window,exitWindow:s.exitWindow,gross,short:s.short}};break;
    case 'pairs-trading':if(!keys.includes(s.pair)||s.symbol===s.pair)throw new Error('select distinct pair assets');spec={version:1,model:s.model,parameters:{a:s.symbol,b:s.pair,window:s.window,entryZ:s.entryZ,exitZ:s.exitZ,stopZ:s.stopZ,gross}};break;
  }
  const config={initialCapital:range(s.initialCapital,'capital',1,1e9),feeBps:range(s.feeBps,'fees',0,1000),slippageBps:range(s.slippageBps,'slippage',0,1000),maxGross:gross,provenance:{kind:'synthetic' as const,source:data.kind==='synthetic'?'deterministic fixture':'unverified user CSV (sandbox)',datasetId:data.id}};
  const result=backtest(data.market,createQuantStrategy(spec),config);
  const regime=marketRegime(data.market,s.symbol,bars-1,20);
  return {labVersion:LAB_VERSION,mode:'sandbox' as const,sourceKind:data.kind,datasetId:data.id,barCount:bars,assets:keys,spec,settings:{...s},regime,result,limitations:['User-imported prices are not verified historical data.','Fills are position changes, not closed trades. Gross exposure is not stop-loss risk.','No intrabar stops, financing, FX, contract specifications, or liquidity model.','No automatic trading, no proof of profitability.']};
}
export function quoteSandbox(mid:number,inventory:number,gamma:number,variance:number,remaining:number,k:number,tick:number){return {mode:'sandbox' as const,...marketMakingQuote({mid,inventory,gamma,variance,remaining,k,tick})};}
export function propSandbox(s:{initial:number;targetPct:number;lossPct:number;riskPct:number;winPct:number;horizon:number;paths:number;seed:number;sample?:readonly number[]}){
  const initial=range(s.initial,'capital',1,1e9),risk=range(s.riskPct,'risk %',.01,100),target=range(s.targetPct,'target %',.01,100),loss=range(s.lossPct,'loss %',.01,100),win=range(s.winPct,'win %',0,100)/100,horizon=integer(s.horizon,'horizon'),paths=integer(s.paths,'paths');
  if(horizon>1000||paths>20000||horizon*paths>5e6)throw new Error('simulation limit');
  const steps=target/risk, exact=!s.sample&&Math.abs(target-loss)<1e-9&&Math.abs(steps-Math.round(steps))<1e-9?exactSymmetricPass(win,Math.round(steps),horizon):null;
  const sample=s.sample; if(sample&&(sample.length<2||sample.length>10000))throw new Error('need 2–10000 net-R observations');
  // Exact input win ratio for arbitrary decimals: deterministic discretization at 0.01 percentage point.
  const wins=Math.round(win*10000);const distribution=sample??Array.from({length:10000},(_,i)=>i<wins?1:-1);
  const mc=monteCarlo(distribution,{initial,riskDollars:initial*risk/100,targetDollars:initial*target/100,lossDollars:initial*loss/100,horizon,paths,seed:s.seed});
  return{mode:'hypothetical' as const,exact,mc,settings:{...s,sample:sample?[...sample]:undefined},winPctEffective:sample?null:wins/100,limitations:['Trade-close static barriers only; daily limit and trailing drawdown are not modeled.','No probability of real prop-firm approval or payout.','IID paths; no market regime, sample uncertainty or serial dependence.']};
}
