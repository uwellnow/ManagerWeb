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
        <div className={`rounded-lg sm:rounded-xl lg:rounded-2xl w-full aspect-square p-2 sm:p-3 lg:p-4 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow duration-200`} style={{ backgroundColor: cfg.bg }}>
            {/* 아이콘 */}
            <div className="flex items-center gap-1 sm:gap-2 mb-1 sm:mb-2 lg:mb-3">
                <div
                    className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: cfg.iconBg }}
                >
                    <img src={cfg.icon} alt={cfg.label} className="w-2 h-2 sm:w-3 sm:h-3 lg:w-4 lg:h-4" />
                </div>
            </div>

            {/* 값 */}
            <div className={`text-sm sm:text-base lg:text-lg xl:text-xl font-bold leading-tight`}>
                {value.toLocaleString()} <span className="text-xs sm:text-sm lg:text-base font-semibold">{cfg.unit}</span>
            </div>

            {/* 라벨 */}
            <div className="mt-1 text-gray-700 text-xs sm:text-sm lg:text-base font-medium">{cfg.label}</div>
        </div>
    )
}

export default SalesDetailCard;