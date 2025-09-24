import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ApiExplorer() {
  const [method, setMethod] = useState("GET");
  const [table, setTable] = useState("");
  const [recordId, setRecordId] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [requestBody, setRequestBody] = useState('{"fields": {"Field Name": "Value"}}');
  const [response, setResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSendRequest = async () => {
    if (!authToken.trim()) {
      setResponse(JSON.stringify({
        error: {
          code: "MISSING_AUTH_TOKEN",
          message: "Authorization token is required"
        }
      }, null, 2));
      return;
    }

    if (!table.trim()) {
      setResponse(JSON.stringify({
        error: {
          code: "MISSING_TABLE",
          message: "Table name is required"
        }
      }, null, 2));
      return;
    }

    setIsLoading(true);
    
    try {
      let url = `/api/${table}`;
      if (recordId.trim() && (method === "GET" || method === "PATCH" || method === "DELETE")) {
        url += `/${recordId}`;
      }

      const options: RequestInit = {
        method,
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      };

      if (method === "POST" || method === "PATCH") {
        try {
          options.body = requestBody;
        } catch (error) {
          setResponse(JSON.stringify({
            error: {
              code: "INVALID_JSON",
              message: "Request body must be valid JSON"
            }
          }, null, 2));
          setIsLoading(false);
          return;
        }
      }

      const res = await fetch(url, options);
      const data = await res.json();
      
      setResponse(JSON.stringify(data, null, 2));
    } catch (error: any) {
      setResponse(JSON.stringify({
        error: {
          code: "NETWORK_ERROR",
          message: error.message
        }
      }, null, 2));
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setMethod("GET");
    setTable("");
    setRecordId("");
    setAuthToken("");
    setRequestBody('{"fields": {"Field Name": "Value"}}');
    setResponse(null);
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4" data-testid="text-api-explorer-title">Test API Endpoints</h3>
        <p className="text-muted-foreground">Try out the API endpoints with your authentication token.</p>
      </div>
      
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="method" className="block text-sm font-medium mb-2">Method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger data-testid="select-method">
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GET">GET</SelectItem>
                <SelectItem value="POST">POST</SelectItem>
                <SelectItem value="PATCH">PATCH</SelectItem>
                <SelectItem value="DELETE">DELETE</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="table" className="block text-sm font-medium mb-2">Table</Label>
            <Input
              id="table"
              type="text"
              placeholder="Jobs, Reports, Persons, etc."
              value={table}
              onChange={(e) => setTable(e.target.value)}
              data-testid="input-table"
            />
          </div>
          
          <div>
            <Label htmlFor="recordId" className="block text-sm font-medium mb-2">Record ID (optional)</Label>
            <Input
              id="recordId"
              type="text"
              placeholder="recABC123"
              value={recordId}
              onChange={(e) => setRecordId(e.target.value)}
              data-testid="input-record-id"
            />
          </div>
        </div>
        
        <div>
          <Label htmlFor="authToken" className="block text-sm font-medium mb-2">Authorization Token</Label>
          <Input
            id="authToken"
            type="password"
            placeholder="Your middleware API key"
            value={authToken}
            onChange={(e) => setAuthToken(e.target.value)}
            data-testid="input-auth-token"
          />
        </div>
        
        {(method === "POST" || method === "PATCH") && (
          <div>
            <Label htmlFor="requestBody" className="block text-sm font-medium mb-2">Request Body (for POST/PATCH)</Label>
            <Textarea
              id="requestBody"
              rows={6}
              className="font-mono text-sm"
              value={requestBody}
              onChange={(e) => setRequestBody(e.target.value)}
              data-testid="textarea-request-body"
            />
          </div>
        )}
        
        <div className="flex items-center space-x-4">
          <Button 
            onClick={handleSendRequest}
            disabled={isLoading}
            data-testid="button-send-request"
          >
            <i className="fas fa-paper-plane mr-2"></i>
            {isLoading ? "Sending..." : "Send Request"}
          </Button>
          <Button 
            variant="secondary"
            onClick={handleClear}
            data-testid="button-clear"
          >
            <i className="fas fa-trash mr-2"></i>
            Clear
          </Button>
        </div>
        
        <div className="border-t border-border pt-6">
          <h4 className="font-semibold mb-3">Response</h4>
          <div className="syntax-highlight rounded-lg p-4 font-mono text-sm border border-border min-h-32" data-testid="response-container">
            {response ? (
              <pre className="text-foreground text-xs overflow-auto">{response}</pre>
            ) : (
              <div className="flex items-center justify-center text-muted-foreground min-h-32">
                <div className="text-center">
                  <i className="fas fa-rocket text-2xl mb-2 block"></i>
                  <p>Click "Send Request" to see the response</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
