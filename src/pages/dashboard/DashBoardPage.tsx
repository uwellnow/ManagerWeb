import SalesCardGrid from "./SalesCardGrid.tsx";
import {mockSalesResponse} from "../../mock/data/sales.ts";
import StocksSummaryGrid from "./StocksSummaryGrid.tsx";
import {mockStocksSummaryResponse} from "../../mock/data/stocks.ts";


const DashBoardPage = () => {


    return (
        <div className="flex flex-1 gap-6 p-4 items-stretch">
            <SalesCardGrid sales={mockSalesResponse} isLoading={false} isError={false} />
            <StocksSummaryGrid stocks={mockStocksSummaryResponse} isLoading={false} isError={false} />
        </div>
    );
};

export default DashBoardPage;