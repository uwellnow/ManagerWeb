import uwellnowlogo from '../../public/uwellnow.svg'

const Header = () => {
    const today = new Date().toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    return(
        <div className="flex items-center flex-shrink-0 h-[100px] bg-white w-full justify-between ">
            <div className="px-8 text-grayBlue font-semibold text-2xl" >{today}</div>
            <div className="px-10 flex space-x-4">
                <div className="rounded-full overflow-hidden size-12">
                    <img src={uwellnowlogo}/>
                </div>

                <div className="flex flex-col space-y-1" >
                    <div className="text-black font-bold text-md">유웰나우 관리자</div>
                    <div className="text-gray-600 font-medium text-sm">로그아웃</div>
                </div>
            </div>


        </div>
    )
}

export default Header;