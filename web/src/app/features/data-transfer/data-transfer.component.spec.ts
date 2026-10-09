import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { DataTransferComponent } from './data-transfer.component';

describe('DataTransferComponent', () => {
  let component: DataTransferComponent;
  let fixture: ComponentFixture<DataTransferComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DataTransferComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([])
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DataTransferComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should start on step 1 with default module Transactions', () => {
    expect(component.importStep()).toBe(1);
    expect(component.selectedModule()).toBe('Transactions');
  });

  it('should advance to step 2 when module is confirmed', () => {
    component.selectedModule.set('LoanAccounts');
    component.goToStep(2);
    expect(component.importStep()).toBe(2);
    expect(component.getModuleName('LoanAccounts')).toBe('Loan Accounts');
  });

  it('should reset wizard back to step 1', () => {
    component.goToStep(3);
    component.resetWizard();
    expect(component.importStep()).toBe(1);
    expect(component.selectedFile()).toBeNull();
  });

  it('should switch tabs between import, export, history, and profiles', () => {
    component.activeTab.set('export');
    expect(component.activeTab()).toBe('export');

    component.activeTab.set('history');
    expect(component.activeTab()).toBe('history');

    component.activeTab.set('profiles');
    expect(component.activeTab()).toBe('profiles');
  });
});

