import uwellnowLogo from '../../assets/uwellnow.svg';
import { FaArrowRight } from "react-icons/fa6";
import {useState} from "react";
import {useNavigate} from "react-router-dom";



const LoginPage = () => {
    const [code, setCode] = useState('');
    const navigate = useNavigate();

    // Todo: 관리자 코드 입력 db 연동
    const handleLogin = () => {
        if (code === 'asdf123!') {
            navigate('/dashboard');
        } else {
            alert('잘못된 관리자 코드입니다.');
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen">
            <div className="flex items-center">
                <img src={uwellnowLogo} alt="uwellnow logo"/>
                <span className="px-4 font-semibold text-4xl"> uwellnow admin</span>
            </div>
            <div className="py-14 text-2xl leading-9" >
                <div className="font-normal text-center">안녕하세요, uwellnow 관리자페이지입니다.<br/>로그인을 위해 발급받으신 코드를 입력하세요.</div>
            </div>
            <div className="mt-14 flex w-[700px] h-[100px] items-center justify-between rounded-3xl text-normal border border-midGray bg-white px-10">
                <input type="text" placeholder="관리자 코드를 입력하세요" className="flex-grow text-2xl bg-transparent focus:outline-none"
                value={code} onChange={(e) => setCode(e.target.value)}/>
                <button onClick={handleLogin} className={`w-14 h-14 flex items-center justify-center rounded-full text-white transition-colors duration-200 ${
            code.trim() !== '' ? 'bg-mainRed' : 'bg-midGray'
          }`}>
                    <FaArrowRight size={30} className="text-white" />
                </button>
            </div>
        </div>

    )
};

export default LoginPage;