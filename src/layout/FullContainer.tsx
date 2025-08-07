import {Outlet} from "react-router-dom";

const FullContainer = () => {
    return(
        <div className="container">
            <Outlet />
        </div>
    )
}

export default FullContainer;