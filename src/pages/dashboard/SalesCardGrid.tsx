import type { SalesResponse } from "../../types/DTO/SalesResponseDto.ts";
import SalesCard from "./SalesCard.tsx";

interface Props {
    sales?: SalesResponse;
    isLoading: boolean;
    isError: boolean;
}

const SalesCardGrid = ({ sales, isLoading, isError}: Props ) => {
    if (isLoading) {
        return (
            <section className="grid gap-8">
                <div className="flex items-center justify-center p-8">
                    <div className="w-8 h-8 border-4 border-mainRed border-t-transparent rounded-full animate-spin"></div>
                    <span className="ml-3 text-gray-600">판매 데이터를 불러오는 중...</span>
                </div>
            </section>
        );
    }

    if (isError) {
        return (
            <section className="grid gap-8">
                <div className="flex items-center justify-center p-8 bg-red-50 rounded-2xl">
                    <div className="text-center">
                        <div className="text-red-500 text-lg font-semibold mb-2">데이터 로드 실패</div>
                        <div className="text-gray-600">판매 데이터를 불러오지 못했습니다. 다시 시도해주세요.</div>
                    </div>
                </div>
            </section>
        );
    }

    if (!sales || sales.length === 0) {
        return (
            <section className="grid gap-8">
                <div className="flex items-center justify-center p-8 bg-gray-50 rounded-2xl">
                    <div className="text-center">
                        <div className="text-gray-500 text-lg font-semibold mb-2">판매 데이터 없음</div>
                        <div className="text-gray-600">표시할 판매 데이터가 없습니다.</div>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section className="grid gap-8">
            {sales.map((sale) => (
                <SalesCard
                    key={sale.storeName}
                    sale={sale}/>
            ))}
        </section>
    );
};

export default SalesCardGrid;