import uwellnowlogo from '../../public/uwellnow.svg'
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Header = () => {
    const { logout } = useAuth();
    const navigate = useNavigate();
    
    const today = new Date().toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return(
        <div className="flex items-center flex-shrink-0 h-[100px] bg-white w-full justify-between ">
            <div className="px-8 text-grayBlue font-semibold text-2xl" >{today}</div>
            <div className="px-10 flex space-x-4">
                <div className="rounded-full overflow-hidden size-12">
                    <img src={uwellnowlogo} alt="uwellnow logo"/>
                </div>

                <div className="flex flex-col space-y-1" >
                    <div className="text-black font-bold text-md">유웰나우 관리자</div>
                    <button 
                        onClick={handleLogout}
                        className="text-gray-600 font-medium text-sm hover:text-red-500 transition-colors duration-200 cursor-pointer"
                    >
                        로그아웃
                    </button>
                </div>
            </div>
        </div>
    )
}

export default Header;