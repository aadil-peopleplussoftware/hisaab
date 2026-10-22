import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { AuthResponse } from '../models/user.model';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);

    // Flush any initialization calls triggered by dependent services
    httpMock.match(() => true).forEach(req => req.flush([]));
  });

  afterEach(() => {
    httpMock.match(() => true).forEach(req => req.flush([]));
    httpMock.verify();
  });

  it('should be created with initial unauthenticated state', () => {
    expect(service.isAuthenticated()).toBe(false);
    expect(service.currentUser()).toBeNull();
    expect(service.getAccessToken()).toBeNull();
  });

  it('should set session and in-memory access token on setSession', () => {
    const mockAuth: AuthResponse = {
      accessToken: 'test-jwt-token',
      expiresIn: 900,
      user: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'user@hisaab.com',
        fullName: 'Test User',
        role: 'User',
        timezone: 'Asia/Kolkata',
        locale: 'en-IN'
      }
    };

    service.setSession(mockAuth);

    expect(service.isAuthenticated()).toBe(true);
    expect(service.currentUser()?.email).toBe('user@hisaab.com');
    expect(service.getAccessToken()).toBe('test-jwt-token');
  });

  it('should clear session and access token on clearSession', () => {
    service.setSession({
      accessToken: 'token',
      expiresIn: 900,
      user: {
        id: '1',
        email: 'test@hisaab.com',
        fullName: 'Test',
        role: 'User',
        timezone: 'Asia/Kolkata',
        locale: 'en-IN'
      }
    });

    service.clearSession();

    expect(service.isAuthenticated()).toBe(false);
    expect(service.currentUser()).toBeNull();
    expect(service.getAccessToken()).toBeNull();
  });
});
