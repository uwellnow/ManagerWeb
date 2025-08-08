import type {SalesDetailKind, SalesResponseDto} from "../../types/DTO/SalesResponseDto.ts";
import {SalesDetailCardTypes} from "./SalesDetailCardTypes.tsx";

type SalesDetailCardProps = {
    type: SalesDetailKind;
    data: SalesResponseDto;
}

const SalesDetailCard = ( { type, data }: SalesDetailCardProps) => {
    const cfg = SalesDetailCardTypes[type];
    const value = cfg.getValue(data);


    return (
        <div className={`rounded-2xl w-44 h-44 p-6`} style={{ backgroundColor: cfg.bg }}>
            <div className="flex items-center gap-3 mb-4">
                <div
                    className="w-9 h-9 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: cfg.iconBg }}
                >
                    <img src={cfg.icon} alt={cfg.label} className="w-5 h-5" />
                </div>
            </div>

            <div className={`text-3xl font-extrabold leading-tight`}>
                {value.toLocaleString()} <span className="text-xl font-bold">{cfg.unit}</span>
            </div>

            <div className="mt-2 text-slate-700 text-base font-semibold">{cfg.label}</div>

        </div>
    )
}

export default SalesDetailCard;