import {createBrowserRouter} from "react-router-dom";
import DashBoardPage from "../pages/dashboard/DashBoardPage.tsx";
import LoginPage from "../pages/login/LoginPage.tsx";
import OrderPage from "../pages/order/OrderPage.tsx";
import StockPage from "../pages/stock/StockPage.tsx";
import ErrorPage from "../pages/error/ErrorPage.tsx";
import MainLayout from "../layout/MainLayout.tsx";
import PrivateRoute from "../components/PrivateRoute.tsx";

const AppRoutes = () => {
    return createBrowserRouter([
        {path: '/', element: <LoginPage />, },
        {path: '/', element: <MainLayout />,
            children: [
                { 
                    path: '/dashboard', 
                    element: (
                        <PrivateRoute>
                            <DashBoardPage />
                        </PrivateRoute>
                    )
                },
                { 
                    path: '/order', 
                    element: (
                        <PrivateRoute>
                            <OrderPage />
                        </PrivateRoute>
                    )
                },
                { 
                    path: '/stock', 
                    element: (
                        <PrivateRoute>
                            <StockPage />
                        </PrivateRoute>
                    )
                },
                { path: '/error', element: <ErrorPage />},
            ]
        }
    ])
}

export default AppRoutes;