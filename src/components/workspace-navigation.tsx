import type { LucideIcon } from 'lucide-react';

const groups = [
  { label: 'WORKSPACE', ids: ['overview'] },
  { label: 'MANUFACTURING', ids: ['orders', 'production', 'quality', 'dispatch'] },
  { label: 'RECORDS & BILLING', ids: ['inventory', 'bom', 'customers', 'billing', 'workers'] },
];

export function WorkspaceNavigation({ modules, section, select }: {
  modules: { id: string; name: string; icon: LucideIcon }[];
  section: string;
  select: (id: string) => void;
}) {
  return <nav className="workspace-navigation" aria-label="Main navigation">
    {groups.map(group => <div className="navigation-group" key={group.label}>
      <p className="navigation-group-label">{group.label}</p>
      {group.ids.map(id => {
        const item = modules.find(module => module.id === id)!;
        return <a key={id} href={`#${id}`} onClick={() => select(id)} className={`nav-link ${section === id ? 'active' : ''}`} aria-current={section === id ? 'page' : undefined}>
          <item.icon aria-hidden="true" /><span>{item.name}</span>
        </a>;
      })}
    </div>)}
  </nav>;
}
