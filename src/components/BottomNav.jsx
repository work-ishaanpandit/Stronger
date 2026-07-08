import useStore from '../store/useStore';
import { Sun, Moon, LayoutDashboard } from 'lucide-react';

const TABS = [
  { id: 'dawn',      icon: Sun,             label: 'Dawn' },
  { id: 'dusk',      icon: Moon,            label: 'Dusk' },
  { id: 'chronicle', icon: LayoutDashboard, label: 'Chronicle' },
];

export default function BottomNav() {
  const activeTab   = useStore((s) => s.activeTab);
  const setActiveTab = useStore((s) => s.setActiveTab);

  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            className={`bottom-nav-item ${isActive ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon size={22} strokeWidth={isActive ? 2.2 : 1.7} />
            <span className="bottom-nav-label">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
