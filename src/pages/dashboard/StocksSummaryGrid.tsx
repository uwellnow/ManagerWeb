import type { StocksSummaryResponse } from "../../types/DTO/stocksSummaryResponseDto.ts";
import type { SalesResponse } from "../../types/DTO/SalesResponseDto.ts"; // Added
import StocksSummary from "./StocksSummary.tsx";

interface Props {
    stocks?: StocksSummaryResponse;
    sales?: SalesResponse; // Added
    isLoading: boolean;
    isError: boolean;
}

const StocksSummaryGrid = ({stocks, sales, isLoading, isError}: Props) => { // Added sales
    if (isLoading) {
        return (
            <section className="flex flex-1 flex-col justify-between gap-4 lg:gap-8 w-full">
                <div className="flex items-center justify-center p-4 lg:p-8">
                    <div className="w-6 h-6 lg:w-8 lg:h-8 border-4 border-mainRed border-t-transparent rounded-full animate-spin"></div>
                    <span className="ml-2 lg:ml-3 text-gray-600 text-sm lg:text-base">재고 데이터를 불러오는 중...</span>
                </div>
            </section>
        );
    }

    if (isError) {
        return (
            <section className="flex flex-1 flex-col justify-between gap-4 lg:gap-8 w-full">
                <div className="flex items-center justify-center p-4 lg:p-8 bg-red-50 rounded-xl lg:rounded-2xl">
                    <div className="text-center">
                        <div className="text-red-500 text-base lg:text-lg font-semibold mb-2">데이터 로드 실패</div>
                        <div className="text-gray-600 text-sm lg:text-base">재고 데이터를 불러오지 못했습니다. 다시 시도해주세요.</div>
                    </div>
                </div>
            </section>
        );
    }

    if (!stocks || Object.keys(stocks).length === 0) {
        return (
            <section className="flex flex-1 flex-col justify-between gap-4 lg:gap-8 w-full">
                <div className="flex items-center justify-center p-4 lg:p-8 bg-gray-50 rounded-xl lg:rounded-2xl">
                    <div className="text-center">
                        <div className="text-gray-500 text-base lg:text-lg font-semibold mb-2">재고 데이터 없음</div>
                        <div className="text-gray-600 text-sm lg:text-base">표시할 재고 데이터가 없습니다.</div>
                    </div>
                </div>
            </section>
        );
    }

    // 판매 데이터의 storeName 순서대로 재고 데이터 정렬
    const sortedStocks = sales ?
        Object.entries(stocks).sort((a, b) => {
            const salesStoreNames = sales.map(sale => sale.storeName);
            const aIndex = salesStoreNames.indexOf(a[0]);
            const bIndex = salesStoreNames.indexOf(b[0]);

            // 판매 데이터에 없는 storeName은 맨 뒤로
            if (aIndex === -1 && bIndex === -1) return 0;
            if (aIndex === -1) return 1;
            if (bIndex === -1) return -1;

            return aIndex - bIndex;
        }) :
        Object.entries(stocks);

    return(
        <section className="flex flex-1 flex-col justify-between gap-4 lg:gap-8 w-full">
            {sortedStocks.map(([storeName, products]) => ( // Used sortedStocks
                <StocksSummary
                    key={storeName}
                    storeName={storeName}
                    products={products} />
            ))}
        </section>
    )
}

export default StocksSummaryGrid;