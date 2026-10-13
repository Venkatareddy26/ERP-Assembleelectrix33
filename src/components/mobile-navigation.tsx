import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { LayoutDashboard, Factory, ShieldCheck, Truck, Menu, Ellipsis, type LucideIcon } from 'lucide-react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { BrandMark } from './brand-mark';
import { GlobalSearch } from './global-search';
import { Field, FieldLabel } from './ui/field';
import type { Workspace } from '../types';

const tabs = [
  { id: 'overview', name: 'Overview', icon: LayoutDashboard },
  { id: 'production', name: 'Production', icon: Factory },
  { id: 'quality', name: 'QC', icon: ShieldCheck },
  { id: 'dispatch', name: 'Dispatch', icon: Truck },
];

export function MobileNavigation({ modules, section, title, mode, workspace, loading, restoring, preparingRestore, changeMode, refresh, backup, restore, navigate, selectSearch, shift, date, backupText, settings }: {
  modules: { id: string; name: string; icon: LucideIcon }[];
  section: string;
  title: string;
  mode: 'demo' | 'actual';
  workspace: Workspace | null;
  loading: boolean;
  restoring: boolean;
  preparingRestore: boolean;
  changeMode: (mode: 'demo' | 'actual') => void;
  refresh: () => void;
  backup: () => void;
  restore: () => void;
  navigate: (section: string) => void;
  selectSearch: (section: string, term: string, productId?: string) => void;
  shift: string;
  date: string;
  backupText: string;
  settings: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [sheet, setSheet] = useState<'modules' | 'data'>('modules');
  const trigger = useRef<HTMLButtonElement | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const returnFocus = useRef(true);
  const menuHistory = useRef(false);
  const closing = useRef(false);
  const afterClose = useRef<(() => void) | null>(null);
  const dismiss = (action?: () => void) => {
    if (closing.current) return;
    setOpen(false);
    if (menuHistory.current) {
      afterClose.current = action ?? null;
      closing.current = true;
      history.back();
    } else action?.();
  };
  const showMenu = (event: MouseEvent<HTMLButtonElement>, target: 'modules' | 'data') => {
    if (open || closing.current) return;
    trigger.current = event.currentTarget;
    returnFocus.current = true;
    history.pushState({ ...history.state, mobileMore: true }, '', location.href);
    menuHistory.current = true;
    setSheet(target);
    setOpen(true);
  };
  useEffect(() => { setOpen(false); }, [section]);
  useEffect(() => {
    const mobile = matchMedia('(max-width: 639.98px), (max-width: 900px) and (max-height: 430px) and (orientation: landscape)');
    const changed = () => { if (!mobile.matches) dismiss(); };
    const back = () => {
      if (!menuHistory.current) return;
      menuHistory.current = false;
      closing.current = false;
      setOpen(false);
      const action = afterClose.current;
      afterClose.current = null;
      action?.();
    };
    mobile.addEventListener('change', changed);
    window.addEventListener('popstate', back);
    return () => {
      mobile.removeEventListener('change', changed);
      window.removeEventListener('popstate', back);
    };
  }, []);
  const closeThen = (action: () => void) => { returnFocus.current = false; dismiss(action); };
  return <>
    <header className="mobile-header">
      <a href="#overview" aria-label="Assemble Electrix overview"><BrandMark /></a>
      <h1>{title}</h1>
      <Button variant="ghost" size="icon" aria-label="Open Data actions" aria-haspopup="dialog" aria-expanded={open && sheet === 'data'} onClick={event => showMenu(event, 'data')}><Ellipsis /></Button>
    </header>
    <nav className="mobile-tabs" aria-label="Mobile navigation">
      {tabs.map(tab => <a key={tab.id} href={`#${tab.id}`} className={section === tab.id ? 'active' : ''} aria-current={section === tab.id ? 'page' : undefined} onClick={() => navigate(tab.id)}><tab.icon aria-hidden="true" /><span>{tab.name}</span></a>)}
      <button className={!tabs.some(tab => tab.id === section) ? 'active' : ''} aria-label="More modules" aria-haspopup="dialog" aria-expanded={open && sheet === 'modules'} onClick={event => showMenu(event, 'modules')}><Menu aria-hidden="true" /><span>More</span></button>
    </nav>
    <Dialog open={open} onOpenChange={next => { if (!next) dismiss(); }}>
      <DialogContent placement="bottom" className="mobile-more-sheet" onOpenAutoFocus={event => { event.preventDefault(); heading.current?.focus({ preventScroll: true }); }} onCloseAutoFocus={event => { event.preventDefault(); if (returnFocus.current) trigger.current?.focus({ preventScroll: true }); }}>
        <DialogHeader><DialogTitle ref={heading} tabIndex={-1}>{sheet === 'data' ? 'Data' : 'More'}</DialogTitle><DialogDescription>{date} · Assemble Electrix</DialogDescription></DialogHeader>
        {sheet === 'modules' && <>
        <GlobalSearch key={mode} id="mobile-search-results" w={workspace} select={(target, term, productId) => closeThen(() => { selectSearch(target, term, productId); location.hash = target; })} />
        <nav className="mobile-more-modules" aria-label="More modules">{modules.filter(module => !tabs.some(tab => tab.id === module.id)).map(module => <a key={module.id} href={`#${module.id}`} aria-current={section === module.id ? 'page' : undefined} onClick={event => { event.preventDefault(); closeThen(() => { navigate(module.id); location.hash = module.id; }); }}><module.icon aria-hidden="true" /><span>{module.name}</span></a>)}</nav>
        <Button variant="outline" className="mobile-shift-button" onClick={() => closeThen(settings)}>Shift: {shift || 'Not set'}</Button>
        </>}
        {sheet === 'data' && <div className="mobile-workspace-controls">
          <Field><FieldLabel htmlFor="mobile-workspace">Workspace</FieldLabel><select id="mobile-workspace" aria-label="Choose record workspace" value={mode} disabled={restoring} onChange={event => changeMode(event.target.value as 'demo' | 'actual')}><option value="demo">Demo workspace</option><option value="actual">Your actual records</option></select></Field>
          <div className="mobile-data-actions">
            <Button variant="outline" disabled={loading || restoring} onClick={refresh}>Refresh</Button>
            <Button variant="outline" disabled={!workspace || restoring} onClick={backup}>Backup</Button>
            <Button variant="outline" disabled={preparingRestore || restoring} onClick={() => closeThen(restore)}>{preparingRestore ? 'Checking backup…' : 'Restore backup'}</Button>
          </div>
          {mode === 'actual' && <p className="mobile-backup-note">Last backup: {backupText}</p>}
        </div>}
      </DialogContent>
    </Dialog>
  </>;
}
