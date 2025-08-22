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
        <div className={`rounded-xl lg:rounded-2xl w-full aspect-square p-3 lg:p-4 flex flex-col justify-between`} style={{ backgroundColor: cfg.bg }}>
            <div className="flex items-center gap-1 lg:gap-2 mb-2 lg:mb-3">
                <div
                    className="w-5 h-5 lg:w-7 lg:h-7 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: cfg.iconBg }}
                >
                    <img src={cfg.icon} alt={cfg.label} className="w-3 h-3 lg:w-4 lg:h-4" />
                </div>
            </div>

            <div className={`text-lg lg:text-2xl font-extrabold leading-tight`}>
                {value.toLocaleString()} <span className="text-sm lg:text-lg font-bold">{cfg.unit}</span>
            </div>

            <div className="mt-1 text-gray-700 text-xs lg:text-sm">{cfg.label}</div>

        </div>
    )
}

export default SalesDetailCard;