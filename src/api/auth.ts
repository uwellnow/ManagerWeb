import { apiClient } from './client';

export interface LoginRequest {
    username: string;
    password: string;
}

export interface LoginResponse {
    access_token: string;
    token_type: string;
    store_name: string | null; // null이면 전체 관리자
}

export interface ApiError {
    message: string;
    status?: number;
}

export const authApi = {
    async login(credentials: LoginRequest): Promise<LoginResponse> {
        return apiClient.post<LoginResponse>('/auth/sign-in', credentials, { requiresAuth: false });
    }
};

export const tokenStorage = {
    setToken(token: string, tokenType: string, storeName: string | null = null) {
        localStorage.setItem('access_token', token);
        localStorage.setItem('token_type', tokenType);
        if (storeName !== null) {
            localStorage.setItem('store_name', storeName);
        } else {
            localStorage.removeItem('store_name');
        }
    },

    getToken(): string | null {
        return localStorage.getItem('access_token');
    },

    getTokenType(): string | null {
        return localStorage.getItem('token_type');
    },

    getStoreName(): string | null {
        return localStorage.getItem('store_name');
    },

    clearToken() {
        localStorage.removeItem('access_token');
        localStorage.removeItem('token_type');
        localStorage.removeItem('store_name');
    },

    isAuthenticated(): boolean {
        return !!this.getToken();
    }
};
