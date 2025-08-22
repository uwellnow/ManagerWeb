import { apiClient } from './client';

export interface LoginRequest {
    username: string;
    password: string;
}

export interface LoginResponse {
    access_token: string;
    token_type: string;
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
    setToken(token: string, tokenType: string) {
        localStorage.setItem('access_token', token);
        localStorage.setItem('token_type', tokenType);
    },

    getToken(): string | null {
        return localStorage.getItem('access_token');
    },

    getTokenType(): string | null {
        return localStorage.getItem('token_type');
    },

    clearToken() {
        localStorage.removeItem('access_token');
        localStorage.removeItem('token_type');
    },

    isAuthenticated(): boolean {
        return !!this.getToken();
    }
};
