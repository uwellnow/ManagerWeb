import type {StocksSummaryResponseDto} from "../../types/DTO/stocksSummaryResponseDto.ts";
import StocksSummary from "./StocksSummary.tsx";


interface Props {
    stocks?: StocksSummaryResponseDto[];
    isLoading: boolean,
    isError: boolean,
}

const StocksSummaryGrid = ({stocks, isLoading, isError}: Props) => {
    return(
        <section className="flex flex-1 flex-col justify-between gap-8 w-full">
            {isLoading && <p>데이터를 로딩 중입니다</p>}
            {isError && <p>데이터를 불러오지 못했습니다</p>}
            {stocks?.map((stock) => (
                <StocksSummary
                    key={stock.storeName}
                    stock={stock} />
                ))}
        </section>
    )
}

export default StocksSummaryGrid;