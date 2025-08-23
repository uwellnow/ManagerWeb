import SalesCardGrid from "./SalesCardGrid.tsx";
import StocksSummaryGrid from "./StocksSummaryGrid.tsx";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useDate } from "../../context/DateContext";
import { salesApi } from "../../api/sales";
import { stocksApi } from "../../api/stocks";
import type { SalesResponse } from "../../types/DTO/SalesResponseDto.ts";
import type { StocksSummaryResponse } from "../../types/DTO/stocksSummaryResponseDto.ts";

const DashBoardPage = () => {
    const { isAuthenticated } = useAuth();
    const { selectedDate } = useDate();
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
                
                // 선택된 날짜로 필터링
                const filteredSalesData = data.filter(sale => {
                    const saleDate = new Date(sale.updatedAt).toISOString().split('T')[0];
                    return saleDate === selectedDate;
                });
                
                setSalesData(filteredSalesData);
            } catch (error) {
                console.error('Failed to fetch sales data:', error);
                setSalesError(true);
            } finally {
                setSalesLoading(false);
            }
        };

        fetchSalesData();
    }, [isAuthenticated, selectedDate]);

    useEffect(() => {
        const fetchStocksData = async () => {
            if (!isAuthenticated) return;
            
            try {
                setStocksLoading(true);
                setStocksError(false);
                const data = await stocksApi.getStocksSummary();
                setStocksData(data);
            } catch (error) {
                console.error('Failed to fetch stocks data:', error);
                setStocksError(true);
            } finally {
                setStocksLoading(false);
            }
        };

        fetchStocksData();
    }, [isAuthenticated, selectedDate]);

    if (!isAuthenticated) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="w-8 h-8 border-4 border-mainRed border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="flex flex-col lg:flex-row flex-1 gap-4 lg:gap-6 p-2 lg:p-4 items-stretch">
            <div className="w-full lg:w-2/3">
                <SalesCardGrid sales={salesData} isLoading={salesLoading} isError={salesError} />
            </div>
            <div className="w-full lg:w-1/3">
                <StocksSummaryGrid stocks={stocksData} isLoading={stocksLoading} isError={stocksError} />
            </div>
        </div>
    );
};

export default DashBoardPage;