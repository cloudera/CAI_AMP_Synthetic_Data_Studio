import { JobStatus } from "../../types";

export interface ExportResponse {
    display_export_name: string;
    display_name: string | null;
    hf_export_path: string;
    id: number;
    job_id: string;
    job_name: string;
    job_status: JobStatus;
    local_export_path: string;
    timestamp: string;
};

// Add paginated response types
export type PaginatedExportsResponse = PaginatedResponse<ExportResponse>;