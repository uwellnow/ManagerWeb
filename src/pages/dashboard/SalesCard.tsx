import type { SalesDetailKind, SalesData } from "../../types/DTO/SalesResponseDto.ts";
import SalesDetailCard from "./SalesDetailCard.tsx";

interface SalesCardProps {
    sale: SalesData;
}

const SalesCard = ({ sale }: SalesCardProps) => {
    const kinds: SalesDetailKind[] = ["total", "day", "week", "month", "error"];

    return (
        <div className="flex flex-col gap-3 sm:gap-4 lg:gap-6 p-4 sm:p-6 lg:p-8 bg-white rounded-xl sm:rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-200 w-full">
            {/* 헤더 */}
            <div className="flex flex-col items-start mb-3 sm:mb-4 lg:mb-6">
                <h2 className="text-md sm:text-lg lg:text-xl mb-1 text-gray-900 font-bold">{sale.storeName} 판매 데이터</h2>
                <span className="text-xs sm:text-sm text-gray-600">
                    판매 요약({new Date(sale.updatedAt).toLocaleString("ko-KR")} updated)
                </span>
            </div>

            <div className="grid grid-cols-5 gap-2 sm:gap-3 lg:gap-4">
                {kinds.map((kind) => (
                    <SalesDetailCard key={kind} type={kind} data={sale} />
                ))}
            </div>
        </div>
    );
};
export default SalesCard;