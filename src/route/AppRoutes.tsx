import {createBrowserRouter} from "react-router-dom";
import DashBoardPage from "../pages/dashboard/DashBoardPage.tsx";
import LoginPage from "../pages/login/LoginPage.tsx";
import OrderPage from "../pages/order/OrderPage.tsx";
import StockPage from "../pages/stock/StockPage.tsx";
import CustomerPage from "../pages/customer/CustomerPage.tsx";
import ErrorPage from "../pages/error/ErrorPage.tsx";
import ErrorLogPage from "../pages/errorLog/ErrorLogPage.tsx";
import MainLayout from "../layout/MainLayout.tsx";

const AppRoutes = () => {
    return createBrowserRouter([
        {
            path: '/',
            element: <MainLayout />,
            children: [
                { 
                    path: '/', 
                    element: <LoginPage />
                },
                { 
                    path: '/dashboard', 
                    element: <DashBoardPage />
                },
                { 
                    path: '/order', 
                    element: <OrderPage />
                },
                { 
                    path: '/stock', 
                    element: <StockPage />
                },
                { 
                    path: '/customer', 
                    element: <CustomerPage />
                },
                { 
                    path: '/error-log', 
                    element: <ErrorLogPage />
                },
                { 
                    path: '/error', 
                    element: <ErrorPage />
                },
            ]
        }
    ])
}

export default AppRoutes;