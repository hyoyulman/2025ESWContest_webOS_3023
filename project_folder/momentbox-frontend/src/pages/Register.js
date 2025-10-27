import React, { useState } from 'react';
import axiosInstance from '../api/axiosInstance';
import { useNavigate } from 'react-router-dom';
import './Register.css'; // ✅ 스타일 추가

function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (password !== passwordConfirm) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await axiosInstance.post('/api/auth/register', {
        email,
        password
      });
      // 메시지는 화면에 출력 + 즉시 로그인 페이지로 이동
      setSuccessMsg(response?.data?.message || '회원가입이 완료되었습니다.');
      navigate('/login');
    } catch (err) {
      if (err.response && err.response.data) {
        setError(err.response.data.error);
      } else {
        setError('알 수 없는 오류가 발생했습니다.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card" aria-live="polite">
        <header className="auth-header">
          <h1>회원가입</h1>
          <p className="subtitle">이메일과 비밀번호로 계정을 생성하세요.</p>
        </header>

        {error && <div className="alert alert-error" role="alert">{error}</div>}
        {successMsg && <div className="alert alert-success" role="status">{successMsg}</div>}

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="email">이메일</label>
            <input
              id="email"
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@domain.com"
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">비밀번호 (8자 이상)</label>
            <div className="input-wrap">
              <input
                id="password"
                type={showPw ? 'text' : 'password'}
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호"
                required
                minLength={8}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="input-append"
                onClick={() => setShowPw((v) => !v)}
                aria-label={showPw ? '비밀번호 숨기기' : '비밀번호 표시'}
                title={showPw ? '비밀번호 숨기기' : '비밀번호 표시'}
              >
                {showPw ? '숨김' : '표시'}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="passwordConfirm">비밀번호 확인</label>
            <div className="input-wrap">
              <input
                id="passwordConfirm"
                type={showPw2 ? 'text' : 'password'}
                className="input"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                placeholder="비밀번호 확인"
                required
                minLength={8}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="input-append"
                onClick={() => setShowPw2((v) => !v)}
                aria-label={showPw2 ? '비밀번호 숨기기' : '비밀번호 표시'}
                title={showPw2 ? '비밀번호 숨기기' : '비밀번호 표시'}
              >
                {showPw2 ? '숨김' : '표시'}
              </button>
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={isLoading}>
            {isLoading ? (
              <span className="spinner" aria-hidden="true" /> 
            ) : null}
            {isLoading ? '가입 처리 중…' : '가입하기'}
          </button>
        </form>

        <footer className="auth-footer">
          <span>이미 계정이 있으신가요?</span>
          {/* 👇 a 태그를 button 태그로 변경 */}
          <button 
            type="button" // form 제출 방지
            className="link" // 기존 스타일 유지
            onClick={() => navigate('/login')}
          >
            로그인
          </button>
        </footer>
      </section>
    </main>
  );
}

export default Register;
