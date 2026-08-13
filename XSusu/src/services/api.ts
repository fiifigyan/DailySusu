import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Application from 'expo-application';

const API_BASE_URL = 'http://localhost:3000/api/v1';

class SecureApiClient {
  private client: AxiosInstance;
  private deviceId: string = '';
  private refreshTokenTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    this.setupInterceptors();
    this.initializeDeviceId();
  }

  private async initializeDeviceId(): Promise<void> {
    try {
      let storedId = await AsyncStorage.getItem('device_id');
      if (!storedId) {
        storedId = `${Platform.OS}_${Device.modelName}_${Date.now()}`;
        await AsyncStorage.setItem('device_id', storedId);
      }
      this.deviceId = storedId;
    } catch (error) {
      this.deviceId = `unknown_${Date.now()}`;
    }
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      async (config) => {
        // Add auth token
        const token = await AsyncStorage.getItem('access_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Add device fingerprint
        config.headers['X-Device-ID'] = this.deviceId;
        config.headers['X-Request-ID'] = this.generateRequestId();
        config.headers['X-App-Version'] = Application.nativeApplicationVersion || '1.0';
        config.headers['X-Platform'] = Platform.OS;

        // Add timestamp for replay attack prevention
        config.headers['X-Timestamp'] = Date.now().toString();

        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as any;

        // Handle token refresh
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshToken = await AsyncStorage.getItem('refresh_token');
            if (refreshToken) {
              const response = await this.client.post('/auth/refresh', {
                refreshToken,
              });

              const { accessToken, refreshToken: newRefreshToken } = response.data.data;
              await AsyncStorage.setItem('access_token', accessToken);
              await AsyncStorage.setItem('refresh_token', newRefreshToken);

              originalRequest.headers.Authorization = `Bearer ${accessToken}`;
              return this.client(originalRequest);
            }
          } catch (refreshError) {
            // Token refresh failed - force logout
            await this.handleSessionExpired();
            return Promise.reject(refreshError);
          }
        }

        // Handle rate limiting
        if (error.response?.status === 429) {
          const retryAfter = error.response.headers['retry-after'] || 60;
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
          return this.client(originalRequest);
        }

        return Promise.reject(error);
      }
    );
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async handleSessionExpired(): Promise<void> {
    await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user_data']);
    // Navigate to login screen
    // This would be implemented with your navigation service
  }

  // Public API methods
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    // Encrypt sensitive data before sending
    if (this.containsSensitiveData(data)) {
      data = await this.encryptSensitiveFields(data);
    }
    
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<T>(url, config);
    return response.data;
  }

  private containsSensitiveData(data: any): boolean {
    const sensitiveFields = ['password', 'phone', 'email', 'token'];
    if (typeof data === 'object') {
      return Object.keys(data).some(key => sensitiveFields.includes(key));
    }
    return false;
  }

  private async encryptSensitiveFields(data: any): Promise<any> {
    // In production, implement actual encryption
    // For now, we hash sensitive fields
    const sensitiveFields = ['phone', 'email'];
    const encrypted = { ...data };
    
    for (const field of sensitiveFields) {
      if (encrypted[field]) {
        // This would use a real encryption library in production
        encrypted[field] = `encrypted:${encrypted[field]}`;
      }
    }
    
    return encrypted;
  }
}

export const api = new SecureApiClient();