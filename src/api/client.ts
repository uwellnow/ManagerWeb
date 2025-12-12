import { tokenStorage } from './auth';

// 로컬 개발 서버 프록시를 사용하여 CORS 문제 해결
const API_BASE_URL = '/api';

interface RequestOptions extends RequestInit {
    requiresAuth?: boolean;
}

class ApiClient {
    private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
        const { requiresAuth = true, ...fetchOptions } = options;
        
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...(options.headers as Record<string, string> || {}),
        };

        // 인증이 필요한 요청에 토큰 추가
        if (requiresAuth) {
            const token = tokenStorage.getToken();
            const tokenType = tokenStorage.getTokenType();
            
            if (token && tokenType) {
                headers['Authorization'] = `${tokenType} ${token}`;
            }
        }

        const url = `${API_BASE_URL}${endpoint}`;
        console.log('API Request:', {
            url,
            method: fetchOptions.method || 'GET',
            headers,
            body: fetchOptions.body
        });

        const response = await fetch(url, {
            ...fetchOptions,
            headers,
        });

        console.log('API Response:', {
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries())
        });

        if (!response.ok) {
            // 401 에러 시 토큰 제거
            if (response.status === 401) {
                tokenStorage.clearToken();
                window.location.href = '/';
                throw new Error('인증이 만료되었습니다. 다시 로그인해주세요.');
            }

            let errorMessage = '요청에 실패했습니다.';
            try {
                const errorData = await response.json();
                errorMessage = errorData.message || errorData.error || errorMessage;
                console.log('API Error Data:', errorData);
            } catch (e) {
                console.log('Failed to parse error response');
            }

            // 에러 객체에 status 정보 포함
            const error = new Error(errorMessage);
            (error as any).status = response.status;
            throw error;
        }

        const data = await response.json();
        console.log('API Success Data:', data);
        return data;
    }

    async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
        return this.request<T>(endpoint, { ...options, method: 'GET' });
    }

    async post<T>(endpoint: string, data?: any, options?: RequestOptions): Promise<T> {
        return this.request<T>(endpoint, {
            ...options,
            method: 'POST',
            body: data ? JSON.stringify(data) : undefined,
        });
    }

    async put<T>(endpoint: string, data?: any, options?: RequestOptions): Promise<T> {
        return this.request<T>(endpoint, {
            ...options,
            method: 'PUT',
            body: data ? JSON.stringify(data) : undefined,
        });
    }

    async delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
        return this.request<T>(endpoint, { ...options, method: 'DELETE' });
    }
}

export const apiClient = new ApiClient();
