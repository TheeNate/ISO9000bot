import { useState } from "react";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import ApiExplorer from "@/components/api-explorer";

export default function Home() {
  const [activeSection, setActiveSection] = useState("overview");

  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="bg-background text-foreground font-sans min-h-screen">
      <Header />
      
      <div className="flex">
        <Sidebar activeSection={activeSection} onSectionClick={scrollToSection} />
        
        <main className="flex-1 p-8 max-w-none">
          {/* Overview Section */}
          <section id="overview" className="mb-12">
            <div className="mb-8">
              <h2 className="text-3xl font-bold mb-4" data-testid="text-main-title">Airtable Middleware API</h2>
              <p className="text-xl text-muted-foreground mb-6" data-testid="text-main-description">
                A secure REST API that acts as middleware between your custom GPT and Airtable base, providing standardized access to all tables in your LeNDT QMS ISO 9001 system.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-card border border-border rounded-lg p-6">
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mr-4">
                      <i className="fas fa-shield-alt text-primary"></i>
                    </div>
                    <h3 className="font-semibold" data-testid="text-feature-security">Secure by Design</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">API key authentication with Bearer token authorization protects your Airtable data.</p>
                </div>
                
                <div className="bg-card border border-border rounded-lg p-6">
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center mr-4">
                      <i className="fas fa-layer-group text-blue-400"></i>
                    </div>
                    <h3 className="font-semibold" data-testid="text-feature-tables">Universal Tables</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">Generic endpoints work with any table in your Airtable base automatically.</p>
                </div>
                
                <div className="bg-card border border-border rounded-lg p-6">
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center mr-4">
                      <i className="fas fa-sync-alt text-amber-400"></i>
                    </div>
                    <h3 className="font-semibold" data-testid="text-feature-pagination">Complete Pagination</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">Handles large datasets with automatic pagination and clean JSON responses.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Authentication Section */}
          <section id="auth" className="mb-12">
            <h2 className="text-2xl font-bold mb-6" data-testid="text-auth-title">Authentication</h2>
            
            <div className="bg-card border border-border rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4">API Key Authentication</h3>
              <p className="text-muted-foreground mb-4">All requests require a Bearer token in the Authorization header:</p>
              
              <div className="syntax-highlight rounded-lg p-4 font-mono text-sm border border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-muted-foreground">Request Header</span>
                  <button 
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    data-testid="button-copy-auth"
                    onClick={() => {
                      navigator.clipboard.writeText("Authorization: Bearer YOUR_MIDDLEWARE_KEY");
                    }}
                  >
                    <i className="fas fa-copy mr-1"></i>Copy
                  </button>
                </div>
                <code className="text-primary">Authorization: Bearer YOUR_MIDDLEWARE_KEY</code>
              </div>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
              <div className="flex items-start">
                <i className="fas fa-exclamation-triangle text-amber-400 mt-1 mr-3"></i>
                <div>
                  <p className="font-medium text-amber-400 mb-1">Security Note</p>
                  <p className="text-sm text-amber-400/80">Your Airtable Personal Access Token is never exposed in responses or logs. The middleware API key provides an additional security layer.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Configuration Section */}
          <section id="config" className="mb-12">
            <h2 className="text-2xl font-bold mb-6" data-testid="text-config-title">Environment Configuration</h2>
            
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Required Environment Variables</h3>
              
              <div className="space-y-4">
                <div className="border border-border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <code className="font-mono text-primary font-medium">AIRTABLE_TOKEN</code>
                    <span className="text-xs bg-red-500/10 text-red-400 px-2 py-1 rounded">Required</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Your Airtable Personal Access Token with read/write access to the base</p>
                </div>
                
                <div className="border border-border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <code className="font-mono text-primary font-medium">AIRTABLE_BASE_ID</code>
                    <span className="text-xs bg-red-500/10 text-red-400 px-2 py-1 rounded">Required</span>
                  </div>
                  <p className="text-sm text-muted-foreground">The ID of your Airtable base (LeNDT QMS)</p>
                </div>
                
                <div className="border border-border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <code className="font-mono text-primary font-medium">MIDDLEWARE_KEY</code>
                    <span className="text-xs bg-red-500/10 text-red-400 px-2 py-1 rounded">Required</span>
                  </div>
                  <p className="text-sm text-muted-foreground">API key for authenticating requests to this middleware</p>
                </div>
                
                <div className="border border-border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <code className="font-mono text-primary font-medium">PORT</code>
                    <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded">Optional</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Server port (defaults to 5000)</p>
                </div>
              </div>
            </div>
          </section>

          {/* API Endpoints Section */}
          <section id="endpoints" className="mb-12">
            <h2 className="text-2xl font-bold mb-6" data-testid="text-endpoints-title">API Endpoints</h2>
            
            {/* GET All Records */}
            <div id="get-all" className="bg-card border border-border rounded-lg p-6 mb-6">
              <div className="flex items-center mb-4">
                <span className="method-get px-3 py-1 text-sm rounded border mr-4 font-mono">GET</span>
                <code className="font-mono text-lg">/:table</code>
              </div>
              <p className="text-muted-foreground mb-6">Retrieve all records from the specified table with automatic pagination handling.</p>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3">Example Request</h4>
                  <div className="syntax-highlight rounded-lg p-4 font-mono text-sm border border-border">
                    <div className="text-muted-foreground mb-2">cURL</div>
                    <code className="text-foreground break-all">
                      curl -H "Authorization: Bearer YOUR_KEY" \<br/>
                      &nbsp;&nbsp;https://api.example.com/api/Jobs
                    </code>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-3">Response</h4>
                  <div className="syntax-highlight rounded-lg p-4 font-mono text-sm border border-border">
                    <div className="status-200 px-2 py-1 text-xs rounded mb-2">200 OK</div>
                    <code className="text-foreground text-xs">
                      {`{
  "records": [
    {
      "id": "recABC123",
      "fields": {
        "Job Title": "Quality Audit",
        "Status": "In Progress"
      },
      "createdTime": "2024-01-15T10:30:00Z"
    }
  ]
}`}
                    </code>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional endpoint documentation sections would follow similar pattern */}
          </section>

          {/* Interactive API Explorer */}
          <section id="explorer" className="mb-12">
            <h2 className="text-2xl font-bold mb-6" data-testid="text-explorer-title">API Explorer</h2>
            <ApiExplorer />
          </section>
        </main>
      </div>
    </div>
  );
}
