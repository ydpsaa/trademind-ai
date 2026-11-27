import type { BacktestConfig, EquityPoint, Fill, Market, Strategy, Weights } from './types';
import { positive,range,requireFinite,validateMarket } from './math';
export const ENGINE_VERSION='0.1.0';
function sameWeights(a:Weights,b:Weights,keys:string[]){return keys.every(k=>Math.abs((a[k]??0)-(b[k]??0))<1e-10);}
function checkWeights(w:Weights,keys:string[],max:number){let gross=0;for(const k of Object.keys(w)){if(!keys.includes(k))throw new Error('unknown weight symbol');gross+=Math.abs(requireFinite(w[k],'weight'));}if(gross>max+1e-10)throw new Error('gross limit exceeded');}
/** Signal calculated from closes at t, filled only at t+1 open. No leverage, broker margin, intrabar fills or financing. */
export function backtest(m:Market,strategy:Strategy,cfg:BacktestConfig){
 const keys=validateMarket(m),initial=positive(cfg.initialCapital,'capital'),fee=range(cfg.feeBps,'fee',0,1000)/1e4,slip=range(cfg.slippageBps,'slippage',0,1000)/1e4,max=range(cfg.maxGross??1,'max gross',0,1);if(!['historical','synthetic'].includes(cfg.provenance.kind)||!cfg.provenance.source.trim()||!cfg.provenance.datasetId.trim())throw new Error('invalid provenance');
 const bars=m[keys[0]];if(bars.length>5000||keys.length*bars.length*bars.length>50000000)throw new Error('research backtest size limit');const qty:Record<string,number>=Object.create(null),fills:Fill[]=[],curve:EquityPoint[]=[];keys.forEach(k=>qty[k]=0);let cash=initial,peak=initial,prior:Weights={},pending:{weights:Weights;reason:string}|null=null;let halted=false,terminalLiquidation=false;
 const mark=(i:number,field:'open'|'close')=>requireFinite(cash+keys.reduce((s,k)=>s+qty[k]*m[k][i][field],0),'equity');
 function transact(k:string,amount:number,i:number,field:'open'|'close',reason:string){if(Math.abs(amount)<1e-12)return;const referencePrice=m[k][i][field],price=referencePrice*(1+Math.sign(amount)*slip),commission=Math.abs(amount*price)*fee;cash-=amount*price+commission;qty[k]+=amount;fills.push({time:bars[i].time,symbol:k,quantity:amount,referencePrice,price,commission,reason});}
 for(let i=0;i<bars.length;i++){
  const open=mark(i,'open');if(open<=0&&!halted){for(const k of keys)transact(k,-qty[k],i,'open','insolvency closeout');pending=null;prior={};halted=true;}
  if(pending&&!halted){const order=pending;const eq=open;const target:Record<string,number>=Object.create(null);for(const k of keys)target[k]=eq*(order.weights[k]??0)/m[k][i].open;const changes=keys.map(k=>({k,d:target[k]-qty[k]}));
   // Sell first. Scale the whole portfolio before execution for modeled execution costs.
   // Conservative reserve avoids spending equity needed to cover fees/slippage.
   const est=changes.reduce((s,c)=>s+Math.abs(c.d*m[c.k][i].open)*(slip+fee*(1+slip)),0);
   const budget=Math.max(0,eq-est);for(const k of keys)target[k]=budget*(order.weights[k]??0)/m[k][i].open;
   for(const k of [...keys].sort((a,b)=>(target[a]-qty[a])-(target[b]-qty[b])))transact(k,target[k]-qty[k],i,'open',order.reason);
   prior=order.weights;pending=null;
  }
  if(i===bars.length-1){for(const k of keys)if(Math.abs(qty[k])>1e-12){transact(k,-qty[k],i,'close','end-of-sample liquidation');terminalLiquidation=true;}}
  let equity=mark(i,'close');if(equity<=0&&!halted){for(const k of keys)transact(k,-qty[k],i,'close','insolvency closeout');equity=mark(i,'close');halted=true;prior={};}
  peak=Math.max(peak,equity);curve.push({time:bars[i].time,equity,drawdown:(peak-equity)/peak});
  if(i<bars.length-1&&!halted){
   // No data after current bar is supplied to the strategy. No accidental look-ahead.
   const prefix:Record<string,readonly Market[string][number][]>=Object.create(null);for(const k of keys)prefix[k]=m[k].slice(0,i+1);
   const signal=strategy(prefix,i,{...prior});if(signal){checkWeights(signal.weights,keys,max);if(!sameWeights(signal.weights,prior,keys))pending={weights:{...signal.weights},reason:signal.reason};}
  }
 }
 const final=curve[curve.length-1].equity;return {engineVersion:ENGINE_VERSION,kind:cfg.provenance.kind==='synthetic'?'sandbox':'historical-unvalidated',provenance:cfg.provenance,initialCapital:initial,finalEquity:final,netPnl:final-initial,totalReturn:final/initial-1,maxDrawdown:curve.reduce((max,p)=>Math.max(max,p.drawdown),0),commissions:fills.reduce((s,f)=>s+f.commission,0),slippageCost:fills.reduce((s,f)=>s+Math.abs(f.quantity*(f.price-f.referencePrice)),0),fills,curve,halted,terminalLiquidation,limitations:['signal at close / fill next open','fixed units until target weight changes; no periodic reweight of identical target','maxGross is a target at entry, not continuous margin enforcement','no financing, swaps, contract multipliers, intrabar equity or broker constraints','terminal liquidation at last close is a reporting convention']};
}
