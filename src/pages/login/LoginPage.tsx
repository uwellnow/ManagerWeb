import uwellnowLogo from '../../assets/uwellnow.svg';
import { FaArrowRight } from "react-icons/fa6";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import {useState, useEffect} from "react";
import {useNavigate} from "react-router-dom";
import { authApi } from '../../api/auth';
import { useAuth } from '../../context/AuthContext';

const LoginPage = () => {
    const [username, setUsername] = useState('admin');
    const [password, setPassword] = useState('2025StrongLife!');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const { login, isAuthenticated } = useAuth();

    // 이미 인증된 사용자는 대시보드로 리다이렉트
    useEffect(() => {
        if (isAuthenticated) {
            navigate('/dashboard');
        }
    }, [isAuthenticated, navigate]);

    // 로그아웃 시 입력 필드 초기화
    useEffect(() => {
        if (!isAuthenticated) {
            setUsername('');
            setPassword('');
            setError('');
        }
    }, [isAuthenticated]);

    const handleLogin = async () => {
        if (!username.trim() || !password.trim()) {
            setError('아이디와 비밀번호를 모두 입력해주세요.');
            return;
        }

        console.log('Login attempt with:', { username, password: '***' });
        setIsLoading(true);
        setError('');

        try {
            const response = await authApi.login({ username, password });
            console.log('Login successful:', response);
            login(response.access_token, response.token_type, response.store_name);
            navigate('/dashboard');
        } catch (error: any) {
            console.error('Login error:', error);
            // 400 에러인 경우 비밀번호 확인 메시지 표시
            if (error?.status === 400) {
                alert('비밀번호를 다시 확인해주세요.');
                setError('비밀번호를 다시 확인해주세요.');
            } else {
                setError(error instanceof Error ? error.message : '로그인에 실패했습니다. 다시 시도해주세요.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleLogin();
        }
    };

    // 이미 인증된 경우 로딩 화면 표시
    if (isAuthenticated) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="w-8 h-8 border-4 border-mainRed border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4 sm:px-6 lg:px-8">
            {/* 로고 및 제목 */}
            <div className="flex flex-col items-center mb-8 sm:mb-12 lg:mb-16">
                <div className="flex items-center mb-4 sm:mb-6">
                    <img src={uwellnowLogo} alt="uwellnow logo" className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12"/>
                    <span className="px-2 sm:px-3 lg:px-4 font-semibold text-xl sm:text-2xl lg:text-4xl text-gray-900">
                        uwellnow admin
                    </span>
                </div>
                <div className="text-center">
                    <div className="font-normal text-sm sm:text-base lg:text-2xl leading-relaxed text-gray-700 max-w-md sm:max-w-lg lg:max-w-2xl">
                        안녕하세요, uwellnow 관리자페이지입니다.<br/>
                        로그인을 위해 아이디와 비밀번호를 입력하세요.
                    </div>
                </div>
            </div>
            
            {/* 로그인 폼 */}
            <div className="w-full max-w-sm sm:max-w-md lg:max-w-lg xl:max-w-xl flex flex-col gap-3 sm:gap-4">
                {/* Username 입력 필드 */}
                <div className="flex w-full h-12 sm:h-14 lg:h-16 items-center justify-between rounded-xl sm:rounded-2xl lg:rounded-3xl text-normal border border-gray-300 bg-white px-4 sm:px-6 lg:px-8 shadow-sm hover:shadow-md transition-shadow duration-200">
                    <input 
                        type="text" 
                        placeholder="아이디를 입력하세요" 
                        className="flex-grow text-sm sm:text-base lg:text-lg bg-transparent focus:outline-none placeholder-gray-500"
                        value={username} 
                        onChange={(e) => {
                            setUsername(e.target.value);
                            setError('');
                        }}
                        onKeyPress={handleKeyPress}
                        disabled={isLoading}
                    />
                </div>
                
                {/* Password 입력 필드 */}
                <div className="flex w-full h-12 sm:h-14 lg:h-16 items-center justify-between rounded-xl sm:rounded-2xl lg:rounded-3xl text-normal border border-gray-300 bg-white px-4 sm:px-6 lg:px-8 shadow-sm hover:shadow-md transition-shadow duration-200">
                    <input 
                        type={showPassword ? "text" : "password"} 
                        placeholder="비밀번호를 입력하세요" 
                        className="flex-grow text-sm sm:text-base lg:text-lg bg-transparent focus:outline-none placeholder-gray-500"
                        value={password} 
                        onChange={(e) => {
                            setPassword(e.target.value);
                            setError('');
                        }}
                        onKeyPress={handleKeyPress}
                        disabled={isLoading}
                    />
                    <div className="flex items-center space-x-1 sm:space-x-2">
                        <button 
                            onClick={() => setShowPassword(!showPassword)} 
                            className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 flex items-center justify-center rounded-full text-gray-500 hover:text-mainRed transition-colors duration-200"
                            type="button"
                        >
                            {showPassword ? <FaEyeSlash size={16} className="sm:w-5 sm:h-5 lg:w-6 lg:h-6" /> : <FaEye size={16} className="sm:w-5 sm:h-5 lg:w-6 lg:h-6" />}
                        </button>
                        <button 
                            onClick={handleLogin} 
                            disabled={isLoading || !username.trim() || !password.trim()}
                            className={`w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 flex items-center justify-center rounded-full text-white transition-colors duration-200 ${
                                !isLoading && username.trim() !== '' && password.trim() !== '' 
                                    ? 'bg-mainRed hover:bg-red-700 shadow-md hover:shadow-lg' 
                                    : 'bg-gray-400 cursor-not-allowed'
                            }`}
                        >
                            {isLoading ? (
                                <div className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                <FaArrowRight size={16} className="sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" />
                            )}
                        </button>
                    </div>
                </div>
            </div>
            
            {/* 에러 메시지 */}
            {error && (
                <div className="mt-4 sm:mt-6 w-full max-w-sm sm:max-w-md lg:max-w-lg xl:max-w-xl">
                    <p className="text-sm sm:text-base text-red-500 text-center bg-red-50 border border-red-200 rounded-lg px-4 py-2">
                        {error}
                    </p>
                </div>
            )}
            
            {/* 추가 정보 (모바일에서만 표시) */}
            <div className="mt-8 sm:hidden text-center">
                <p className="text-xs text-gray-500">
                    최적의 경험을 위해 데스크톱에서 접속하시는 것을 권장합니다.
                </p>
            </div>
        </div>
    )
};

export default LoginPage;