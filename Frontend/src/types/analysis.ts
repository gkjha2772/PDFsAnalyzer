export interface SubsectionAnalysis {
  document: string;
  section_number: string;
  section_title: string;
  refined_text: string;
}

export interface ExtractedSection {
  document: string;
  section_number: string;
  section_title: string;
  importance_rank: number;
  page_number: number;
}

export interface AnalysisMetadata {
  input_documents: string[];
  persona: string;
  job_to_be_done: string;
  timestamp: string;
}

export interface AnalysisResponse {
  metadata: AnalysisMetadata;
  extracted_sections: ExtractedSection[];
  subsection_analysis: SubsectionAnalysis[];
}

export type AnalysisStatus = 'idle' | 'uploading' | 'processing' | 'success' | 'error';
