import type { SalesDetailKind, SalesData } from "../../types/DTO/SalesResponseDto.ts";
import SalesDetailCard from "./SalesDetailCard.tsx";

interface SalesCardProps {
    sale: SalesData;
}

const SalesCard = ({ sale }: SalesCardProps) => {
    const kinds: SalesDetailKind[] = ["total", "day", "week", "month", "error"];

    return (
        <div className="flex flex-col gap-2 lg:gap-3 p-4 lg:p-6 bg-white rounded-xl lg:rounded-2xl w-full">
            <div className="flex-col items-center mb-3 lg:mb-4">
                <h2 className="text-base lg:text-lg mb-1 text-grayBlue font-semibold">{sale.storeName} 판매 데이터</h2>
                <span className="text-xs font-light text-gray-700">
                    판매 요약({new Date(sale.updatedAt).toLocaleString("ko-KR")} updated)
                </span>
            </div>

            <div className="grid grid-cols-2 lg:flex lg:flex-row gap-2 lg:gap-3">
                {kinds.map((kind) => (
                    <SalesDetailCard key={kind} type={kind} data={sale} />
                ))}
            </div>
        </div>
    );
};
export default SalesCard;