export interface PaginationMetadata {
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
  }
  
  export interface PaginatedResponse<T> {
    data: T[];
    pagination: PaginationMetadata;
  }