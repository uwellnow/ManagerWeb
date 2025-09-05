import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

interface DateRange {
    startDate: string;
    endDate: string;
}

interface DateContextType {
    selectedDate: string;
    setSelectedDate: (date: string) => void;
    dateRange: DateRange;
    setDateRange: (range: DateRange | ((prev: DateRange) => DateRange)) => void;
    isDateRangeMode: boolean;
    setIsDateRangeMode: (isRange: boolean) => void;
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

    const [dateRange, setDateRange] = useState<DateRange>(() => {
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        return {
            startDate: todayStr,
            endDate: todayStr
        };
    });

    const [isDateRangeMode, setIsDateRangeMode] = useState(false);

    return (
        <DateContext.Provider value={{ 
            selectedDate, 
            setSelectedDate, 
            dateRange, 
            setDateRange, 
            isDateRangeMode, 
            setIsDateRangeMode 
        }}>
            {children}
        </DateContext.Provider>
    );
};
