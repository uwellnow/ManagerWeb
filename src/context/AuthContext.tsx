import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { tokenStorage } from '../api/auth';

interface AuthContextType {
    isAuthenticated: boolean;
    storeName: string | null; // null이면 전체 관리자
    login: (token: string, tokenType: string, storeName: string | null) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [storeName, setStoreName] = useState<string | null>(null);

    useEffect(() => {
        // 앱 시작 시 토큰 확인
        const token = tokenStorage.getToken();
        const storedStoreName = tokenStorage.getStoreName();
        setIsAuthenticated(!!token);
        setStoreName(storedStoreName);
    }, []);

    const login = (token: string, tokenType: string, storeName: string | null) => {
        tokenStorage.setToken(token, tokenType, storeName);
        setIsAuthenticated(true);
        setStoreName(storeName);
    };

    const logout = () => {
        tokenStorage.clearToken();
        setIsAuthenticated(false);
        setStoreName(null);
    };

    const value: AuthContextType = {
        isAuthenticated,
        storeName,
        login,
        logout
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
