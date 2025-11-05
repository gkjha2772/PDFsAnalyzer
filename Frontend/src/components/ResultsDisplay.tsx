import { useState } from "react";
import { Download, ChevronDown, ChevronUp, FileText, Calendar, User, Briefcase } from "lucide-react";
import { AnalysisResponse } from "@/types/analysis";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ResultsDisplayProps {
  results: AnalysisResponse;
}

export const ResultsDisplay = ({ results }: ResultsDisplayProps) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const toggleSection = (sectionKey: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionKey)) {
      newExpanded.delete(sectionKey);
    } else {
      newExpanded.add(sectionKey);
    }
    setExpandedSections(newExpanded);
  };

  const downloadJSON = () => {
    const dataStr = JSON.stringify(results, null, 2);
    const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);
    const exportFileDefaultName = `analysis_${new Date().toISOString().split('T')[0]}.json`;

    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", exportFileDefaultName);
    linkElement.click();
  };

  const getSectionText = (section: typeof results.extracted_sections[0]) => {
    const subsection = results.subsection_analysis.find(
      (s) =>
        s.document === section.document &&
        s.section_number === section.section_number
    );
    return subsection?.refined_text || "No detailed text available";
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-lg">Analysis Summary</CardTitle>
          <Button onClick={downloadJSON} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Download JSON
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-2">
            <Briefcase className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-medium text-muted-foreground">Task</p>
              <p className="text-sm text-foreground">{results.metadata.job_to_be_done}</p>
            </div>
          </div>
          
          <div className="flex items-start gap-2">
            <User className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-medium text-muted-foreground">Persona</p>
              <p className="text-sm text-foreground">{results.metadata.persona}</p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <FileText className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-medium text-muted-foreground">Documents Analyzed</p>
              <p className="text-sm text-foreground">{results.metadata.input_documents.length} PDF(s)</p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Calendar className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-medium text-muted-foreground">Analyzed On</p>
              <p className="text-sm text-foreground">
                {new Date(results.metadata.timestamp).toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Extracted Sections ({results.extracted_sections.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {results.extracted_sections.map((section, index) => {
            const sectionKey = `${section.document}-${section.section_number}`;
            const isExpanded = expandedSections.has(sectionKey);
            const sectionText = getSectionText(section);

            return (
              <div
                key={index}
                className="border border-border rounded-lg overflow-hidden bg-card hover:border-primary/50 transition-colors"
              >
                <button
                  onClick={() => toggleSection(sectionKey)}
                  className="w-full p-4 text-left hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          Rank #{section.importance_rank}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Page {section.page_number}
                        </span>
                      </div>
                      <h4 className="font-semibold text-sm text-foreground mb-1">
                        {section.section_title}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {section.document} • Section {section.section_number}
                      </p>
                      {!isExpanded && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                          {sectionText}
                        </p>
                      )}
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 pt-2 border-t border-border bg-muted/30">
                    <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                      {sectionText}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
};
