export default function Header() {
  return (
    <header className="border-b border-border bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <i className="fas fa-database text-primary-foreground text-lg"></i>
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground" data-testid="text-header-title">Airtable Middleware API</h1>
              <p className="text-sm text-muted-foreground" data-testid="text-header-subtitle">Secure REST API for LeNDT QMS ISO 9001</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-primary/10 px-3 py-1 rounded-full">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
              <span className="text-sm text-primary font-medium" data-testid="text-status-live">Live</span>
            </div>
            <button 
              className="bg-secondary hover:bg-secondary/80 px-4 py-2 rounded-lg transition-colors"
              data-testid="button-settings"
            >
              <i className="fas fa-cog mr-2"></i>
              Settings
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
