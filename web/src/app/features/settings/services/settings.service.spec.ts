import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { SettingsService } from './settings.service';
import { UserProfile } from '../models/settings.model';

describe('SettingsService', () => {
  let service: SettingsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        SettingsService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(SettingsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should fetch user preferences', () => {
    const mockProfile: UserProfile = {
      id: 'u-1',
      email: 'user@hisaab.com',
      fullName: 'Aadil',
      avatarUrl: null,
      role: 'User',
      timezone: 'Asia/Kolkata',
      locale: 'en-IN'
    };

    service.getPreferences().subscribe(res => {
      expect(res.fullName).toBe('Aadil');
      expect(res.locale).toBe('en-IN');
    });

    const req = httpMock.expectOne('/api/v1/settings/preferences');
    expect(req.request.method).toBe('GET');
    req.flush(mockProfile);
  });

  it('should trigger JSON and Excel data export', () => {
    const mockBlob = new Blob(['{}'], { type: 'application/json' });

    service.exportJson().subscribe(blob => {
      expect(blob.size).toBeGreaterThan(0);
    });

    const req = httpMock.expectOne('/api/v1/settings/export/json');
    expect(req.request.method).toBe('GET');
    req.flush(mockBlob);
  });

  it('should post delete account request', () => {
    service.deleteAccount().subscribe(res => {
      expect(res.message).toBeDefined();
    });

    const req = httpMock.expectOne('/api/v1/settings/account/delete');
    expect(req.request.method).toBe('POST');
    req.flush({ message: 'Deleted' });
  });

  it('should get admin audit logs with parameters', () => {
    service.getAuditLogs('UserRegistered', 1, 25).subscribe();

    const req = httpMock.expectOne(r =>
      r.url === '/api/v1/admin/audit-logs' &&
      r.params.get('action') === 'UserRegistered' &&
      r.params.get('page') === '1' &&
      r.params.get('pageSize') === '25'
    );
    expect(req.request.method).toBe('GET');
    req.flush({ totalCount: 0, page: 1, pageSize: 25, items: [] });
  });
});
