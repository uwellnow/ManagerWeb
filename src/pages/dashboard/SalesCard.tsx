import type {SalesDetailKind, SalesResponseDto} from "../../types/DTO/SalesResponseDto.ts";
import SalesDetailCard from "./SalesDetailCard.tsx";

interface SalesCardProps {
    sale: SalesResponseDto;
}

const SalesCard = ({ sale }: SalesCardProps) => {
    const kinds: SalesDetailKind[] = ["total", "day", "week", "month", "error"];

    return (
        <div className="flex flex-col gap-4 p-8 bg-white rounded-2xl w-fit">
            <div className="flex-col items-center mb-6 ">
                <h2 className="text-lg mb-1 text-grayBlue font-semibold">{sale.storeName} 판매 데이터</h2>
                <span className="text-sm font-light text-gray-700">
                    판매 요약({new Date(sale.updatedAt).toLocaleString("ko-KR")} updated)
                </span>
            </div>

            <div className="flex flex-row gap-4">
                {kinds.map((kind) => (
                    <SalesDetailCard key={kind} type={kind} data={sale} />
                ))}
            </div>
        </div>
    );
};
export default SalesCard;