import { useState, useEffect } from 'react';

// 한국 시간대 기준으로 오늘 날짜를 YYYY-MM-DD 형식으로 반환
const getKoreanToday = (): string => {
    const now = new Date();
    const koreanTime = new Date(now.getTime() + (9 * 60 * 60 * 1000)); // UTC+9
    return koreanTime.toISOString().split('T')[0];
};

interface DatePickerProps {
    isOpen: boolean;
    onClose: () => void;
    onDateSelect: (date: string) => void;
    currentDate: string;
}

const DatePicker = ({ isOpen, onClose, onDateSelect, currentDate }: DatePickerProps) => {
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [currentMonth, setCurrentMonth] = useState(new Date());

    useEffect(() => {
        if (isOpen) {
            setSelectedDate(currentDate);
            // YYYY-MM-DD 형식의 문자열을 한국 시간대로 파싱
            const [year, month, day] = currentDate.split('-').map(Number);
            setCurrentMonth(new Date(year, month - 1, day));
        }
    }, [isOpen, currentDate]);

    const todayStr = getKoreanToday();

    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        const days = [];
        
        // 이전 달의 빈 칸들
        for (let i = 0; i < startingDayOfWeek; i++) {
            days.push(null);
        }
        
        // 현재 달의 날짜들
        for (let day = 1; day <= daysInMonth; day++) {
            days.push(new Date(year, month, day));
        }
        
        return days;
    };

    const formatDate = (date: Date) => {
        // 한국 시간대 기준으로 날짜 포맷팅
        const koreanTime = new Date(date.getTime() + (9 * 60 * 60 * 1000)); // UTC+9
        return koreanTime.toISOString().split('T')[0];
    };

    const isDateSelected = (date: Date) => {
        const dateStr = formatDate(date);
        return dateStr === selectedDate;
    };

    const isDateDisabled = (date: Date) => {
        const dateStr = formatDate(date);
        // 한국 시간대 기준으로 오늘 날짜와 비교
        return dateStr > todayStr;
    };

    const handleDateClick = (date: Date) => {
        const dateStr = formatDate(date);
        
        if (isDateDisabled(date)) return;

        setSelectedDate(dateStr);
    };

    const handleApply = () => {
        if (selectedDate) {
            onDateSelect(selectedDate);
            onClose();
        }
    };

    const handleToday = () => {
        setSelectedDate(todayStr);
    };

    const navigateMonth = (direction: 'prev' | 'next') => {
        setCurrentMonth(prev => {
            const newMonth = new Date(prev);
            if (direction === 'prev') {
                newMonth.setMonth(prev.getMonth() - 1);
            } else {
                newMonth.setMonth(prev.getMonth() + 1);
            }
            return newMonth;
        });
    };

    const getMonthName = (date: Date) => {
        return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' });
    };

    if (!isOpen) return null;

    const days = getDaysInMonth(currentMonth);
    const weekDays = ['일', '월', '화', '수', '목', '금', '토'];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg sm:rounded-xl p-4 sm:p-6 w-full max-w-sm sm:max-w-md">
                <div className="flex justify-between items-center mb-4 sm:mb-6">
                    <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">날짜 선택</h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* 선택된 날짜 표시 */}
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-600 mb-1">선택된 날짜</div>
                    <div className="text-base font-medium text-gray-900">
                        {selectedDate ? (
                            (() => {
                                const [year, month, day] = selectedDate.split('-').map(Number);
                                const date = new Date(year, month - 1, day);
                                return date.toLocaleDateString('ko-KR', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                    weekday: 'long'
                                });
                            })()
                        ) : (
                            '날짜를 선택해주세요'
                        )}
                    </div>
                </div>

                {/* 달력 네비게이션 */}
                <div className="flex justify-between items-center mb-4">
                    <button
                        onClick={() => navigateMonth('prev')}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <h4 className="text-lg font-semibold text-gray-900">{getMonthName(currentMonth)}</h4>
                    <button
                        onClick={() => navigateMonth('next')}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>

                {/* 요일 헤더 */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                    {weekDays.map(day => (
                        <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                            {day}
                        </div>
                    ))}
                </div>

                {/* 달력 그리드 */}
                <div className="grid grid-cols-7 gap-1 mb-4">
                    {days.map((day, index) => {
                        if (!day) {
                            return <div key={index} className="h-10"></div>;
                        }

                        const dateStr = formatDate(day);
                        const isSelected = isDateSelected(day);
                        const isDisabled = isDateDisabled(day);
                        const isToday = dateStr === todayStr;

                        return (
                            <button
                                key={index}
                                onClick={() => handleDateClick(day)}
                                disabled={isDisabled}
                                className={`
                                    h-10 text-sm rounded-lg transition-colors
                                    ${isSelected 
                                        ? 'bg-mainRed text-white font-semibold' 
                                        : isToday
                                            ? 'bg-gray-200 text-gray-900 font-semibold'
                                            : 'text-gray-700 hover:bg-gray-100'
                                    }
                                    ${isDisabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
                                `}
                            >
                                {day.getDate()}
                            </button>
                        );
                    })}
                </div>

                {/* 버튼들 */}
                <div className="flex gap-2">
                    <button
                        onClick={handleToday}
                        className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                        오늘
                    </button>
                    <button
                        onClick={handleApply}
                        disabled={!selectedDate}
                        className="flex-1 px-4 py-2 text-sm font-medium text-white bg-mainRed rounded-lg hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        적용
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DatePicker;
