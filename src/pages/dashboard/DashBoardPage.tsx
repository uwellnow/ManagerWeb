import SalesCardGrid from "./SalesCardGrid.tsx";
import {mockSalesResponse} from "../../mock/data/sales.ts";


const DashBoardPage = () => {


    return (
        <div>
            <SalesCardGrid sales={mockSalesResponse} isLoading={false} isError={false} />
        </div>
    );
};

export default DashBoardPage;