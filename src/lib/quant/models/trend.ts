import type { Strategy } from '../types';
import { closes,mean,integer,range,sign,validateSymbol } from '../math';
export function trendFollowing(opts:{symbol:string;fast?:number;slow?:number;gross?:number;short?:boolean}):Strategy {
 const s=validateSymbol(opts.symbol),f=integer(opts.fast??15,'fast'),n=integer(opts.slow??50,'slow',2),g=range(opts.gross??1,'gross',0,1);if(f>=n)throw new Error('fast must be less than slow');
 return(m,t)=>{const a=closes(m,s,t,n);if(!a)return null;const d=sign(mean(a.slice(-f))-mean(a));const w=d<0&&!opts.short?0:d*g;return {weights:w?{[s]:w}:{},reason:`MA${f}/MA${n} direction ${d}`};};
}
