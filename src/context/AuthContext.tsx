import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { tokenStorage } from '../api/auth';

interface AuthContextType {
    isAuthenticated: boolean;
    login: (token: string, tokenType: string) => void;
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

    useEffect(() => {
        // 앱 시작 시 토큰 확인
        const token = tokenStorage.getToken();
        setIsAuthenticated(!!token);
    }, []);

    const login = (token: string, tokenType: string) => {
        tokenStorage.setToken(token, tokenType);
        setIsAuthenticated(true);
    };

    const logout = () => {
        tokenStorage.clearToken();
        setIsAuthenticated(false);
    };

    const value: AuthContextType = {
        isAuthenticated,
        login,
        logout
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
