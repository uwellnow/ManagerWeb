import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

interface DateContextType {
    selectedDate: string;
    setSelectedDate: (date: string) => void;
}

const DateContext = createContext<DateContextType | undefined>(undefined);

export const useDate = () => {
    const context = useContext(DateContext);
    if (context === undefined) {
        throw new Error('useDate must be used within a DateProvider');
    }
    return context;
};

interface DateProviderProps {
    children: ReactNode;
}

export const DateProvider = ({ children }: DateProviderProps) => {
    const [selectedDate, setSelectedDate] = useState(() => {
        const today = new Date();
        return today.toISOString().split('T')[0]; // YYYY-MM-DD 형식
    });

    return (
        <DateContext.Provider value={{ selectedDate, setSelectedDate }}>
            {children}
        </DateContext.Provider>
    );
};
