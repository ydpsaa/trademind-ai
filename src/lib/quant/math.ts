import type { Market } from './types';
export function requireFinite(n: number, label: string): number { if (!Number.isFinite(n)) throw new Error(`${label}: nonfinite`); return n; }
export function positive(n: number, label: string): number { requireFinite(n,label); if (n <= 0) throw new Error(`${label}: must be >0`); return n; }
export function integer(n: number, label: string, min = 1): number { if (!Number.isSafeInteger(n) || n < min) throw new Error(`${label}: invalid integer`); return n; }
export function range(n: number, label: string, lo: number, hi: number): number { requireFinite(n,label); if(n < lo || n > hi) throw new Error(`${label}: out of range`); return n; }
export function mean(xs: readonly number[]): number { if (!xs.length) throw new Error('empty sample'); return requireFinite(xs.reduce((s,x)=>s+requireFinite(x,'sample'),0)/xs.length,'mean'); }
export function sd(xs: readonly number[]): number { const m=mean(xs); return Math.sqrt(mean(xs.map(x=>(x-m)**2))); }
export function zScore(x: number, sample: readonly number[]): number | null { const v=sd(sample); return v <= 1e-12 ? null : requireFinite((x-mean(sample))/v,'z-score'); }
export function sign(n: number): -1 | 0 | 1 { return n>0?1:n<0?-1:0; }
export function closes(m: Market,symbol: string,index: number,length: number): number[] | null { const bars=m[symbol]; if (!bars) throw new Error(`missing symbol ${symbol}`); if(index<length-1||index>=bars.length)return null; return bars.slice(index-length+1,index+1).map(b=>b.close); }
export function validateMarket(m: Market): string[] {
  const keys=Object.keys(m).sort(); if(!keys.length)throw new Error('empty market');
  const base=m[keys[0]]; if(base.length<2)throw new Error('need >=2 bars');
  for(const k of keys){ if(!k.trim()||k in Object.prototype||k==='prototype')throw new Error('invalid symbol'); const bs=m[k];if(bs.length!==base.length)throw new Error('unaligned series');
    bs.forEach((b,i)=>{integer(b.time,'time',0);if((i>0&&b.time<=bs[i-1].time)||b.time!==base[i].time)throw new Error('unordered/unaligned timestamps');
      [b.open,b.high,b.low,b.close].forEach(p=>positive(p,'OHLC'));if(b.low>Math.min(b.open,b.close)||b.high<Math.max(b.open,b.close)||b.low>b.high)throw new Error('invalid OHLC range');if(b.volume!==undefined&&(!Number.isFinite(b.volume)||b.volume<0))throw new Error('invalid volume');});
  }return keys;
}
export function atr(m: Market,symbol: string,i: number,n: number):number|null { integer(n,'ATR periods');const bs=m[symbol];if(!bs)throw new Error('missing symbol');if(i<n||i>=bs.length)return null;const tr=bs.slice(i-n+1,i+1).map((b,j)=>{const prev=bs[i-n+j].close;return Math.max(b.high-b.low,Math.abs(b.high-prev),Math.abs(b.low-prev));});return mean(tr); }
export function validateSymbol(s:string){if(!s.trim()||s in Object.prototype||s==='prototype')throw new Error('invalid symbol');return s;}
