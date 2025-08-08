import type {SalesDetailKind, SalesResponseDto} from "../../types/DTO/SalesResponseDto.ts";
import SalesDetailCard from "./SalesDetailCard.tsx";

interface SalesCardProps {
    sale: SalesResponseDto;
}

const SalesCard = ({ sale }: SalesCardProps) => {
    const kinds: SalesDetailKind[] = ["total", "day", "week", "month", "error"];

    return (
        <div className="flex flex-row gap-4">
            {kinds.map((kind) => (
                <SalesDetailCard key={kind} type={kind} data={sale} />
            ))}
        </div>
    );
};
export default SalesCard;