import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

// 한국 시간대 기준으로 오늘 날짜를 YYYY-MM-DD 형식으로 반환
const getKoreanToday = (): string => {
    const now = new Date();
    const koreanTime = new Date(now.getTime() + (9 * 60 * 60 * 1000)); // UTC+9
    return koreanTime.toISOString().split('T')[0];
};

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
        return getKoreanToday(); // 한국 시간대 기준 오늘 날짜
    });

    const [dateRange, setDateRange] = useState<DateRange>(() => {
        const todayStr = getKoreanToday();
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
