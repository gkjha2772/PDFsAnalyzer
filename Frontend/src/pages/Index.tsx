import { useState } from "react";
import { FileText } from "lucide-react";
import { FileUploadZone } from "@/components/FileUploadZone";
import { StatusIndicator } from "@/components/StatusIndicator";
import { ResultsDisplay } from "@/components/ResultsDisplay";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { AnalysisResponse, AnalysisStatus } from "@/types/analysis";

const Index = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [task, setTask] = useState("");
  const [personaName, setPersonaName] = useState("");
  const [personaFile, setPersonaFile] = useState<File | null>(null);
  const [personaType, setPersonaType] = useState<"name" | "file">("name");
  const [status, setStatus] = useState<AnalysisStatus>("idle");
  const [results, setResults] = useState<AnalysisResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const { toast } = useToast();

  const API_BASE = (import.meta as any).env?.VITE_API_BASE || "";
  const analyzeUrlDisplay = API_BASE
    ? `${API_BASE.replace(/\/$/, "")}/analyze`
    : "/analyze";

  const canSubmit =
    task.trim() !== "" &&
    files.length > 0 &&
    status !== "uploading" &&
    status !== "processing";

  const handlePersonaFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type === "application/json") {
        setPersonaFile(file);
      } else {
        toast({
          title: "Invalid file type",
          description: "Please upload a JSON file for persona",
          variant: "destructive",
        });
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canSubmit) return;

    setStatus("uploading");
    setResults(null);
    setErrorMessage("");

    try {
      const formData = new FormData();
      formData.append("task", task);

      if (personaType === "file" && personaFile) {
        formData.append("persona_file", personaFile);
      } else if (personaType === "name" && personaName.trim()) {
        formData.append("persona_name", personaName);
      }

      files.forEach((file) => {
        formData.append("pdfs", file);
      });

      setStatus("processing");

      // Determine API endpoint. In development we proxy `/analyze` to the backend.
      // In deployed previews (e.g. lovable preview) set VITE_API_BASE to the full backend URL.
      const API_BASE = (import.meta as any).env?.VITE_API_BASE || "";
      const analyzeUrl = API_BASE
        ? `${API_BASE.replace(/\/$/, "")}/analyze`
        : "/analyze";

      console.log("Calling analyze URL:", analyzeUrl);
      // Dump form field names for debugging (files are not logged fully)
      try {
        for (const pair of (formData as any).entries())
          console.log("formData entry:", pair[0], pair[1]);
      } catch (e) {
        console.log("formData inspect failed", e);
      }

      const response = await fetch(analyzeUrl, {
        method: "POST",
        body: formData,
      });

      console.log(
        "analyze response status:",
        response.status,
        "content-type:",
        response.headers.get("content-type")
      );

      if (!response.ok) {
        const text = await response.text().catch(() => null);
        let msg = `Server error: ${response.status}`;
        try {
          const parsed = text ? JSON.parse(text) : null;
          msg = parsed?.error || msg;
        } catch (_) {
          // text is not JSON
          msg = text || msg;
        }
        throw new Error(msg);
      }

      // Try to parse JSON response; if server returned HTML (e.g., an error page), surface it.
      let data: AnalysisResponse;
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const text = await response.text();
        throw new Error(
          `Expected JSON response but received: ${text.slice(0, 200)}`
        );
      }
      setResults(data);
      setStatus("success");

      toast({
        title: "Analysis complete!",
        description: `Extracted ${data.extracted_sections.length} relevant sections`,
      });
    } catch (error) {
      console.error("Analysis error:", error);
      const raw = error instanceof Error ? error.message : String(error);

      // Detect when the response was HTML (e.g., an index.html or error page)
      let message = raw;
      const low = raw.toLowerCase();
      if (
        low.trim().startsWith("<") ||
        low.includes("<!doctype") ||
        low.includes("<html")
      ) {
        message =
          "The server returned HTML instead of JSON. This usually means the frontend is calling the wrong host (preview host) or the backend is not running.\n" +
          "Hints: start the Flask backend (http://localhost:5000) and/or set VITE_API_BASE to your backend URL.\n\nResponse preview:\n" +
          raw.slice(0, 800);
      }

      setErrorMessage(message);
      setStatus("error");

      toast({
        title: "Analysis failed",
        description: message.substring(0, 200),
        variant: "destructive",
      });
    }
  };

  const checkBackend = async () => {
    const API_BASE = (import.meta as any).env?.VITE_API_BASE || "";
    const healthUrl = API_BASE
      ? `${API_BASE.replace(/\/$/, "")}/health`
      : "/health";
    setStatus("processing");
    try {
      const resp = await fetch(healthUrl);
      if (!resp.ok) throw new Error(`status ${resp.status}`);
      const j = await resp.json();
      toast({ title: "Backend healthy", description: JSON.stringify(j) });
      setStatus("idle");
    } catch (err) {
      const m = err instanceof Error ? err.message : String(err);
      toast({
        title: "Backend check failed",
        description: m,
        variant: "destructive",
      });
      setStatus("error");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-primary">
              <FileText className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Persona PDF Analyzer
              </h1>
              <p className="text-sm text-muted-foreground">
                Upload PDFs and a task to extract the most relevant sections for
                a persona
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Analysis Configuration</CardTitle>
                <CardDescription>
                  Enter your task and upload PDF documents to analyze
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="task">Task Description *</Label>
                    <Input
                      id="task"
                      placeholder="e.g., Plan a 4-day itinerary"
                      value={task}
                      onChange={(e) => setTask(e.target.value)}
                      disabled={
                        status === "uploading" || status === "processing"
                      }
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Describe the job or task you want to accomplish
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Persona (Optional)</Label>
                    <Tabs
                      value={personaType}
                      onValueChange={(v) =>
                        setPersonaType(v as "name" | "file")
                      }
                    >
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="name">Name</TabsTrigger>
                        <TabsTrigger value="file">JSON File</TabsTrigger>
                      </TabsList>
                      <TabsContent value="name" className="mt-3">
                        <Input
                          placeholder="e.g., Travel Enthusiast"
                          value={personaName}
                          onChange={(e) => setPersonaName(e.target.value)}
                          disabled={
                            status === "uploading" || status === "processing"
                          }
                        />
                      </TabsContent>
                      <TabsContent value="file" className="mt-3">
                        <Input
                          type="file"
                          accept=".json"
                          onChange={handlePersonaFileChange}
                          disabled={
                            status === "uploading" || status === "processing"
                          }
                        />
                        {personaFile && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Selected: {personaFile.name}
                          </p>
                        )}
                      </TabsContent>
                    </Tabs>
                  </div>

                  <div className="space-y-2">
                    <Label>PDF Documents *</Label>
                    <FileUploadZone
                      files={files}
                      onFilesChange={setFiles}
                      disabled={
                        status === "uploading" || status === "processing"
                      }
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={!canSubmit}
                    className="w-full"
                    size="lg"
                  >
                    Analyze Documents
                  </Button>
                  <div className="flex items-center justify-between mt-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={checkBackend}
                    >
                      Check Backend
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      API: {analyzeUrlDisplay}
                    </p>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Analysis Status</CardTitle>
              </CardHeader>
              <CardContent>
                <StatusIndicator
                  status={status}
                  message={errorMessage || undefined}
                />
              </CardContent>
            </Card>

            {results && <ResultsDisplay results={results} />}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
