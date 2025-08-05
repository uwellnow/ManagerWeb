import {createBrowserRouter} from "react-router-dom";
import DashBoardPage from "../pages/dashboard/DashBoardPage.tsx";
import LoginPage from "../pages/login/LoginPage.tsx";

const AppRoutes = () => {
    return createBrowserRouter([
        {
            path: '/',
            children: [
                { index: true, element: <LoginPage />},
                { path: '/dashboard', element: <DashBoardPage />},
            ]
        }
    ])
}

export default AppRoutes;