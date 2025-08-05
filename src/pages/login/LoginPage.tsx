import uwellnow from '../../assets/uwellnow.svg';
import { FaArrowRight } from "react-icons/fa6";



const LoginPage = () => {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen">
            <div className="flex items-center">
                <img src={uwellnow} alt="uwellnow logo"/>
                <span className="px-4 font-semibold text-4xl"> uwellnow admin</span>
            </div>
            <div className="py-14 text-2xl leading-9" >
                <div className="font-normal text-center">안녕하세요, uwellnow 관리자페이지입니다.<br/>로그인을 위해 발급받으신 코드를 입력하세요.</div>
            </div>
            <div className="py-14 max-w-3xl h-28 flex rounded-3xl">
                <input type="text" placeholder="입력하세요" className="flex-grow h-14 rounded-3xl text-normal text-black bg-white" />
                <button className="ml-2 w-14 h-14 flex items-center justify-center rounded-full bg-gray-200 text-white ">
                    <FaArrowRight size={30} className="text-white" />
                </button>
            </div>
        </div>

    )
};

export default LoginPage;