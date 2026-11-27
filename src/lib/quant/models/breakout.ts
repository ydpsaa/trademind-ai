import type { Strategy } from '../types';
import { integer,range,validateSymbol } from '../math';
/** Close beyond prior N closes. Exit uses prior shorter window. No intrabar fill claims. */
export function breakout(opts:{symbol:string;entryWindow?:number;exitWindow?:number;gross?:number;short?:boolean}):Strategy{
 const s=validateSymbol(opts.symbol),n=integer(opts.entryWindow??20,'entry window'),e=integer(opts.exitWindow??10,'exit window'),g=range(opts.gross??1,'gross',0,1);if(e>n)throw new Error('exit window exceeds entry');
 return(m,t,prev)=>{const b=m[s];if(!b)throw new Error('missing symbol');if(t<n||t>=b.length)return null;const a=b.slice(t-n,t).map(x=>x.close),ex=a.slice(-e),p=b[t].close,old=prev[s]??0;let w=old,reason='hold';if(old>0&&p<Math.min(...ex)){w=0;reason='long channel exit';}else if(old<0&&p>Math.max(...ex)){w=0;reason='short channel exit';}else if(!old&&p>Math.max(...a)){w=g;reason='upper breakout';}else if(!old&&opts.short&&p<Math.min(...a)){w=-g;reason='lower breakout';}return {weights:w?{[s]:w}:{},reason};};
}
