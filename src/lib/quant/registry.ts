import type { Strategy } from './types';
import { momentum } from './models/momentum';
import { meanReversion } from './models/mean-reversion';
import { trendFollowing } from './models/trend';
import { breakout } from './models/breakout';
import { pairsTrading } from './models/pairs';
/** Versioned in-memory contract. Untrusted JSON must be schema-validated before calling. */
export type QuantSpec =
 | {version:1;model:'momentum';parameters:NonNullable<Parameters<typeof momentum>[0]>}
 | {version:1;model:'mean-reversion';parameters:Parameters<typeof meanReversion>[0]}
 | {version:1;model:'trend-following';parameters:Parameters<typeof trendFollowing>[0]}
 | {version:1;model:'breakout';parameters:Parameters<typeof breakout>[0]}
 | {version:1;model:'pairs-trading';parameters:Parameters<typeof pairsTrading>[0]};
export function createQuantStrategy(s:QuantSpec):Strategy{
 if(s.version!==1)throw new Error('unsupported quant spec version');
 switch(s.model){case 'momentum':return momentum(s.parameters);case 'mean-reversion':return meanReversion(s.parameters);case 'trend-following':return trendFollowing(s.parameters);case 'breakout':return breakout(s.parameters);case 'pairs-trading':return pairsTrading(s.parameters);default:throw new Error('unsupported quant model');}
}
