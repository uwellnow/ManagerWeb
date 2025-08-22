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
            login(response.access_token, response.token_type);
            navigate('/dashboard');
        } catch (error) {
            console.error('Login error:', error);
            setError(error instanceof Error ? error.message : '로그인에 실패했습니다. 다시 시도해주세요.');
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
        <div className="flex flex-col items-center justify-center min-h-screen">
            <div className="flex items-center">
                <img src={uwellnowLogo} alt="uwellnow logo"/>
                <span className="px-4 font-semibold text-4xl"> uwellnow admin</span>
            </div>
            <div className="py-14 text-2xl leading-9" >
                <div className="font-normal text-center">안녕하세요, uwellnow 관리자페이지입니다.<br/>로그인을 위해 아이디와 비밀번호를 입력하세요.</div>
            </div>
            
            <div className="mt-14 flex flex-col w-[700px] gap-4">
                {/* Username 입력 필드 */}
                <div className="flex w-full h-[100px] items-center justify-between rounded-3xl text-normal border border-midGray bg-white px-10">
                    <input 
                        type="text" 
                        placeholder="아이디를 입력하세요" 
                        className="flex-grow text-2xl bg-transparent focus:outline-none"
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
                <div className="flex w-full h-[100px] items-center justify-between rounded-3xl text-normal border border-midGray bg-white px-10">
                    <input 
                        type={showPassword ? "text" : "password"} 
                        placeholder="비밀번호를 입력하세요" 
                        className="flex-grow text-2xl bg-transparent focus:outline-none"
                        value={password} 
                        onChange={(e) => {
                            setPassword(e.target.value);
                            setError('');
                        }}
                        onKeyPress={handleKeyPress}
                        disabled={isLoading}
                    />
                    <div className="flex items-center space-x-2">
                        <button 
                            onClick={() => setShowPassword(!showPassword)} 
                            className="w-12 h-12 flex items-center justify-center rounded-full text-midGray hover:text-mainRed transition-colors duration-200"
                            type="button"
                        >
                            {showPassword ? <FaEyeSlash size={20} /> : <FaEye size={20} />}
                        </button>
                        <button 
                            onClick={handleLogin} 
                            disabled={isLoading || !username.trim() || !password.trim()}
                            className={`w-14 h-14 flex items-center justify-center rounded-full text-white transition-colors duration-200 ${
                                !isLoading && username.trim() !== '' && password.trim() !== '' 
                                    ? 'bg-mainRed hover:bg-red-700' 
                                    : 'bg-midGray cursor-not-allowed'
                            }`}
                        >
                            {isLoading ? (
                                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                <FaArrowRight size={30} className="text-white" />
                            )}
                        </button>
                    </div>
                </div>
            </div>
            
            {error && (
                <p className="mt-3 text-normal text-red-500">
                    {error}
                </p>
            )}
        </div>
    )
};

export default LoginPage;