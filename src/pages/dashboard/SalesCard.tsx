import type { SalesDetailKind, SalesData } from "../../types/DTO/SalesResponseDto.ts";
import SalesDetailCard from "./SalesDetailCard.tsx";

interface SalesCardProps {
    sale: SalesData;
}

const SalesCard = ({ sale }: SalesCardProps) => {
    const kinds: SalesDetailKind[] = ["total", "day", "week", "month", "error"];

    return (
        <div className="flex flex-col gap-3 p-6 bg-white rounded-2xl w-fit">
            <div className="flex-col items-center mb-4">
                <h2 className="text-lg mb-1 text-grayBlue font-semibold">{sale.storeName} 판매 데이터</h2>
                <span className="text-xs font-light text-gray-700">
                    판매 요약({new Date(sale.updatedAt).toLocaleString("ko-KR")} updated)
                </span>
            </div>

            <div className="flex flex-row gap-3">
                {kinds.map((kind) => (
                    <SalesDetailCard key={kind} type={kind} data={sale} />
                ))}
            </div>
        </div>
    );
};
export default SalesCard;