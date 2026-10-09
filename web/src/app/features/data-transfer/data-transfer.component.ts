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
          📥 Import Wizard
        </button>
        <button
          [class.active]="activeTab() === 'export'"
          (click)="activeTab.set('export')"
          class="tab-btn">
          📤 Export Data
        </button>
        <button
          [class.active]="activeTab() === 'history'"
          (click)="loadHistory(); activeTab.set('history')"
          class="tab-btn">
          📜 Import History
        </button>
        <button
          [class.active]="activeTab() === 'profiles'"
          (click)="loadProfiles(); activeTab.set('profiles')"
          class="tab-btn">
          ⚙️ Saved Mapping Profiles
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
                    <div class="mod-icon">{{ mod.icon }}</div>
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
                  📥 Download Blank Template (.xlsx)
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
              <p class="step-desc">Upload .xlsx, .xls, or .csv file (Max 10 MB, up to 50,000 rows).</p>

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
                  accept=".xlsx,.xls,.csv"
                  (change)="onFileSelected($event)"
                  style="display: none;" />

                <div class="dropzone-content">
                  <span class="upload-icon">📁</span>
                  <h4>Click or Drag & Drop File Here</h4>
                  <p>.xlsx, .xls, or .csv up to 10 MB</p>
                </div>
              </div>

              @if (selectedFile()) {
                <div class="selected-file-badge">
                  <span>📄 <strong>{{ selectedFile()?.name }}</strong> ({{ (selectedFile()!.size / 1024).toFixed(1) }} KB)</span>
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
                            <option value="Ignore">🚫 (Ignore this column)</option>
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
                  {{ isValidating() ? 'Validating Preview...' : 'Validate & Preview (50 rows) →' }}
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
                  <span class="m-label">Preview Rows</span>
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
                            <span class="badge badge-success">✓ Ready</span>
                          } @else {
                            <span class="badge badge-danger">✗ Error</span>
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
                            <div class="error-msg">⚠️ {{ err }}</div>
                          }
                          @for (w of row.warnings; track w) {
                            <div class="warning-msg">ℹ️ {{ w }}</div>
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
                  {{ isCommitting() ? 'Importing Data...' : 'Confirm & Import to Database 🚀' }}
                </button>
              </div>
            </div>
          }

          <!-- STEP 5: RESULTS -->
          @if (importStep() === 5 && importResult()) {
            <div class="step-content result-content">
              <div class="result-header">
                @if (importResult()!.failedRows === 0) {
                  <div class="result-icon success">🎉</div>
                  <h3>Import Completed Successfully!</h3>
                  <p>All valid records have been securely added to your personal finance account.</p>
                } @else if (importResult()!.successRows > 0) {
                  <div class="result-icon warning">⚠️</div>
                  <h3>Import Finished with Warnings</h3>
                  <p>Some rows were imported, but {{ importResult()!.failedRows }} rows had errors.</p>
                } @else {
                  <div class="result-icon danger">❌</div>
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
                    📥 Download Error Report (.xlsx)
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
                <option value="ALL">⭐ Full System Backup (All Modules in One Workbook)</option>
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
                {{ isExporting() ? 'Generating Export...' : '⬇️ Download Export' }}
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
            <button type="button" class="btn-secondary btn-sm" (click)="loadHistory()">🔄 Refresh</button>
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
                            📥 Errors
                          </button>
                        }
                        @if (b.canRollback) {
                          <button
                            class="btn-sm btn-outline-warning"
                            (click)="rollbackBatch(b)"
                            [disabled]="isRollingBack() === b.id"
                            title="Undo all imports from this batch">
                            ↩️ Rollback
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
            <button type="button" class="btn-secondary btn-sm" (click)="loadProfiles()">🔄 Refresh</button>
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
                    <button class="btn-danger btn-sm" (click)="deleteProfile(p.id)">🗑️ Delete</button>
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
      padding: 1.5rem 1rem 4rem;
    }

    .page-header {
      margin-bottom: 1.5rem;
      h1 { font-size: 1.75rem; font-weight: 700; color: var(--text-primary); margin: 0 0 0.25rem; }
      .subtitle { color: var(--text-muted); font-size: 0.95rem; margin: 0; }
    }

    .transfer-tabs {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1.5rem;
      overflow-x: auto;
      padding-bottom: 0.25rem;
      .tab-btn {
        padding: 0.65rem 1.25rem;
        border-radius: 9999px;
        border: 1px solid var(--border-color, #e2e8f0);
        background: var(--bg-surface, #fff);
        color: var(--text-secondary);
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        white-space: nowrap;
        min-height: 44px;
        &.active {
          background: var(--primary, #4f46e5);
          color: #fff;
          border-color: var(--primary, #4f46e5);
        }
      }
    }

    .card {
      background: var(--bg-surface, #fff);
      border-radius: 12px;
      border: 1px solid var(--border-color, #e2e8f0);
      padding: 1.5rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
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
        background: var(--border-color, #e2e8f0);
        color: var(--text-muted);
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 0.9rem;
      }
      .step-label { font-size: 0.8rem; font-weight: 600; color: var(--text-muted); text-align: center; }
      &.active {
        .step-num { background: var(--primary, #4f46e5); color: #fff; }
        .step-label { color: var(--primary, #4f46e5); font-weight: 700; }
      }
      &.done {
        .step-num { background: #10b981; color: #fff; }
        .step-label { color: #10b981; }
      }
    }

    .step-line {
      flex: 1;
      height: 3px;
      background: var(--border-color, #e2e8f0);
      margin: 0 0.5rem;
      margin-bottom: 1.25rem;
      &.done { background: #10b981; }
    }

    .step-content {
      h3 { font-size: 1.25rem; font-weight: 700; margin: 0 0 0.5rem; }
      .step-desc { color: var(--text-muted); font-size: 0.9rem; margin-bottom: 1.5rem; }
    }

    /* Module Grid */
    .module-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .module-card {
      border: 2px solid var(--border-color, #e2e8f0);
      border-radius: 10px;
      padding: 1rem;
      display: flex;
      gap: 1rem;
      align-items: center;
      cursor: pointer;
      transition: all 0.2s;
      min-height: 44px;
      &:hover { border-color: var(--primary, #4f46e5); transform: translateY(-2px); }
      &.selected {
        border-color: var(--primary, #4f46e5);
        background: rgba(79, 70, 229, 0.04);
      }
      .mod-icon { font-size: 1.8rem; }
      .mod-info h4 { margin: 0 0 0.2rem; font-size: 1rem; }
      .mod-info p { margin: 0; font-size: 0.8rem; color: var(--text-muted); }
    }

    /* Dropzone */
    .dropzone {
      border: 2px dashed var(--primary, #4f46e5);
      border-radius: 12px;
      padding: 3rem 1.5rem;
      text-align: center;
      cursor: pointer;
      background: rgba(79, 70, 229, 0.02);
      transition: background 0.2s;
      margin-bottom: 1rem;
      &:hover, &.dragover { background: rgba(79, 70, 229, 0.08); }
      .upload-icon { font-size: 2.5rem; display: block; margin-bottom: 0.5rem; }
      h4 { margin: 0 0 0.25rem; }
      p { margin: 0; color: var(--text-muted); font-size: 0.85rem; }
    }

    .selected-file-badge {
      background: #eff6ff;
      color: #1e40af;
      padding: 0.75rem 1rem;
      border-radius: 8px;
      margin-bottom: 1rem;
      display: inline-block;
    }

    /* Mapping Table */
    .mapping-table-wrapper {
      max-height: 400px;
      overflow-y: auto;
      margin-bottom: 1.5rem;
      border: 1px solid var(--border-color, #e2e8f0);
      border-radius: 8px;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.9rem;
      th, td { padding: 0.75rem 1rem; border-bottom: 1px solid var(--border-color, #e2e8f0); text-align: left; }
      th { background: var(--bg-surface-alt, #f8fafc); font-weight: 600; }
    }

    .samples-cell {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
    }

    .sample-tag {
      background: #f1f5f9;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      font-size: 0.8rem;
    }

    .mapping-select {
      width: 100%;
      padding: 0.5rem;
      border-radius: 6px;
      border: 1px solid var(--border-color, #e2e8f0);
      background: #fff;
      &.matched { border-color: #10b981; background: #f0fdf4; }
    }

    .import-options-card {
      background: var(--bg-surface-alt, #f8fafc);
      padding: 1.25rem;
      border-radius: 8px;
      margin-bottom: 1.5rem;
      h4 { margin: 0 0 1rem; font-size: 1rem; }
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
      label { font-size: 0.85rem; font-weight: 600; color: var(--text-secondary); }
      select, input[type="text"], input[type="date"] {
        padding: 0.5rem 0.75rem;
        border-radius: 6px;
        border: 1px solid var(--border-color, #e2e8f0);
        min-height: 40px;
      }
    }

    .checkbox-group {
      justify-content: center;
      label { display: flex; align-items: center; gap: 0.5rem; cursor: pointer; }
    }

    /* Metrics */
    .metrics-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .metric-box {
      background: var(--bg-surface-alt, #f8fafc);
      padding: 1rem;
      border-radius: 8px;
      text-align: center;
      border: 1px solid var(--border-color, #e2e8f0);
      .m-val { display: block; font-size: 1.6rem; font-weight: 700; color: var(--text-primary); }
      .m-label { font-size: 0.8rem; color: var(--text-muted); font-weight: 600; }
      &.success { background: #f0fdf4; border-color: #bbf7d0; .m-val { color: #16a34a; } }
      &.danger { background: #fef2f2; border-color: #fecaca; .m-val { color: #dc2626; } }
      &.warning { background: #fffbeb; border-color: #fde68a; .m-val { color: #d97706; } }
    }

    .preview-table-wrapper {
      max-height: 450px;
      overflow-y: auto;
      margin-bottom: 1.5rem;
      border: 1px solid var(--border-color, #e2e8f0);
      border-radius: 8px;
    }

    .row-invalid { background: #fef2f2 !important; }
    .row-duplicate { background: #fffbeb !important; }

    .error-col {
      font-size: 0.8rem;
      .error-msg { color: #dc2626; }
      .warning-msg { color: #d97706; }
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

    button {
      min-height: 44px;
      padding: 0.65rem 1.25rem;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: all 0.2s;
    }

    .btn-primary { background: var(--primary, #4f46e5); color: #fff; &:hover { opacity: 0.9; } }
    .btn-secondary { background: #f1f5f9; color: var(--text-secondary); border: 1px solid #cbd5e1; }
    .btn-danger { background: #dc2626; color: #fff; }
    .btn-sm { min-height: 32px; padding: 0.35rem 0.75rem; font-size: 0.8rem; border-radius: 6px; }
    .btn-outline-danger { background: transparent; border: 1px solid #dc2626; color: #dc2626; }
    .btn-outline-warning { background: transparent; border: 1px solid #d97706; color: #d97706; }

    .badge {
      display: inline-block;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
      &.badge-success { background: #dcfce7; color: #15803d; }
      &.badge-danger { background: #fee2e2; color: #b91c1c; }
      &.badge-warning { background: #fef3c7; color: #b45309; }
      &.badge-info { background: #e0e7ff; color: #4338ca; }
    }

    .alert {
      padding: 0.75rem 1rem;
      border-radius: 6px;
      margin-bottom: 1rem;
      font-size: 0.9rem;
      &.alert-danger { background: #fee2e2; color: #b91c1c; }
    }

    /* Profiles grid */
    .profiles-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1rem;
      margin-top: 1rem;
    }

    .profile-card {
      border: 1px solid var(--border-color, #e2e8f0);
      border-radius: 8px;
      padding: 1rem;
      background: var(--bg-surface-alt, #f8fafc);
      .p-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; h4 { margin: 0; font-size: 1rem; } }
      .p-meta { font-size: 0.8rem; color: var(--text-muted); margin: 0 0 0.5rem; }
      .p-chips { display: flex; flex-wrap: wrap; gap: 0.35rem; margin-bottom: 1rem; }
      .chip { background: #fff; border: 1px solid #e2e8f0; font-size: 0.75rem; padding: 0.2rem 0.4rem; border-radius: 4px; }
      .p-footer { display: flex; justify-content: flex-end; }
    }

    .card-header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
      h3 { margin: 0; font-size: 1.25rem; }
      .subtitle { margin: 0.25rem 0 0; color: var(--text-muted); font-size: 0.85rem; }
    }

    .empty-state {
      text-align: center;
      padding: 2.5rem;
      color: var(--text-muted);
      font-size: 0.95rem;
    }

    .radio-row {
      display: flex;
      gap: 1.5rem;
      align-items: center;
      min-height: 40px;
      label { display: flex; align-items: center; gap: 0.5rem; cursor: pointer; }
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

  readonly activeTab = signal<'import' | 'export' | 'history' | 'profiles'>('import');
  readonly importStep = signal<number>(1);

  readonly moduleOptions: ModuleOption[] = [
    { id: 'Transactions', name: 'Transactions (Income/Expense)', description: 'Income, salary, expenses, categories', icon: '💳' },
    { id: 'LoanAccounts', name: 'Loan Accounts', description: 'Given and taken personal loans', icon: '🤝' },
    { id: 'LoanTransactions', name: 'Loan Transactions', description: 'Disbursements, repayments, interest', icon: '📝' },
    { id: 'Epfo', name: 'EPFO Records', description: 'Monthly PF, pension, interest slips', icon: '🏛️' },
    { id: 'Holdings', name: 'Holdings & Assets', description: 'Mutual funds, stocks, FDs, gold, PPF', icon: '📈' },
    { id: 'InvestmentTransactions', name: 'Investment Trades', description: 'Buy, sell, dividend trade history', icon: '📊' },
    { id: 'Categories', name: 'Categories', description: 'Custom expense and income categories', icon: '🏷️' }
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
      next: () => this.loadProfiles()
    });
  }

  // Export
  triggerExport(): void {
    this.isExporting.set(true);

    if (this.exportModule === 'ALL') {
      this.dataTransferService.exportAll().subscribe({
        next: (blob) => {
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
