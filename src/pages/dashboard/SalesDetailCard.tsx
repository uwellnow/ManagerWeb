import type { SalesDetailKind, SalesData } from "../../types/DTO/SalesResponseDto.ts";
import { SalesDetailCardTypes } from "./SalesDetailCardTypes.tsx";

type SalesDetailCardProps = {
    type: SalesDetailKind;
    data: SalesData;
}

const SalesDetailCard = ( { type, data }: SalesDetailCardProps) => {
    const cfg = SalesDetailCardTypes[type];
    const value = cfg.getValue(data);


    return (
        <div className={`rounded-2xl w-32 h-32 p-4`} style={{ backgroundColor: cfg.bg }}>
            <div className="flex items-center gap-2 mb-3">
                <div
                    className="w-7 h-7 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: cfg.iconBg }}
                >
                    <img src={cfg.icon} alt={cfg.label} className="w-4 h-4" />
                </div>
            </div>

            <div className={`text-2xl font-extrabold leading-tight`}>
                {value.toLocaleString()} <span className="text-lg font-bold">{cfg.unit}</span>
            </div>

            <div className="mt-1 text-gray-700 text-sm">{cfg.label}</div>

        </div>
    )
}

export default SalesDetailCard;