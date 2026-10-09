export interface ModuleFieldDefinition {
  name: string;
  displayName: string;
  dataType: string;
  isRequired: boolean;
  description: string;
  exampleValue: string;
  synonyms: string[];
  allowedValues?: string[];
}

export interface ModuleTemplateMetadata {
  module: string;
  title: string;
  description: string;
  fields: ModuleFieldDefinition[];
}

export interface UploadResult {
  batchId: string;
  module: string;
  fileName: string;
  sheets: string[];
  selectedSheet: string;
  headers: string[];
  sampleRows: { [key: string]: string }[];
  totalRows: number;
  suggestedColumnMap: { [key: string]: string };
}

export interface MappingRequest {
  columnMap: { [userHeader: string]: string };
  valueMap?: { [systemField: string]: { [userValue: string]: string } };
  dateFormat?: string;
  saveAsProfileName?: string;
  mode?: number; // 1 = AddNewOnly, 2 = UpdateExisting
  allOrNothing?: boolean;
}

export interface PreviewValidationRow {
  rowNumber: number;
  rawData: { [key: string]: string };
  mappedData: { [key: string]: any };
  isValid: boolean;
  isDuplicate: boolean;
  errors: string[];
  warnings: string[];
}

export interface PreviewValidationResult {
  batchId: string;
  totalRowsPreviewed: number;
  validCount: number;
  invalidCount: number;
  duplicateCount: number;
  rows: PreviewValidationRow[];
}

export interface ImportResult {
  batchId: string;
  status: number;
  statusName: string;
  totalRows: number;
  successRows: number;
  failedRows: number;
  skippedRows: number;
  errorMessage?: string;
}

export interface ImportError {
  rowNumber: number;
  column?: string;
  value?: string;
  message: string;
}

export interface ImportBatchDetail {
  id: string;
  module: string;
  fileName: string;
  status: number;
  statusName: string;
  totalRows: number;
  successRows: number;
  failedRows: number;
  skippedRows: number;
  mode: number;
  modeName: string;
  allOrNothing: boolean;
  createdAtUtc: string;
  completedAtUtc?: string;
  rolledBackAtUtc?: string;
  canRollback: boolean;
  errors: ImportError[];
}

export interface MappingProfile {
  id: string;
  module: string;
  name: string;
  columnMap: { [key: string]: string };
  valueMap?: { [key: string]: { [k: string]: string } };
  dateFormat?: string;
  createdAtUtc: string;
}
