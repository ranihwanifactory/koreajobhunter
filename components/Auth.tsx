
import React, { useState } from 'react';
import { auth, googleProvider } from '../services/firebase';
// Fix: Use modular imports for auth functions from firebase/auth
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { BUSINESS_INFO } from '../constants';

interface AuthProps {
  onCancel?: () => void;
}

const Auth: React.FC<AuthProps> = ({ onCancel }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError('');
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error(err);
      setError('구글 로그인 중 오류가 발생했습니다. (팝업이 차단되었는지 확인해주세요)');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    try {
      setLoading(true);
      setError('');
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/invalid-credential') {
        setError('이메일 또는 비밀번호가 올바르지 않습니다.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('이미 사용 중인 이메일입니다.');
      } else if (err.code === 'auth/weak-password') {
        setError('비밀번호는 6자 이상이어야 합니다.');
      } else {
        setError('로그인/회원가입 중 오류가 발생했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 space-y-6 relative animate-fade-in-up">
        
        {/* Close Button */}
        {onCancel && (
          <button 
            onClick={onCancel}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <i className="fas fa-times text-lg"></i>
          </button>
        )}

        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-brand-600 rounded-xl flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4">
            젊
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{BUSINESS_INFO.name}</h1>
          <p className="text-gray-500 text-sm">
            {isLogin ? '로그인하여 인력 등록을 시작하세요' : '간편하게 가입하고 일자리를 찾으세요'}
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 font-medium py-3 px-4 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
            Google로 시작하기
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">또는 이메일로</span>
            </div>
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div>
              <input
                type="email"
                placeholder="이메일 주소"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none transition-all"
                required
              />
            </div>
            <div>
              <input
                type="password"
                placeholder="비밀번호 (6자 이상)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none transition-all"
                required
                minLength={6}
              />
            </div>

            {error && (
              <p className="text-red-500 text-sm text-center bg-red-50 p-2 rounded-lg">
                <i className="fas fa-exclamation-circle mr-1"></i>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-600 text-white font-bold py-3.5 rounded-xl hover:bg-brand-700 transition-colors shadow-lg shadow-brand-200 disabled:opacity-50"
            >
              {loading ? <i className="fas fa-spinner fa-spin"></i> : (isLogin ? '로그인' : '회원가입')}
            </button>
          </form>

          <p className="text-center text-sm text-gray-600">
            {isLogin ? '계정이 없으신가요? ' : '이미 계정이 있으신가요? '}
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
                setEmail('');
                setPassword('');
              }}
              className="text-brand-600 font-bold hover:underline"
            >
              {isLogin ? '회원가입' : '로그인'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
