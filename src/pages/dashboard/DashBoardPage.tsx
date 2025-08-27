import SalesCardGrid from "./SalesCardGrid.tsx";
import StocksSummaryGrid from "./StocksSummaryGrid.tsx";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { salesApi } from "../../api/sales";
import { stocksApi } from "../../api/stocks";
import type { SalesResponse } from "../../types/DTO/SalesResponseDto.ts";
import type { StocksSummaryResponse } from "../../types/DTO/stocksSummaryResponseDto.ts";

const DashBoardPage = () => {
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [salesData, setSalesData] = useState<SalesResponse>([]);
    const [stocksData, setStocksData] = useState<StocksSummaryResponse>({});
    const [salesLoading, setSalesLoading] = useState(true);
    const [stocksLoading, setStocksLoading] = useState(true);
    const [salesError, setSalesError] = useState(false);
    const [stocksError, setStocksError] = useState(false);

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/');
        }
    }, [isAuthenticated, navigate]);

    useEffect(() => {
        const fetchSalesData = async () => {
            if (!isAuthenticated) return;
            
            try {
                setSalesLoading(true);
                setSalesError(false);
                const data = await salesApi.getSales();
                
                // '테스트용' 제외
                const filteredSalesData = data.filter(sale => sale.storeName !== '테스트용');
                
                setSalesData(filteredSalesData);
            } catch (error) {
                console.error('Failed to fetch sales data:', error);
                setSalesError(true);
            } finally {
                setSalesLoading(false);
            }
        };

        fetchSalesData();
    }, [isAuthenticated]);

    useEffect(() => {
        const fetchStocksData = async () => {
            if (!isAuthenticated) return;
            
            try {
                setStocksLoading(true);
                setStocksError(false);
                const data = await stocksApi.getStocksSummary();

                console.log('Original stocks data:', data); // 원본 데이터 확인
                console.log('Store names:', Object.keys(data)); // storeName 목록 확인

                // '테스트용' 제외
                const filteredData = Object.fromEntries(
                    Object.entries(data).filter(([storeName]) => {
                        console.log('Checking storeName:', storeName, 'isTest:', storeName === '테스트용');
                        return storeName !== '테스트용';
                    })
                );
                console.log('Filtered stocks data:', filteredData); // 필터링된 데이터 확인
                setStocksData(filteredData);
            } catch (error) {
                console.error('Failed to fetch stocks data:', error);
                setStocksError(true);
            } finally {
                setStocksLoading(false);
            }
        };

        fetchStocksData();
    }, [isAuthenticated]); // selectedDate 의존성 제거

    if (!isAuthenticated) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="w-8 h-8 border-4 border-mainRed border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="flex flex-col lg:flex-row flex-1 gap-4 sm:gap-6 lg:gap-8 p-3 sm:p-4 lg:p-6 items-stretch">
            {/* 판매 데이터 섹션 */}
            <div className="w-full lg:w-2/3">
                <SalesCardGrid sales={salesData} isLoading={salesLoading} isError={salesError} />
            </div>
            
            {/* 재고 요약 섹션 */}
            <div className="w-full lg:w-1/3">
                <StocksSummaryGrid 
                    stocks={stocksData} 
                    sales={salesData}
                    isLoading={stocksLoading} 
                    isError={stocksError} 
                />
            </div>
        </div>
    );
};

export default DashBoardPage;