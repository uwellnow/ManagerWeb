import type {SalesResponseDto} from "../../types/DTO/SalesResponseDto.ts";
import SalesCard from "./SalesCard.tsx";

interface Props {
    sales?: SalesResponseDto[];
    isLoading: boolean;
    isError: boolean;
}

const SalesCardGrid = ({ sales, isLoading, isError}: Props ) => {
    return (
        <section className="grid gap-8">
            {isLoading && <p>데이터를 로딩 중입니다</p>}
            {isError && <p>데이터를 불러오지 못했습니다</p>}
            {sales?.map((sale) => (
                    <SalesCard
                        key={sale.storeName}
                        sale={sale}/>
                ))}
        </section>
    );
};

export default SalesCardGrid;