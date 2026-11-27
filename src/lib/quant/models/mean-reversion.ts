import type { Strategy } from '../types';
import { closes,integer,positive,range,zScore,validateSymbol } from '../math';
export function meanReversion(opts:{symbol:string;window?:number;entryZ?:number;exitZ?:number;stopZ?:number;gross?:number;short?:boolean}):Strategy{
 const s=validateSymbol(opts.symbol),n=integer(opts.window??20,'window',2),entry=positive(opts.entryZ??2,'entryZ'),exit=range(opts.exitZ??0,'exitZ',0,entry),stop=positive(opts.stopZ??4,'stopZ'),g=range(opts.gross??1,'gross',0,1);if(stop<=entry||exit>=entry)throw new Error('require exit < entry < stop');
 return(m,t,prev)=>{const sample=closes(m,s,t,n);if(!sample)return null;const z=zScore(sample[n-1],sample);if(z===null)return {weights:{},reason:'zero variance'};const p=prev[s]??0;let w=0;let reason='mean reversion flat';if(p>0){if(z> -exit||z===-exit||z<=-stop)reason=z<=-stop?'z stop':'mean reached';else {w=g;reason='hold long';}}else if(p<0){if(z<=exit||z>=stop)reason=z>=stop?'z stop':'mean reached';else{w=-g;reason='hold short';}}else if(z<=-entry&&z>-stop){w=g;reason='negative z entry';}else if(opts.short&&z>=entry&&z<stop){w=-g;reason='positive z entry';}return{weights:w?{[s]:w}:{},reason};};
}
