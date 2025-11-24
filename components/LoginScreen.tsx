import React from 'react';
import { User } from '../types';
import { GoogleIcon, LawIcon } from './icons';

interface LoginScreenProps {
  onLogin: (user: User) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  
  const handleLogin = () => {
    // In a real app, this would involve an auth flow.
    // Here we just simulate logging in with a mock user.
    onLogin({
      name: '홍길동',
      email: 'gildong.hong@example.com',
    });
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900">
      <div className="w-full max-w-md p-8 space-y-8 bg-gray-800 rounded-2xl shadow-lg border border-gray-700">
        <div className="text-center">
            <LawIcon className="w-16 h-16 mx-auto text-cyan-400"/>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-white">
            Ai 무료 법률 비서
          </h1>
          <p className="mt-2 text-gray-400">
            당신 곁의 든든한 법률 전문가.
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={(e) => e.preventDefault()}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email-address" className="sr-only">이메일 주소</label>
              <input 
                id="email-address" 
                name="email" 
                type="email" 
                autoComplete="email" 
                required 
                className="appearance-none rounded-none relative block w-full px-3 py-3 border border-gray-600 bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 focus:z-10 sm:text-sm rounded-t-md" 
                placeholder="이메일 주소" 
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">비밀번호</label>
              <input 
                id="password" 
                name="password" 
                type="password" 
                autoComplete="current-password" 
                required 
                className="appearance-none rounded-none relative block w-full px-3 py-3 border border-gray-600 bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 focus:z-10 sm:text-sm rounded-b-md" 
                placeholder="비밀번호" 
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              onClick={handleLogin}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 focus:ring-offset-gray-800"
            >
              로그인
            </button>
          </div>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-600"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-gray-800 text-gray-400">
              또는
            </span>
          </div>
        </div>

        <div>
          <button
            type="button"
            onClick={handleLogin}
            className="group relative w-full flex justify-center items-center py-3 px-4 border border-gray-600 text-sm font-medium rounded-md text-white bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 focus:ring-offset-gray-800"
          >
            <GoogleIcon className="w-5 h-5 mr-2" />
            Google 계정으로 로그인
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;