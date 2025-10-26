import React, { useState } from 'react';
import axios from 'axios';
import axiosInstance from '../api/axiosInstance'
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import './Login.css';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const res = await axiosInstance.post('/api/auth/login', { email, password });
      console.log('[login] response:', res.data);

      // 1) 응답에서 access token 뽑기(여러 케이스 대비)
      const pick = (...cands) => cands.find(v => typeof v === 'string' && v.trim());
      const at = pick(
        res?.data?.access_token,
        res?.data?.accessToken,
        res?.data?.token,
        res?.data?.tokens?.access,
        res?.data?.data?.access_token
      );
      const rt = pick(
        res?.data?.refresh_token,
        res?.data?.refreshToken,
        res?.data?.tokens?.refresh
      );

      // 2) JWT 형태(세그먼트 3개) 검증
      const isJWT = (t) => typeof t === 'string' && t.split('.').length === 3;
      console.log('[login] picked access:', at, 'isJWT:', isJWT(at));

      if (!isJWT(at)) {
        setError('로그인 토큰 형식이 올바르지 않습니다. (accessToken 확인 필요)');
        setIsLoading(false);
        return;
      }
      if (at) localStorage.setItem('accessToken', at);
      if (rt) localStorage.setItem('refreshToken', rt);

      // 네 컨텍스트 호출도 유지
      login({ email }, { accessToken: at, refreshToken: rt });

      navigate('/main');

    } catch (err) {
      if (err?.response?.data?.error) setError(err.response.data.error);
      else setError('알 수 없는 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-card">
        <h1 className="title">로그인</h1>

        {error && <div className="alert">{error}</div>}

        <form className="form" onSubmit={handleSubmit}>
          <div className="form-row">
            <label htmlFor="email">이메일</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </div>

          <div className="form-row">
            <label htmlFor="password">비밀번호</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="●●●●●●●●"
              required
              autoComplete="current-password"
            />
          </div>

          <button className="submit-btn" type="submit" disabled={isLoading}>
            {isLoading ? '로그인 중…' : '로그인'}
          </button>
        </form>

        <p className="hint">
          아직 계정이 없으신가요? <Link to="/register">회원가입</Link>
        </p>
      </section>
    </main>
  );

}

export default Login;
