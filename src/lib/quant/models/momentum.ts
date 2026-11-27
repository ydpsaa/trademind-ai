import type { Market, Strategy, Weights } from '../types';
import { integer,range } from '../math';
/** Source formula: P[t-1]/P[t-12]-1 with defaults lookback=12, skip=1. */
export function momentumScore(m:Market,symbol:string,t:number,lookback=12,skip=1):number|null {
  integer(lookback,'lookback');integer(skip,'skip',0);if(skip>=lookback)throw new Error('skip must be less than lookback');const b=m[symbol];if(!b)throw new Error('missing symbol');if(t<lookback||t>=b.length)return null;return b[t-skip].close/b[t-lookback].close-1;
}
export function momentum(opts:{lookback?:number;skip?:number;top?:number;bottom?:number;rebalanceEvery?:number;gross?:number}={}):Strategy{
  const lookback=integer(opts.lookback??12,'lookback'),skip=integer(opts.skip??1,'skip',0),top=integer(opts.top??1,'top'),bottom=integer(opts.bottom??0,'bottom',0),every=integer(opts.rebalanceEvery??1,'rebalance'),gross=range(opts.gross??1,'gross',0,1);
  if(skip>=lookback)throw new Error('skip must be less than lookback');
  return(m,t)=>{if(t<lookback||(t-lookback)%every!==0)return null;const ks=Object.keys(m);if(top+bottom>ks.length)throw new Error('insufficient universe');const scores=ks.map(k=>({k,score:momentumScore(m,k,t,lookback,skip)!})).sort((a,b)=>b.score-a.score||(a.k<b.k?-1:a.k>b.k?1:0));const w:Record<string,number>=Object.create(null);const leg=bottom?gross/2:gross;for(const a of scores.slice(0,top))w[a.k]=leg/top;if(bottom)for(const a of scores.slice(-bottom))w[a.k]=-leg/bottom;return {weights:w as Weights,reason:'momentum rank rebalance'};};
}
