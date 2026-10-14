import { businessRows, loanPrincipalPaid } from './commerce.mjs';
// Read-only operational journal. Customer-owned materials carry no business value.
export function journal(state) {
  const entries=[],stock=new Map(),costs=new Map(),loanPaid=new Map();
  const add=(r,account,category,debit=0,credit=0)=>{if(debit||credit)entries.push({id:r.id,date:r.date,number:r.number,account,category,debit,credit})};
  const cashAccount=r=>r.accountId?`Bank: ${businessRows(state).find(a=>a.id===r.accountId)?.data.name||r.accountId}`:r.method==='cash'?'Cash in hand':r.method==='bank'||r.method==='upi'?'Unassigned bank collections':'Other collections';
  const pair=(r,dr,drType,cr,crType,amount)=>{add(r,dr,drType,amount);add(r,cr,crType,0,amount)};
  for(const b of state.invoices)pair(b,'Trade receivables','asset','Job-work income','income',b.amountPaise);
  for(const p of state.payments||[])pair(p,cashAccount(p),'asset','Trade receivables','asset',p.amountPaise);
  for(const r of businessRows(state)) {
    if(r.kind==='account')pair(r,`Bank: ${r.data.name}`,'asset','Opening capital','equity',r.amountPaise);
    if(['sale','purchase','credit','debit'].includes(r.kind)){
      const net=r.lines.reduce((n,l)=>n+Math.round(l.quantity*l.ratePaise*(10000-l.discountBps)/10000),0),tax=r.amountPaise-net;
      if(r.kind==='sale'){add(r,'Trade receivables','asset',r.amountPaise);add(r,'Sale income','income',0,net);add(r,'Output tax','liability',0,tax)}
      if(r.kind==='credit'){add(r,'Sale income','income',net);add(r,'Output tax','liability',tax);add(r,'Trade receivables','asset',0,r.amountPaise)}
      if(r.kind==='purchase'||r.kind==='debit'){
        const direction=r.kind==='purchase'?1:-1;
        for(const l of r.lines){const item=businessRows(state).find(i=>i.id===l.itemId),value=Math.round(l.quantity*l.ratePaise*(10000-l.discountBps)/10000);add(r,item?.data.type==='service'?'Purchased services':'Owned inventory',item?.data.type==='service'?'expense':'asset',direction>0?value:0,direction<0?value:0)}
        add(r,'Input tax','asset',direction>0?tax:0,direction<0?tax:0);add(r,'Trade payables','liability',direction<0?r.amountPaise:0,direction>0?r.amountPaise:0);
      }
    }
    if(['purchase','debit','sale','delivery','credit'].includes(r.kind)){
      const source=businessRows(state).find(s=>s.id===r.sourceId),skip=r.kind==='sale'&&source?.kind==='delivery';
      const itemCosts=[];
      if(!skip) for(const l of r.lines){const item=businessRows(state).find(i=>i.id===l.itemId);if(item?.data.type!=='product')continue;const balance=stock.get(l.itemId)||{quantity:0,value:0};const net=Math.round(l.quantity*l.ratePaise*(10000-l.discountBps)/10000);
        if(r.kind==='purchase'){balance.quantity+=l.quantity;balance.value+=net}
        else if(r.kind==='credit'){const sourceCost=costs.get(source?.id)||costs.get(businessRows(state).find(s=>s.id===source?.sourceId)?.id)||[];const value=sourceCost.find(c=>c.itemId===l.itemId)?.value||0;balance.quantity+=l.quantity;balance.value+=value;pair(r,'Owned inventory','asset','Cost of goods sold','expense',value)}
        else {const value=balance.quantity?Math.min(balance.value,Math.round(balance.value*l.quantity/balance.quantity)):0;balance.quantity-=l.quantity;balance.value-=value;itemCosts.push({itemId:l.itemId,value});if(r.kind==='debit'){const variance=net-value;if(variance>0)pair(r,'Owned inventory','asset','Purchase return variance','income',variance);if(variance<0)pair(r,'Purchase return variance','expense','Owned inventory','asset',-variance)}else pair(r,'Cost of goods sold','expense','Owned inventory','asset',value)}
        stock.set(l.itemId,balance);
      }
      if(skip)costs.set(r.id,costs.get(source.id)||[]);else costs.set(r.id,itemCosts);
    }
    if(r.kind==='payment-in')pair(r,cashAccount(r),'asset','Trade receivables','asset',r.amountPaise);
    if(r.kind==='payment-out')pair(r,'Trade payables','liability',cashAccount(r),'asset',r.amountPaise);
    if(r.kind==='expense')pair(r,`Expense: ${r.data.category}`,'expense',cashAccount(r),'asset',r.amountPaise);
    if(r.kind==='cash-adjustment')r.data.direction==='in'?pair(r,'Cash in hand','asset','Cash corrections / capital','equity',r.amountPaise):pair(r,'Owner withdrawals / corrections','equity','Cash in hand','asset',r.amountPaise);
    if(r.kind==='loan')pair(r,'Cash in hand','asset',`Loan: ${r.data.name}`,'liability',r.amountPaise);
    if(r.kind==='loan-payment') {const loan=businessRows(state).find(l=>l.id===r.sourceId);const prev=loanPaid.get(loan.id)||0;const principal=loanPrincipalPaid(loan,prev+r.amountPaise)-loanPrincipalPaid(loan,prev);add(r,`Loan: ${loan.data.name}`,'liability',principal);add(r,'Loan interest','expense',r.amountPaise-principal);add(r,cashAccount(r),'asset',0,r.amountPaise);loanPaid.set(loan.id,prev+r.amountPaise)}
  }
  return entries;
}
export function accountBalances(state,from='',to='9999-12-31') {
  const accounts=new Map();
  for(const e of journal(state).filter(e=>e.date>=from&&e.date<=to)){const r=accounts.get(e.account)||{account:e.account,category:e.category,debit:0,credit:0};r.debit+=e.debit;r.credit+=e.credit;accounts.set(e.account,r)}
  return [...accounts.values()].sort((a,b)=>a.category.localeCompare(b.category)||a.account.localeCompare(b.account));
}
