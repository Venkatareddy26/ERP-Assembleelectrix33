import { useEffect, useState } from 'react';
import { ChevronDown, Factory, Users, ShoppingBag, ReceiptText, Wallet, ChartNoAxesCombined, DatabaseBackup, Wrench, Settings, TrendingUp, type LucideIcon } from 'lucide-react';

const groups = [
 {label:'Parties',icon:Users,ids:['parties','customers','whatsapp','network']},
 {label:'Items',icon:ShoppingBag,ids:['items','bom','inventory']},
 {label:'Sale',icon:ReceiptText,ids:['sales','estimates','proformas','receipts','sales-orders','challans','credits','pos','billing']},
 {label:'Purchase & Expense',icon:ShoppingBag,ids:['purchases','payouts','expenses','purchase-orders','debits']},
 {label:'Manufacturing',icon:Factory,ids:['orders','production','quality','dispatch','workers']},
 {label:'Grow Your Business',icon:TrendingUp,ids:['google','marketing','whatsapp-marketing','store','ads']},
 {label:'Cash & Bank',icon:Wallet,ids:['banks','cash','cheques','loans']},
 {label:'Reports',icon:ChartNoAxesCombined,ids:['reports']},
 {label:'Sync, Share & Backup',icon:DatabaseBackup,ids:['backups']},
 {label:'Utilities',icon:Wrench,ids:['imports','company','accountant']},
 {label:'Settings',icon:Settings,ids:['settings']},
];

export function WorkspaceNavigation({ modules, section, select }: {
  modules: { id: string; name: string; icon: LucideIcon }[];
  section: string;
  select: (id: string) => void;
}) {
  const [expanded,setExpanded]=useState<string[]>([]);
  useEffect(()=>{const group=groups.find(g=>g.ids.includes(section));if(group&&group.ids.length>1)setExpanded([group.label]);},[section]);
  const Home=modules[0].icon;
  return <nav className="workspace-navigation suite-navigation" aria-label="Main navigation">
    <a href="#overview" onClick={()=>select('overview')} className={`nav-link ${section==='overview'?'active':''}`} aria-current={section==='overview'?'page':undefined}><Home aria-hidden="true"/><span>Home</span></a>
    {groups.map(group => <div className="navigation-group" key={group.label}>
      {group.ids.length===1?<a href={`#${group.ids[0]}`} onClick={()=>select(group.ids[0])} className={`nav-link ${group.ids.includes(section)?'active':''}`} aria-current={group.ids.includes(section)?'page':undefined}><group.icon aria-hidden="true"/><span>{group.label}</span></a>:<>
      <button className="suite-nav-parent" aria-expanded={expanded.includes(group.label)} aria-controls={`nav-${group.ids[0]}`} onClick={()=>setExpanded(old=>old.includes(group.label)?old.filter(n=>n!==group.label):[group.label])}><group.icon aria-hidden="true"/><span>{group.label}</span><ChevronDown aria-hidden="true" className={expanded.includes(group.label)?'expanded':''}/></button>
      <div id={`nav-${group.ids[0]}`} hidden={!expanded.includes(group.label)}>{group.ids.map(id => {
        const item = modules.find(module => module.id === id)!;
        return item&&<a key={id} href={`#${id}`} onClick={() => select(id)} className={`nav-link suite-nav-child ${section === id ? 'active' : ''}`} aria-current={section === id ? 'page' : undefined}>
          <span>{item.name}</span>
        </a>;
      })}</div></>}
    </div>)}
  </nav>;
}
