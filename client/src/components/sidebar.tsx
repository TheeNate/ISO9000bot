interface SidebarProps {
  activeSection: string;
  onSectionClick: (sectionId: string) => void;
}

export default function Sidebar({ activeSection, onSectionClick }: SidebarProps) {
  const isActive = (sectionId: string) => activeSection === sectionId;

  return (
    <aside className="w-80 bg-card border-r border-border h-screen sticky top-0 overflow-y-auto">
      <div className="p-6">
        <nav className="space-y-2">
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Getting Started</h3>
            <ul className="space-y-1">
              <li>
                <button
                  onClick={() => onSectionClick('overview')}
                  className={`w-full text-left flex items-center px-3 py-2 text-sm rounded-lg transition-colors ${
                    isActive('overview') 
                      ? 'bg-primary/10 text-primary' 
                      : 'hover:bg-accent hover:text-accent-foreground'
                  }`}
                  data-testid="button-nav-overview"
                >
                  <i className="fas fa-home w-4 mr-3"></i>Overview
                </button>
              </li>
              <li>
                <button
                  onClick={() => onSectionClick('auth')}
                  className={`w-full text-left flex items-center px-3 py-2 text-sm rounded-lg transition-colors ${
                    isActive('auth') 
                      ? 'bg-primary/10 text-primary' 
                      : 'hover:bg-accent hover:text-accent-foreground'
                  }`}
                  data-testid="button-nav-auth"
                >
                  <i className="fas fa-shield-alt w-4 mr-3"></i>Authentication
                </button>
              </li>
              <li>
                <button
                  onClick={() => onSectionClick('config')}
                  className={`w-full text-left flex items-center px-3 py-2 text-sm rounded-lg transition-colors ${
                    isActive('config') 
                      ? 'bg-primary/10 text-primary' 
                      : 'hover:bg-accent hover:text-accent-foreground'
                  }`}
                  data-testid="button-nav-config"
                >
                  <i className="fas fa-cog w-4 mr-3"></i>Configuration
                </button>
              </li>
            </ul>
          </div>
          
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">API Endpoints</h3>
            <ul className="space-y-1">
              <li>
                <button
                  onClick={() => onSectionClick('get-all')}
                  className={`w-full text-left flex items-center px-3 py-2 text-sm rounded-lg transition-colors ${
                    isActive('get-all') 
                      ? 'bg-primary/10 text-primary' 
                      : 'hover:bg-accent hover:text-accent-foreground'
                  }`}
                  data-testid="button-nav-get-all"
                >
                  <span className="method-get px-2 py-1 text-xs rounded border mr-3 font-mono">GET</span>
                  List Records
                </button>
              </li>
              <li>
                <button
                  onClick={() => onSectionClick('explorer')}
                  className={`w-full text-left flex items-center px-3 py-2 text-sm rounded-lg transition-colors ${
                    isActive('explorer') 
                      ? 'bg-primary/10 text-primary' 
                      : 'hover:bg-accent hover:text-accent-foreground'
                  }`}
                  data-testid="button-nav-explorer"
                >
                  <i className="fas fa-rocket w-4 mr-3 text-muted-foreground"></i>
                  API Explorer
                </button>
              </li>
            </ul>
          </div>
        </nav>
      </div>
    </aside>
  );
}
