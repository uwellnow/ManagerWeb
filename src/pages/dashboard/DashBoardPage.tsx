import SalesCardGrid from "./SalesCardGrid.tsx";
import {mockSalesResponse} from "../../mock/data/sales.ts";
import StocksSummaryGrid from "./StocksSummaryGrid.tsx";
import {mockStocksSummaryResponse} from "../../mock/data/stocks.ts";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const DashBoardPage = () => {
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/');
        }
    }, [isAuthenticated, navigate]);

    if (!isAuthenticated) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="w-8 h-8 border-4 border-mainRed border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="flex flex-1 gap-6 p-4 items-stretch">
            <SalesCardGrid sales={mockSalesResponse} isLoading={false} isError={false} />
            <StocksSummaryGrid stocks={mockStocksSummaryResponse} isLoading={false} isError={false} />
        </div>
    );
};

export default DashBoardPage;