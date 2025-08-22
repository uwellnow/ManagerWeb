import type { StocksSummaryResponse } from "../../types/DTO/stocksSummaryResponseDto.ts";
import StocksSummary from "./StocksSummary.tsx";

interface Props {
    stocks?: StocksSummaryResponse;
    isLoading: boolean;
    isError: boolean;
}

const StocksSummaryGrid = ({stocks, isLoading, isError}: Props) => {
    if (isLoading) {
        return (
            <section className="flex flex-1 flex-col justify-between gap-8 w-full">
                <div className="flex items-center justify-center p-8">
                    <div className="w-8 h-8 border-4 border-mainRed border-t-transparent rounded-full animate-spin"></div>
                    <span className="ml-3 text-gray-600">재고 데이터를 불러오는 중...</span>
                </div>
            </section>
        );
    }

    if (isError) {
        return (
            <section className="flex flex-1 flex-col justify-between gap-8 w-full">
                <div className="flex items-center justify-center p-8 bg-red-50 rounded-2xl">
                    <div className="text-center">
                        <div className="text-red-500 text-lg font-semibold mb-2">데이터 로드 실패</div>
                        <div className="text-gray-600">재고 데이터를 불러오지 못했습니다. 다시 시도해주세요.</div>
                    </div>
                </div>
            </section>
        );
    }

    if (!stocks || Object.keys(stocks).length === 0) {
        return (
            <section className="flex flex-1 flex-col justify-between gap-8 w-full">
                <div className="flex items-center justify-center p-8 bg-gray-50 rounded-2xl">
                    <div className="text-center">
                        <div className="text-gray-500 text-lg font-semibold mb-2">재고 데이터 없음</div>
                        <div className="text-gray-600">표시할 재고 데이터가 없습니다.</div>
                    </div>
                </div>
            </section>
        );
    }

    return(
        <section className="flex flex-1 flex-col justify-between gap-8 w-full">
            {Object.entries(stocks).map(([storeName, products]) => (
                <StocksSummary
                    key={storeName}
                    storeName={storeName}
                    products={products} />
            ))}
        </section>
    )
}

export default StocksSummaryGrid;