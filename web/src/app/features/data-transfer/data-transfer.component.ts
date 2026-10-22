import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { DataTransferService } from './services/data-transfer.service';
import {
  UploadResult,
  PreviewValidationResult,
  ImportResult,
  ImportBatchDetail,
  MappingProfile
} from './models/data-transfer.model';
import { ThemeService } from '../../core/services/theme.service';

interface ModuleOption {
  id: string;
  name: string;
  description: string;
  icon: string;
}

@Component({
  selector: 'app-data-transfer',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="data-transfer-container">
      <header class="page-header">
        <div>
          <h1>Data Import & Export</h1>
          <p class="subtitle">Safely migrate, import legacy spreadsheets, and backup all financial records.</p>
        </div>
      </header>

      <!-- Main Navigation Tabs -->
      <nav class="transfer-tabs">
        <button
          [class.active]="activeTab() === 'import'"
          (click)="activeTab.set('import')"
          class="tab-btn">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" class="tab-svg">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          <span>Import Wizard</span>
        </button>
        <button
          [class.active]="activeTab() === 'export'"
          (click)="activeTab.set('export')"
          class="tab-btn">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" class="tab-svg">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <span>Export Data</span>
        </button>
        <button
          [class.active]="activeTab() === 'history'"
          (click)="loadHistory(); activeTab.set('history')"
          class="tab-btn">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" class="tab-svg">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span>Import History</span>
        </button>
        <button
          [class.active]="activeTab() === 'profiles'"
          (click)="loadProfiles(); activeTab.set('profiles')"
          class="tab-btn">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" class="tab-svg">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z" />
          </svg>
          <span>Saved Mapping Profiles</span>
        </button>
      </nav>

      <!-- TAB 1: IMPORT WIZARD -->
      @if (activeTab() === 'import') {
        <div class="card wizard-card">
          <!-- Stepper Indicator -->
          <div class="wizard-stepper">
            <div class="step-node" [class.active]="importStep() === 1" [class.done]="importStep() > 1">
              <span class="step-num">1</span>
              <span class="step-label">Select Module</span>
            </div>
            <div class="step-line" [class.done]="importStep() > 1"></div>

            <div class="step-node" [class.active]="importStep() === 2" [class.done]="importStep() > 2">
              <span class="step-num">2</span>
              <span class="step-label">Upload File</span>
            </div>
            <div class="step-line" [class.done]="importStep() > 2"></div>

            <div class="step-node" [class.active]="importStep() === 3" [class.done]="importStep() > 3">
              <span class="step-num">3</span>
              <span class="step-label">Map Columns</span>
            </div>
            <div class="step-line" [class.done]="importStep() > 3"></div>

            <div class="step-node" [class.active]="importStep() === 4" [class.done]="importStep() > 4">
              <span class="step-num">4</span>
              <span class="step-label">Preview & Check</span>
            </div>
            <div class="step-line" [class.done]="importStep() > 4"></div>

            <div class="step-node" [class.active]="importStep() === 5" [class.done]="importStep() === 5">
              <span class="step-num">5</span>
              <span class="step-label">Import Results</span>
            </div>
          </div>

          <!-- STEP 1: SELECT MODULE -->
          @if (importStep() === 1) {
            <div class="step-content">
              <h3>Step 1: Choose Financial Module to Import</h3>
              <p class="step-desc">Pick the financial entity type. You can download a pre-formatted template with instructions.</p>

              <div class="module-grid">
                @for (mod of moduleOptions; track mod.id) {
                  <div
                    class="module-card"
                    [class.selected]="selectedModule() === mod.id"
                    (click)="selectedModule.set(mod.id)">
                    <div class="mod-icon">
                      @if (mod.id === 'Transactions') {
                        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                      } @else if (mod.id === 'LoanAccounts') {
                        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                      } @else if (mod.id === 'LoanTransactions') {
                        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                      } @else if (mod.id === 'Epfo') {
                        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="21" x2="21" y2="21"/><line x1="3" y1="10" x2="21" y2="10"/><polyline points="12 3 2 10 22 10"/><line x1="6" y1="10" x2="6" y2="21"/><line x1="10" y1="10" x2="10" y2="21"/><line x1="14" y1="10" x2="14" y2="21"/><line x1="18" y1="10" x2="18" y2="21"/></svg>
                      } @else if (mod.id === 'Holdings') {
                        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
                      } @else if (mod.id === 'InvestmentTransactions') {
                        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                      } @else {
                        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
                      }
                    </div>
                    <div class="mod-info">
                      <h4>{{ mod.name }}</h4>
                      <p>{{ mod.description }}</p>
                    </div>
                  </div>
                }
              </div>

              <div class="step-actions">
                <button
                  type="button"
                  class="btn-secondary"
                  (click)="downloadTemplate(selectedModule())"
                  [disabled]="isDownloadingTemplate()">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" class="mr-1">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  <span>Download Blank Template (.xlsx)</span>
                </button>
                <button
                  type="button"
                  class="btn-primary"
                  (click)="goToStep(2)">
                  Continue to File Upload →
                </button>
              </div>
            </div>
          }

          <!-- STEP 2: UPLOAD FILE -->
          @if (importStep() === 2) {
            <div class="step-content">
              <h3>Step 2: Upload Excel or CSV File for {{ getModuleName(selectedModule()) }}</h3>
              <p class="step-desc">{{ selectedModule() === 'Epfo' ? 'Upload .xlsx, .xls, .csv, or official EPFO Member Passbook .pdf (Max 10 MB).' : 'Upload .xlsx, .xls, or .csv file (Max 10 MB, up to 50,000 rows).' }}</p>

              <div
                class="dropzone"
                [class.dragover]="isDragging()"
                (dragover)="onDragOver($event)"
                (dragleave)="isDragging.set(false)"
                (drop)="onFileDrop($event)"
                (click)="fileInput.click()">
                <input
                  #fileInput
                  type="file"
                  [accept]="selectedModule() === 'Epfo' ? '.xlsx,.xls,.csv,.pdf,application/pdf' : '.xlsx,.xls,.csv'"
                  (change)="onFileSelected($event)"
                  style="display: none;" />

                <div class="dropzone-content">
                  <span class="upload-icon">
                    <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" stroke-width="1.8">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="17 8 12 3 7 8"/>
                      <line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                  </span>
                  <h4>Click or Drag & Drop File Here</h4>
                  <p>{{ selectedModule() === 'Epfo' ? '.xlsx, .xls, .csv, or official EPFO Passbook .pdf' : '.xlsx, .xls, or .csv up to 10 MB' }}</p>
                </div>
              </div>

              @if (selectedFile()) {
                <div class="selected-file-badge">
                  <span class="file-info-row">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                    </svg>
                    <strong>{{ selectedFile()?.name }}</strong> ({{ (selectedFile()!.size / 1024).toFixed(1) }} KB)
                  </span>
                </div>
              }

              @if (uploadError()) {
                <div class="alert alert-danger">{{ uploadError() }}</div>
              }

              <div class="step-actions">
                <button type="button" class="btn-secondary" (click)="goToStep(1)">← Back</button>
                <button
                  type="button"
                  class="btn-primary"
                  [disabled]="!selectedFile() || isUploading()"
                  (click)="uploadAndInspect()">
                  {{ isUploading() ? 'Uploading & Inspecting...' : 'Upload & Proceed to Mapping →' }}
                </button>
              </div>
            </div>
          }

          <!-- STEP 3: MAP COLUMNS -->
          @if (importStep() === 3 && uploadResult()) {
            <div class="step-content">
              <h3>Step 3: Column Mapping & Options</h3>
              <p class="step-desc">Match columns from your uploaded file to Hisaab system fields. Required fields marked with *.</p>

              <!-- Profile Quick Load -->
              @if (savedProfiles().length > 0) {
                <div class="profile-loader">
                  <label>Apply Saved Mapping Profile:</label>
                  <select (change)="applyProfile($event)">
                    <option value="">-- Select Saved Profile --</option>
                    @for (prof of savedProfiles(); track prof.id) {
                      <option [value]="prof.id">{{ prof.name }} ({{ prof.dateFormat || 'dd-MM-yyyy' }})</option>
                    }
                  </select>
                </div>
              }

              <div class="mapping-table-wrapper">
                <table class="data-table mapping-table">
                  <thead>
                    <tr>
                      <th>Uploaded Column Header</th>
                      <th>Sample Data (First 3 Rows)</th>
                      <th>System Field</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (hdr of uploadResult()!.headers; track hdr) {
                      <tr>
                        <td>
                          <strong>{{ hdr }}</strong>
                        </td>
                        <td class="samples-cell">
                          @for (val of getSampleValues(hdr); track val) {
                            <span class="sample-tag">{{ val || '—' }}</span>
                          }
                        </td>
                        <td>
                          <select
                            [(ngModel)]="columnMapping[hdr]"
                            class="mapping-select"
                            [class.matched]="columnMapping[hdr] && columnMapping[hdr] !== 'Ignore'">
                            <option value="Ignore">✕ (Ignore this column)</option>
                            @for (f of getAvailableFields(selectedModule()); track f.name) {
                              <option [value]="f.name">
                                {{ f.displayName }} {{ f.isRequired ? '*' : '' }}
                              </option>
                            }
                          </select>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>

              <!-- Extra Options -->
              <div class="import-options-card">
                <h4>Import Preferences</h4>
                <div class="options-grid">
                  <div class="form-group">
                    <label>Date Format in File:</label>
                    <select [(ngModel)]="selectedDateFormat">
                      <option value="dd-MM-yyyy">dd-MM-yyyy (e.g. 05-10-2026)</option>
                      <option value="dd/MM/yyyy">dd/MM/yyyy (e.g. 05/10/2026)</option>
                      <option value="yyyy-MM-dd">yyyy-MM-dd (ISO, e.g. 2026-10-05)</option>
                      <option value="MM/dd/yyyy">MM/dd/yyyy (US, e.g. 10/05/2026)</option>
                    </select>
                  </div>

                  <div class="form-group">
                    <label>Import Mode:</label>
                    <select [(ngModel)]="importMode">
                      <option [ngValue]="1">Add New Records Only (Default)</option>
                      <option [ngValue]="2">Update Existing (Matches External ID)</option>
                    </select>
                  </div>

                  <div class="form-group checkbox-group">
                    <label>
                      <input type="checkbox" [(ngModel)]="allOrNothing" />
                      All-or-Nothing Transaction (Rollback file if any row has errors)
                    </label>
                  </div>

                  <div class="form-group">
                    <label>Save as Profile (Optional):</label>
                    <input
                      type="text"
                      [(ngModel)]="profileName"
                      placeholder="e.g. My SBI Statement format" />
                  </div>
                </div>
              </div>

              @if (mappingError()) {
                <div class="alert alert-danger">{{ mappingError() }}</div>
              }

              <div class="step-actions">
                <button type="button" class="btn-secondary" (click)="goToStep(2)">← Back</button>
                <button
                  type="button"
                  class="btn-primary"
                  [disabled]="isValidating()"
                  (click)="saveAndValidate()">
                  {{ isValidating() ? 'Validating Preview...' : 'Validate & Preview All Rows →' }}
                </button>
              </div>
            </div>
          }

          <!-- STEP 4: PREVIEW & CHECK -->
          @if (importStep() === 4 && validationResult()) {
            <div class="step-content">
              <h3>Step 4: Validation Summary & Preview</h3>
              <p class="step-desc">Carefully review the parsed rows before writing to the database.</p>

              <!-- Metrics -->
              <div class="metrics-row">
                <div class="metric-box">
                  <span class="m-val">{{ validationResult()!.totalRowsPreviewed }}</span>
                  <span class="m-label">Total Data Rows</span>
                </div>
                <div class="metric-box success">
                  <span class="m-val">{{ validationResult()!.validCount }}</span>
                  <span class="m-label">Valid Rows</span>
                </div>
                <div class="metric-box danger">
                  <span class="m-val">{{ validationResult()!.invalidCount }}</span>
                  <span class="m-label">Invalid Rows</span>
                </div>
                <div class="metric-box warning">
                  <span class="m-val">{{ validationResult()!.duplicateCount }}</span>
                  <span class="m-label">Duplicates Detected</span>
                </div>
              </div>

              <!-- Preview Table -->
              <div class="preview-table-wrapper">
                <table class="data-table preview-table">
                  <thead>
                    <tr>
                      <th>Row #</th>
                      <th>Status</th>
                      @for (col of getMappedColumnsList(); track col) {
                        <th>{{ col }}</th>
                      }
                      <th>Notes / Errors</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (row of validationResult()!.rows; track row.rowNumber) {
                      <tr [class.row-invalid]="!row.isValid" [class.row-duplicate]="row.isDuplicate">
                        <td>{{ row.rowNumber }}</td>
                        <td>
                          @if (row.isValid) {
                            <span class="badge badge-success">
                              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                              Ready
                            </span>
                          } @else {
                            <span class="badge badge-danger">
                              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                              Error
                            </span>
                          }
                          @if (row.isDuplicate) {
                            <span class="badge badge-warning">Duplicate</span>
                          }
                        </td>
                        @for (col of getMappedColumnsList(); track col) {
                          <td>{{ row.mappedData[col] !== undefined ? row.mappedData[col] : '—' }}</td>
                        }
                        <td class="error-col">
                          @for (err of row.errors; track err) {
                            <div class="error-msg">
                              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                              {{ err }}
                            </div>
                          }
                          @for (w of row.warnings; track w) {
                            <div class="warning-msg">
                              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                              {{ w }}
                            </div>
                          }
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>

              @if (commitError()) {
                <div class="alert alert-danger">{{ commitError() }}</div>
              }

              <div class="step-actions">
                <button type="button" class="btn-secondary" (click)="goToStep(3)">← Back to Mapping</button>
                <button
                  type="button"
                  class="btn-primary"
                  [disabled]="isCommitting() || (allOrNothing && validationResult()!.invalidCount > 0)"
                  (click)="commitImport()">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" class="mr-1">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  <span>{{ isCommitting() ? 'Importing Data...' : ('Confirm & Import ' + validationResult()!.validCount + ' Records to Database') }}</span>
                </button>
              </div>
            </div>
          }

          <!-- STEP 5: RESULTS -->
          @if (importStep() === 5 && importResult()) {
            <div class="step-content result-content">
              <div class="result-header">
                @if (importResult()!.failedRows === 0) {
                  <div class="result-icon success">
                    <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                  <h3>Import Completed Successfully!</h3>
                  <p>All valid records have been securely added to your personal finance account.</p>
                } @else if (importResult()!.successRows > 0) {
                  <div class="result-icon warning">
                    <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="#f59e0b" stroke-width="2.2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                  </div>
                  <h3>Import Finished with Warnings</h3>
                  <p>Some rows were imported, but {{ importResult()!.failedRows }} rows had errors.</p>
                } @else {
                  <div class="result-icon danger">
                    <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="#ef4444" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </div>
                  <h3>Import Failed</h3>
                  <p>{{ importResult()!.errorMessage || 'Validation or database constraints prevented import.' }}</p>
                }
              </div>

              <div class="metrics-row">
                <div class="metric-box">
                  <span class="m-val">{{ importResult()!.totalRows }}</span>
                  <span class="m-label">Total Rows</span>
                </div>
                <div class="metric-box success">
                  <span class="m-val">{{ importResult()!.successRows }}</span>
                  <span class="m-label">Imported Successfully</span>
                </div>
                <div class="metric-box danger">
                  <span class="m-val">{{ importResult()!.failedRows }}</span>
                  <span class="m-label">Failed</span>
                </div>
                <div class="metric-box warning">
                  <span class="m-val">{{ importResult()!.skippedRows }}</span>
                  <span class="m-label">Skipped (Duplicates)</span>
                </div>
              </div>

              <div class="step-actions centered">
                @if (importResult()!.failedRows > 0) {
                  <button
                    type="button"
                    class="btn-danger"
                    (click)="downloadErrors(importResult()!.batchId)">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" class="mr-1">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="7 10 12 15 17 10"/>
                      <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    <span>Download Error Report (.xlsx)</span>
                  </button>
                }
                <button type="button" class="btn-primary" (click)="resetWizard()">
                  Import Another File
                </button>
                <a [routerLink]="getModuleRoute(selectedModule())" class="btn-secondary">
                  Go to {{ getModuleName(selectedModule()) }} →
                </a>
              </div>
            </div>
          }
        </div>
      }

      <!-- TAB 2: EXPORT DATA -->
      @if (activeTab() === 'export') {
        <div class="card export-card">
          <h3>Export Financial Records</h3>
          <p class="subtitle">Download Excel (.xlsx) or CSV files matching the standard re-import template format.</p>

          <div class="export-form">
            <div class="form-group">
              <label>Select Module:</label>
              <select [(ngModel)]="exportModule">
                <option value="ALL">Full System Backup (All Modules in One Workbook)</option>
                @for (m of moduleOptions; track m.id) {
                  <option [value]="m.id">{{ m.name }}</option>
                }
              </select>
            </div>

            @if (exportModule !== 'ALL') {
              <div class="form-group">
                <label>Export Format:</label>
                <div class="radio-row">
                  <label><input type="radio" [(ngModel)]="exportFormat" value="xlsx" /> Excel Workbook (.xlsx)</label>
                  <label><input type="radio" [(ngModel)]="exportFormat" value="csv" /> CSV (.csv)</label>
                </div>
              </div>

              <div class="dates-row">
                <div class="form-group">
                  <label>From Date (Optional):</label>
                  <input type="date" [(ngModel)]="exportFrom" />
                </div>
                <div class="form-group">
                  <label>To Date (Optional):</label>
                  <input type="date" [(ngModel)]="exportTo" />
                </div>
              </div>
            }

            <div class="export-actions">
              <button
                type="button"
                class="btn-primary"
                [disabled]="isExporting()"
                (click)="triggerExport()">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" class="mr-1">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                <span>{{ isExporting() ? 'Generating Export...' : 'Download Export' }}</span>
              </button>
            </div>
          </div>
        </div>
      }

      <!-- TAB 3: IMPORT HISTORY -->
      @if (activeTab() === 'history') {
        <div class="card history-card">
          <div class="card-header-row">
            <div>
              <h3>Import Batches History</h3>
              <p class="subtitle">View past data imports. Batches can be completely undone/rolled back within 7 days.</p>
            </div>
            <button type="button" class="btn-secondary btn-sm" (click)="loadHistory()">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" class="mr-1">
                <polyline points="23 4 23 10 17 10"/>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
              </svg>
              <span>Refresh</span>
            </button>
          </div>

          @if (historyList().length === 0) {
            <div class="empty-state">No import batches found.</div>
          } @else {
            <div class="table-responsive">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Module</th>
                    <th>File Name</th>
                    <th>Status</th>
                    <th>Total</th>
                    <th>Success</th>
                    <th>Failed</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  @for (b of historyList(); track b.id) {
                    <tr>
                      <td>{{ b.createdAtUtc | date:'dd MMM yyyy, HH:mm' }}</td>
                      <td><strong>{{ b.module }}</strong></td>
                      <td>{{ b.fileName }}</td>
                      <td>
                        <span class="badge" [class.badge-success]="b.statusName === 'Completed'" [class.badge-danger]="b.statusName === 'Failed'" [class.badge-warning]="b.statusName === 'RolledBack'">
                          {{ b.statusName }}
                        </span>
                      </td>
                      <td>{{ b.totalRows }}</td>
                      <td class="text-success">{{ b.successRows }}</td>
                      <td class="text-danger">{{ b.failedRows }}</td>
                      <td class="actions-cell">
                        @if (b.failedRows > 0) {
                          <button class="btn-sm btn-outline-danger" (click)="downloadErrors(b.id)" title="Download Errors">
                            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" class="mr-1">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                              <polyline points="7 10 12 15 17 10"/>
                              <line x1="12" y1="15" x2="12" y2="3"/>
                            </svg>
                            <span>Errors</span>
                          </button>
                        }
                        @if (b.canRollback) {
                          <button
                            class="btn-sm btn-outline-warning"
                            (click)="rollbackBatch(b)"
                            [disabled]="isRollingBack() === b.id"
                            title="Undo all imports from this batch">
                            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" class="mr-1">
                              <polyline points="1 4 1 10 7 10"/>
                              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
                            </svg>
                            <span>Rollback</span>
                          </button>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>
      }

      <!-- TAB 4: SAVED MAPPING PROFILES -->
      @if (activeTab() === 'profiles') {
        <div class="card profiles-card">
          <div class="card-header-row">
            <div>
              <h3>Saved Mapping Profiles</h3>
              <p class="subtitle">Reusable column mappings saved from previous file imports.</p>
            </div>
            <button type="button" class="btn-secondary btn-sm" (click)="loadProfiles()">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" class="mr-1">
                <polyline points="23 4 23 10 17 10"/>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
              </svg>
              <span>Refresh</span>
            </button>
          </div>

          @if (savedProfiles().length === 0) {
            <div class="empty-state">No saved mapping profiles yet. You can save one in Step 3 of the Import Wizard.</div>
          } @else {
            <div class="profiles-grid">
              @for (p of savedProfiles(); track p.id) {
                <div class="profile-card">
                  <div class="p-header">
                    <h4>{{ p.name }}</h4>
                    <span class="badge badge-info">{{ p.module }}</span>
                  </div>
                  <p class="p-meta">Date format: <code>{{ p.dateFormat || 'dd-MM-yyyy' }}</code></p>
                  <div class="p-chips">
                    @for (item of getProfileMappingsList(p); track item.userHeader) {
                      <span class="chip">{{ item.userHeader }} → <strong>{{ item.sysField }}</strong></span>
                    }
                  </div>
                  <div class="p-footer">
                    <button class="btn-danger btn-sm" (click)="deleteProfile(p.id)">
                      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" class="mr-1">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      </svg>
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .data-transfer-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0.5rem 0 3rem;
    }

    .page-header {
      margin-bottom: 1.5rem;
      h1 { font-size: 1.5rem; font-weight: 700; color: var(--color-text-main); margin: 0 0 0.25rem; }
      .subtitle { color: var(--color-text-muted); font-size: 0.875rem; margin: 0; }
    }

    .transfer-tabs {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1.5rem;
      overflow-x: auto;
      padding-bottom: 0.35rem;

      .tab-btn {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 1.15rem;
        border-radius: var(--radius-md);
        border: 1px solid var(--color-border);
        background: var(--color-bg-card);
        color: var(--color-text-muted);
        font-weight: 600;
        font-size: 0.875rem;
        cursor: pointer;
        transition: all 0.15s ease;
        white-space: nowrap;
        min-height: 40px;

        .tab-svg {
          flex-shrink: 0;
        }

        &:hover {
          color: var(--color-text-main);
          background: var(--color-bg-subtle);
        }

        &.active {
          background: var(--color-primary);
          color: #ffffff;
          border-color: var(--color-primary);
          box-shadow: 0 1px 3px rgb(79 70 229 / 0.3);
        }
      }
    }

    .file-info-row {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
    }

    .card {
      background: var(--color-bg-card);
      border-radius: var(--radius-lg);
      border: 1px solid var(--color-border);
      padding: 1.5rem;
      box-shadow: var(--shadow-sm);
    }

    /* Wizard Stepper */
    .wizard-stepper {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 2rem;
      overflow-x: auto;
      padding-bottom: 0.5rem;
    }

    .step-node {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.35rem;
      min-width: 80px;

      .step-num {
        width: 34px;
        height: 34px;
        border-radius: 50%;
        background: var(--color-bg-subtle);
        border: 1px solid var(--color-border);
        color: var(--color-text-muted);
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 0.875rem;
        transition: all 0.2s ease;
      }
      .step-label { font-size: 0.75rem; font-weight: 600; color: var(--color-text-muted); text-align: center; }
      &.active {
        .step-num { background: var(--color-primary); color: #fff; border-color: var(--color-primary); box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.2); }
        .step-label { color: var(--color-primary); font-weight: 700; }
      }
      &.done {
        .step-num { background: var(--color-income); color: #fff; border-color: var(--color-income); }
        .step-label { color: var(--color-income); }
      }
    }

    .step-line {
      flex: 1;
      height: 2px;
      background: var(--color-border);
      margin: 0 0.5rem;
      margin-bottom: 1.25rem;
      &.done { background: var(--color-income); }
    }

    .step-content {
      h3 { font-size: 1.25rem; font-weight: 700; color: var(--color-text-main); margin: 0 0 0.5rem; }
      .step-desc { color: var(--color-text-muted); font-size: 0.875rem; margin-bottom: 1.5rem; }
    }

    /* Module Grid */
    .module-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .module-card {
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      padding: 1rem;
      display: flex;
      gap: 1rem;
      align-items: center;
      cursor: pointer;
      background: var(--color-bg-card);
      transition: all 0.15s ease;
      min-height: var(--min-touch-target);

      &:hover {
        border-color: var(--color-primary);
        background: var(--color-bg-subtle);
        transform: translateY(-1px);
      }
      &.selected {
        border-color: var(--color-primary);
        background: var(--color-primary-light, #eef2ff);
        box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.2);
      }
      .mod-icon { font-size: 1.75rem; }
      .mod-info h4 { margin: 0 0 0.2rem; font-size: 0.95rem; font-weight: 700; color: var(--color-text-main); }
      .mod-info p { margin: 0; font-size: 0.75rem; color: var(--color-text-muted); }
    }

    [data-theme='dark'] .module-card.selected {
      background: #1e1b4b;
    }

    /* Dropzone */
    .dropzone {
      border: 2px dashed var(--color-primary);
      border-radius: var(--radius-lg);
      padding: 3rem 1.5rem;
      text-align: center;
      cursor: pointer;
      background: var(--color-bg-subtle);
      transition: all 0.15s ease;
      margin-bottom: 1rem;

      &:hover, &.dragover {
        background: var(--color-primary-light, #eef2ff);
      }
      .upload-icon { font-size: 2.5rem; display: block; margin-bottom: 0.5rem; }
      h4 { margin: 0 0 0.25rem; font-size: 1rem; color: var(--color-text-main); }
      p { margin: 0; color: var(--color-text-muted); font-size: 0.8125rem; }
    }

    [data-theme='dark'] .dropzone:hover,
    [data-theme='dark'] .dropzone.dragover {
      background: #1e1b4b;
    }

    .selected-file-badge {
      background: var(--color-investment-bg);
      color: var(--color-investment);
      border: 1px solid var(--color-investment-border);
      padding: 0.65rem 1rem;
      border-radius: var(--radius-md);
      margin-bottom: 1rem;
      display: inline-block;
      font-size: 0.875rem;
      font-weight: 600;
    }

    /* Mapping Table */
    .mapping-table-wrapper {
      max-height: 400px;
      overflow-y: auto;
      margin-bottom: 1.5rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
      th, td { padding: 0.75rem 1rem; border-bottom: 1px solid var(--color-border); text-align: left; }
      th { background: var(--color-bg-subtle); font-weight: 700; color: var(--color-text-muted); font-size: 0.75rem; text-transform: uppercase; }
      tbody tr:hover { background: var(--color-bg-subtle); }
    }

    .samples-cell {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
    }

    .sample-tag {
      background: var(--color-bg-subtle);
      color: var(--color-text-secondary);
      border: 1px solid var(--color-border);
      padding: 0.15rem 0.45rem;
      border-radius: var(--radius-sm);
      font-size: 0.75rem;
      font-family: var(--font-family-mono);
    }

    .mapping-select {
      width: 100%;
      padding: 0.45rem 0.65rem;
      border-radius: var(--radius-md);
      border: 1px solid var(--color-border);
      background: var(--color-bg-card);
      color: var(--color-text-main);
      font-size: 0.875rem;

      &.matched {
        border-color: var(--color-income);
        background: var(--color-income-bg);
        color: var(--color-income);
        font-weight: 600;
      }
    }

    .import-options-card {
      background: var(--color-bg-subtle);
      padding: 1.25rem;
      border-radius: var(--radius-md);
      border: 1px solid var(--color-border);
      margin-bottom: 1.5rem;
      h4 { margin: 0 0 1rem; font-size: 0.95rem; font-weight: 700; color: var(--color-text-main); }
    }

    .options-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      label { font-size: 0.8125rem; font-weight: 600; color: var(--color-text-main); }
      select, input[type="text"], input[type="date"] {
        padding: 0.5rem 0.75rem;
        border-radius: var(--radius-md);
        border: 1px solid var(--color-border);
        background: var(--color-bg-card);
        color: var(--color-text-main);
        font-size: 0.875rem;
        min-height: 40px;
      }
    }

    .checkbox-group {
      justify-content: center;
      label { display: flex; align-items: center; gap: 0.5rem; cursor: pointer; font-size: 0.875rem; font-weight: 500; }
    }

    /* Metrics */
    .metrics-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .metric-box {
      background: var(--color-bg-card);
      padding: 1rem;
      border-radius: var(--radius-md);
      text-align: center;
      border: 1px solid var(--color-border);
      .m-val { display: block; font-size: 1.5rem; font-weight: 700; color: var(--color-text-main); font-variant-numeric: tabular-nums; }
      .m-label { font-size: 0.75rem; color: var(--color-text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
      &.success { background: var(--color-income-bg); border-color: var(--color-income-border); .m-val { color: var(--color-income); } }
      &.danger { background: var(--color-expense-bg); border-color: var(--color-expense-border); .m-val { color: var(--color-expense); } }
      &.warning { background: var(--color-loan-bg); border-color: var(--color-loan-border); .m-val { color: var(--color-loan); } }
    }

    .preview-table-wrapper {
      max-height: 450px;
      overflow-y: auto;
      margin-bottom: 1.5rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
    }

    .row-invalid { background: var(--color-expense-bg) !important; }
    .row-duplicate { background: var(--color-loan-bg) !important; }

    .error-col {
      font-size: 0.8rem;
      .error-msg { color: var(--color-expense); font-weight: 600; }
      .warning-msg { color: var(--color-loan); font-weight: 600; }
    }

    /* Results */
    .result-header {
      text-align: center;
      margin-bottom: 1.5rem;
      .result-icon {
        font-size: 3rem;
        margin-bottom: 0.5rem;
      }
    }

    .step-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      margin-top: 1.5rem;
      &.centered { justify-content: center; }
    }

    .badge {
      display: inline-block;
      padding: 0.2rem 0.55rem;
      border-radius: var(--radius-full);
      font-size: 0.75rem;
      font-weight: 600;
      &.badge-success { background: var(--color-income-bg); color: var(--color-income); border: 1px solid var(--color-income-border); }
      &.badge-danger { background: var(--color-expense-bg); color: var(--color-expense); border: 1px solid var(--color-expense-border); }
      &.badge-warning { background: var(--color-loan-bg); color: var(--color-loan); border: 1px solid var(--color-loan-border); }
      &.badge-info { background: var(--color-investment-bg); color: var(--color-investment); border: 1px solid var(--color-investment-border); }
    }

    .alert {
      padding: 0.75rem 1rem;
      border-radius: var(--radius-md);
      margin-bottom: 1rem;
      font-size: 0.875rem;
      &.alert-danger { background: var(--color-expense-bg); color: var(--color-expense); border: 1px solid var(--color-expense-border); }
    }

    /* Profiles grid */
    .profiles-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1rem;
      margin-top: 1rem;
    }

    .profile-card {
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      padding: 1.25rem;
      background: var(--color-bg-card);
      .p-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; h4 { margin: 0; font-size: 0.95rem; font-weight: 700; color: var(--color-text-main); } }
      .p-meta { font-size: 0.75rem; color: var(--color-text-muted); margin: 0 0 0.5rem; }
      .p-chips { display: flex; flex-wrap: wrap; gap: 0.35rem; margin-bottom: 1rem; }
      .chip { background: var(--color-bg-subtle); border: 1px solid var(--color-border); color: var(--color-text-secondary); font-size: 0.75rem; padding: 0.2rem 0.5rem; border-radius: var(--radius-sm); }
      .p-footer { display: flex; justify-content: flex-end; }
    }

    .card-header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
      h3 { margin: 0; font-size: 1.15rem; font-weight: 700; color: var(--color-text-main); }
      .subtitle { margin: 0.2rem 0 0; color: var(--color-text-muted); font-size: 0.8125rem; }
    }

    .empty-state {
      text-align: center;
      padding: 2.5rem;
      color: var(--color-text-muted);
      font-size: 0.9rem;
    }

    .radio-row {
      display: flex;
      gap: 1.5rem;
      align-items: center;
      min-height: 40px;
      label { display: flex; align-items: center; gap: 0.5rem; cursor: pointer; font-size: 0.875rem; }
    }

    .dates-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    @media (max-width: 640px) {
      .wizard-stepper { flex-direction: column; align-items: flex-start; gap: 0.5rem; }
      .step-line { display: none; }
      .step-node { flex-direction: row; gap: 0.75rem; }
      .step-actions { flex-direction: column; button { width: 100%; } }
      .dates-row { grid-template-columns: 1fr; }
    }
  `]
})
export class DataTransferComponent implements OnInit {
  private readonly dataTransferService = inject(DataTransferService);
  public readonly themeService = inject(ThemeService);

  readonly activeTab = signal<'import' | 'export' | 'history' | 'profiles'>('import');
  readonly importStep = signal<number>(1);

  readonly moduleOptions: ModuleOption[] = [
    { id: 'Transactions', name: 'Transactions (Income/Expense)', description: 'Income, salary, expenses, categories', icon: 'transactions' },
    { id: 'LoanAccounts', name: 'Loan Accounts', description: 'Given and taken personal loans', icon: 'loans' },
    { id: 'LoanTransactions', name: 'Loan Transactions', description: 'Disbursements, repayments, interest', icon: 'loan-txns' },
    { id: 'Epfo', name: 'EPFO Records', description: 'Monthly PF, pension, interest slips', icon: 'epfo' },
    { id: 'Holdings', name: 'Holdings & Assets', description: 'Mutual funds, stocks, FDs, gold, PPF', icon: 'holdings' },
    { id: 'InvestmentTransactions', name: 'Investment Trades', description: 'Buy, sell, dividend trade history', icon: 'invest-txns' },
    { id: 'Categories', name: 'Categories', description: 'Custom expense and income categories', icon: 'categories' }
  ];

  readonly selectedModule = signal<string>('Transactions');
  readonly selectedFile = signal<File | null>(null);
  readonly isDragging = signal<boolean>(false);
  readonly isUploading = signal<boolean>(false);
  readonly uploadError = signal<string | null>(null);
  readonly uploadResult = signal<UploadResult | null>(null);

  columnMapping: { [header: string]: string } = {};
  selectedDateFormat = 'dd-MM-yyyy';
  importMode = 1; // 1 = AddNewOnly
  allOrNothing = false;
  profileName = '';
  mappingError = signal<string | null>(null);
  readonly isValidating = signal<boolean>(false);
  readonly validationResult = signal<PreviewValidationResult | null>(null);

  readonly isCommitting = signal<boolean>(false);
  readonly commitError = signal<string | null>(null);
  readonly importResult = signal<ImportResult | null>(null);

  readonly isDownloadingTemplate = signal<boolean>(false);

  // History and Profiles
  readonly historyList = signal<ImportBatchDetail[]>([]);
  readonly savedProfiles = signal<MappingProfile[]>([]);
  readonly isRollingBack = signal<string | null>(null);

  // Export
  exportModule = 'Transactions';
  exportFormat = 'xlsx';
  exportFrom = '';
  exportTo = '';
  readonly isExporting = signal<boolean>(false);

  ngOnInit(): void {
    this.loadProfiles();
  }

  getModuleName(id: string): string {
    return this.moduleOptions.find(m => m.id === id)?.name || id;
  }

  getModuleRoute(id: string): string {
    switch (id) {
      case 'Transactions': return '/transactions';
      case 'LoanAccounts':
      case 'LoanTransactions': return '/loans';
      case 'Epfo': return '/epfo';
      case 'Holdings':
      case 'InvestmentTransactions': return '/investments';
      case 'Categories': return '/settings';
      default: return '/dashboard';
    }
  }

  goToStep(step: number): void {
    this.importStep.set(step);
  }

  downloadTemplate(module: string): void {
    this.isDownloadingTemplate.set(true);
    this.dataTransferService.downloadTemplate(module).subscribe({
      next: (blob) => {
        this.saveBlob(blob, `template_${module.toLowerCase()}.xlsx`);
        this.isDownloadingTemplate.set(false);
      },
      error: () => this.isDownloadingTemplate.set(false)
    });
  }

  onDragOver(e: DragEvent): void {
    e.preventDefault();
    this.isDragging.set(true);
  }

  onFileDrop(e: DragEvent): void {
    e.preventDefault();
    this.isDragging.set(false);
    if (e.dataTransfer && e.dataTransfer.files.length > 0) {
      this.selectedFile.set(e.dataTransfer.files[0]);
    }
  }

  onFileSelected(e: Event): void {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile.set(input.files[0]);
    }
  }

  uploadAndInspect(): void {
    const file = this.selectedFile();
    if (!file) return;

    this.isUploading.set(true);
    this.uploadError.set(null);

    this.dataTransferService.uploadFile(file, this.selectedModule()).subscribe({
      next: (res) => {
        this.uploadResult.set(res);
        this.columnMapping = { ...res.suggestedColumnMap };
        // Ensure any unmapped headers default to Ignore
        for (const h of res.headers) {
          if (!this.columnMapping[h]) {
            this.columnMapping[h] = 'Ignore';
          }
        }
        this.isUploading.set(false);
        this.importStep.set(3);
      },
      error: (err) => {
        this.uploadError.set(err.error?.message || 'Failed to upload and inspect file.');
        this.isUploading.set(false);
      }
    });
  }

  getSampleValues(header: string): string[] {
    const res = this.uploadResult();
    if (!res) return [];
    return res.sampleRows.map(r => r[header]).slice(0, 3);
  }

  getAvailableFields(module: string): { name: string; displayName: string; isRequired: boolean }[] {
    switch (module) {
      case 'Transactions':
        return [
          { name: 'Type', displayName: 'Type (Income/Expense)', isRequired: true },
          { name: 'Amount', displayName: 'Amount', isRequired: true },
          { name: 'Category', displayName: 'Category', isRequired: true },
          { name: 'Date', displayName: 'Date (dd-MM-yyyy)', isRequired: true },
          { name: 'Note', displayName: 'Note / Narration', isRequired: false },
          { name: 'ExternalId', displayName: 'External Reference ID', isRequired: false }
        ];
      case 'LoanAccounts':
        return [
          { name: 'Name', displayName: 'Loan Name', isRequired: true },
          { name: 'Counterparty', displayName: 'Counterparty (Person)', isRequired: true },
          { name: 'Direction', displayName: 'Direction (Given/Taken)', isRequired: true },
          { name: 'Principal', displayName: 'Principal Amount', isRequired: true },
          { name: 'InterestRate', displayName: 'Interest Rate %', isRequired: false },
          { name: 'InterestType', displayName: 'Interest Type (None/Simple/Compound)', isRequired: false },
          { name: 'StartDate', displayName: 'Start Date', isRequired: true },
          { name: 'DueDate', displayName: 'Due Date', isRequired: false },
          { name: 'Note', displayName: 'Notes', isRequired: false },
          { name: 'ExternalId', displayName: 'External ID', isRequired: false }
        ];
      case 'LoanTransactions':
        return [
          { name: 'LoanAccount', displayName: 'Loan Account Name', isRequired: true },
          { name: 'Kind', displayName: 'Kind (Disburse/Repayment/Interest/Penalty)', isRequired: true },
          { name: 'Amount', displayName: 'Amount', isRequired: true },
          { name: 'Date', displayName: 'Transaction Date', isRequired: true },
          { name: 'Note', displayName: 'Notes', isRequired: false },
          { name: 'ExternalId', displayName: 'External ID', isRequired: false }
        ];
      case 'Epfo':
        return [
          { name: 'Month', displayName: 'Month (yyyy-MM)', isRequired: true },
          { name: 'EmployeeShare', displayName: 'Employee Share (12%)', isRequired: true },
          { name: 'EmployerShare', displayName: 'Employer Share (3.67%)', isRequired: true },
          { name: 'PensionShare', displayName: 'Pension Share (8.33%)', isRequired: true },
          { name: 'Interest', displayName: 'Interest Credited', isRequired: false },
          { name: 'Withdrawal', displayName: 'Withdrawal Amount', isRequired: false },
          { name: 'Note', displayName: 'Notes', isRequired: false },
          { name: 'ExternalId', displayName: 'External ID', isRequired: false }
        ];
      case 'Holdings':
        return [
          { name: 'Name', displayName: 'Holding Name', isRequired: true },
          { name: 'Type', displayName: 'Asset Type (MutualFund/Stock/FD...)', isRequired: true },
          { name: 'InitialInvestedAmount', displayName: 'Invested Cost Amount', isRequired: true },
          { name: 'InitialUnits', displayName: 'Units / Shares', isRequired: false },
          { name: 'CurrentValue', displayName: 'Current Market Value', isRequired: false },
          { name: 'StartDate', displayName: 'Start Date', isRequired: false },
          { name: 'Note', displayName: 'Notes', isRequired: false },
          { name: 'ExternalId', displayName: 'External ID', isRequired: false }
        ];
      case 'InvestmentTransactions':
        return [
          { name: 'HoldingName', displayName: 'Holding Name', isRequired: true },
          { name: 'Kind', displayName: 'Kind (Buy/Sell/Dividend...)', isRequired: true },
          { name: 'Amount', displayName: 'Trade Amount', isRequired: true },
          { name: 'Units', displayName: 'Units Transacted', isRequired: false },
          { name: 'Date', displayName: 'Trade Date', isRequired: true },
          { name: 'UpdatedCurrentValue', displayName: 'New Current Value', isRequired: false },
          { name: 'Note', displayName: 'Notes', isRequired: false },
          { name: 'ExternalId', displayName: 'External ID', isRequired: false }
        ];
      case 'Categories':
        return [
          { name: 'Name', displayName: 'Category Name', isRequired: true },
          { name: 'Type', displayName: 'Type (Income/Expense)', isRequired: true },
          { name: 'Color', displayName: 'Color (Hex)', isRequired: false },
          { name: 'Icon', displayName: 'Icon ID', isRequired: false },
          { name: 'ExternalId', displayName: 'External ID', isRequired: false }
        ];
      default:
        return [];
    }
  }

  applyProfile(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const profileId = select.value;
    if (!profileId) return;

    const profile = this.savedProfiles().find(p => p.id === profileId);
    if (profile) {
      this.columnMapping = { ...profile.columnMap };
      if (profile.dateFormat) {
        this.selectedDateFormat = profile.dateFormat;
      }
    }
  }

  saveAndValidate(): void {
    const res = this.uploadResult();
    if (!res) return;

    this.isValidating.set(true);
    this.mappingError.set(null);

    const payload = {
      columnMap: this.columnMapping,
      dateFormat: this.selectedDateFormat,
      mode: this.importMode,
      allOrNothing: this.allOrNothing,
      saveAsProfileName: this.profileName.trim() || undefined
    };

    this.dataTransferService.saveMapping(res.batchId, payload).subscribe({
      next: () => {
        this.dataTransferService.validateBatch(res.batchId).subscribe({
          next: (valResult) => {
            this.validationResult.set(valResult);
            this.isValidating.set(false);
            this.importStep.set(4);
            if (this.profileName.trim()) {
              this.loadProfiles();
            }
          },
          error: (err) => {
            this.mappingError.set(err.error?.message || 'Failed to validate batch preview.');
            this.isValidating.set(false);
          }
        });
      },
      error: (err) => {
        this.mappingError.set(err.error?.message || 'Failed to save column mapping.');
        this.isValidating.set(false);
      }
    });
  }

  getMappedColumnsList(): string[] {
    const list: string[] = [];
    for (const sysField of Object.values(this.columnMapping)) {
      if (sysField && sysField !== 'Ignore' && !list.includes(sysField)) {
        list.push(sysField);
      }
    }
    return list;
  }

  commitImport(): void {
    const res = this.uploadResult();
    if (!res) return;

    this.isCommitting.set(true);
    this.commitError.set(null);

    this.dataTransferService.commitBatch(res.batchId).subscribe({
      next: (result) => {
        this.themeService.playSuccessSound();
        this.importResult.set(result);
        this.isCommitting.set(false);
        this.importStep.set(5);
      },
      error: (err) => {
        this.commitError.set(err.error?.message || 'Failed to commit import batch.');
        this.isCommitting.set(false);
      }
    });
  }

  downloadErrors(batchId: string): void {
    this.dataTransferService.downloadErrorsExcel(batchId).subscribe({
      next: (blob) => this.saveBlob(blob, `import_errors_${batchId.substring(0, 8)}.xlsx`)
    });
  }

  resetWizard(): void {
    this.selectedFile.set(null);
    this.uploadResult.set(null);
    this.validationResult.set(null);
    this.importResult.set(null);
    this.columnMapping = {};
    this.profileName = '';
    this.importStep.set(1);
  }

  // History & Rollback
  loadHistory(): void {
    this.dataTransferService.getHistory().subscribe({
      next: (list) => this.historyList.set(list)
    });
  }

  rollbackBatch(batch: ImportBatchDetail): void {
    if (!confirm(`Are you sure you want to rollback batch "${batch.fileName}"? This will delete all ${batch.successRows} imported records.`)) {
      return;
    }

    this.isRollingBack.set(batch.id);
    this.dataTransferService.rollbackBatch(batch.id).subscribe({
      next: () => {
        this.themeService.playDeleteSound();
        this.isRollingBack.set(null);
        this.loadHistory();
      },
      error: (err) => {
        alert(err.error?.message || 'Failed to rollback batch.');
        this.isRollingBack.set(null);
      }
    });
  }

  // Profiles
  loadProfiles(): void {
    this.dataTransferService.getMappingProfiles().subscribe({
      next: (profs) => this.savedProfiles.set(profs)
    });
  }

  getProfileMappingsList(p: MappingProfile): { userHeader: string; sysField: string }[] {
    return Object.entries(p.columnMap).map(([userHeader, sysField]) => ({ userHeader, sysField }));
  }

  deleteProfile(id: string): void {
    if (!confirm('Are you sure you want to delete this saved mapping profile?')) return;
    this.dataTransferService.deleteMappingProfile(id).subscribe({
      next: () => {
        this.themeService.playDeleteSound();
        this.loadProfiles();
      }
    });
  }

  // Export
  triggerExport(): void {
    this.isExporting.set(true);

    if (this.exportModule === 'ALL') {
      this.dataTransferService.exportAll().subscribe({
        next: (blob) => {
          this.themeService.playSuccessSound();
          this.saveBlob(blob, `hisaab_full_backup_${new Date().toISOString().slice(0, 10)}.xlsx`);
          this.isExporting.set(false);
        },
        error: () => this.isExporting.set(false)
      });
    } else {
      this.dataTransferService.exportModule(
        this.exportModule,
        this.exportFormat,
        this.exportFrom || undefined,
        this.exportTo || undefined
      ).subscribe({
        next: (blob) => {
          this.themeService.playSuccessSound();
          const ext = this.exportFormat === 'csv' ? 'csv' : 'xlsx';
          this.saveBlob(blob, `hisaab_${this.exportModule.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.${ext}`);
          this.isExporting.set(false);
        },
        error: () => this.isExporting.set(false)
      });
    }
  }

  private saveBlob(blob: Blob, fileName: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }
}

