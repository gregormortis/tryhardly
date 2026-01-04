'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

interface RegisterData {
  email: string;
  username: string;
  displayName: string;
  password: string;
  userClass?: string;
}

interface LoginData {
  email: string;
  password: string;
}

interface AuthResponse {
  user: {
    id: string;
    email: string;
    username: string;
    displayName: string;
    level: number;
    xp: number;
    class: string;
  };
  token: string;
}

export default function AuthPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Login form state
  const [loginData, setLoginData] = useState<LoginData>({
    email: '',
    password: '',
  });

  // Register form state
  const [registerData, setRegisterData] = useState<RegisterData>({
    email: '',
    username: '',
    displayName: '',
    password: '',
    userClass: 'WARRIOR',
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post<AuthResponse>('/auth/login', {
        email: loginData.email,
        password: loginData.password,
      });

      // Store token in localStorage
      localStorage.setItem('token', response.token);

      // Redirect to home page
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post<AuthResponse>('/auth/register', {
        email: registerData.email,
        username: registerData.username,
        displayName: registerData.displayName,
        password: registerData.password,
        userClass: registerData.userClass || 'WARRIOR',
      });

      // Store token in localStorage
      localStorage.setItem('token', response.token);

      // Redirect to home page
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '2rem auto', padding: '2rem' }}>
      <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Tryhardly</h1>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={() => {
              setIsLogin(true);
              setError('');
            }}
            style={{
              padding: '0.5rem 1rem',
              border: 'none',
              background: isLogin ? '#0070f3' : 'transparent',
              color: isLogin ? 'white' : '#0070f3',
              cursor: 'pointer',
            }}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => {
              setIsLogin(false);
              setError('');
            }}
            style={{
              padding: '0.5rem 1rem',
              border: 'none',
              background: !isLogin ? '#0070f3' : 'transparent',
              color: !isLogin ? 'white' : '#0070f3',
              cursor: 'pointer',
            }}
          >
            Sign Up
          </button>
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: '1rem',
            marginBottom: '1rem',
            background: '#fee',
            color: '#c33',
            borderRadius: '4px',
            border: '1px solid #fcc',
          }}
        >
          {error}
        </div>
      )}

      {isLogin ? (
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '1rem' }}>
            <label
              htmlFor="login-email"
              style={{ display: 'block', marginBottom: '0.5rem' }}
            >
              Email
            </label>
            <input
              id="login-email"
              type="email"
              value={loginData.email}
              onChange={(e) =>
                setLoginData({ ...loginData, email: e.target.value })
              }
              required
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ccc',
                borderRadius: '4px',
              }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label
              htmlFor="login-password"
              style={{ display: 'block', marginBottom: '0.5rem' }}
            >
              Password
            </label>
            <input
              id="login-password"
              type="password"
              value={loginData.password}
              onChange={(e) =>
                setLoginData({ ...loginData, password: e.target.value })
              }
              required
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ccc',
                borderRadius: '4px',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.75rem',
              background: '#0070f3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '1rem',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleRegister}>
          <div style={{ marginBottom: '1rem' }}>
            <label
              htmlFor="register-email"
              style={{ display: 'block', marginBottom: '0.5rem' }}
            >
              Email
            </label>
            <input
              id="register-email"
              type="email"
              value={registerData.email}
              onChange={(e) =>
                setRegisterData({ ...registerData, email: e.target.value })
              }
              required
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ccc',
                borderRadius: '4px',
              }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label
              htmlFor="register-username"
              style={{ display: 'block', marginBottom: '0.5rem' }}
            >
              Username
            </label>
            <input
              id="register-username"
              type="text"
              value={registerData.username}
              onChange={(e) =>
                setRegisterData({ ...registerData, username: e.target.value })
              }
              required
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ccc',
                borderRadius: '4px',
              }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label
              htmlFor="register-displayName"
              style={{ display: 'block', marginBottom: '0.5rem' }}
            >
              Display Name
            </label>
            <input
              id="register-displayName"
              type="text"
              value={registerData.displayName}
              onChange={(e) =>
                setRegisterData({
                  ...registerData,
                  displayName: e.target.value,
                })
              }
              required
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ccc',
                borderRadius: '4px',
              }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label
              htmlFor="register-password"
              style={{ display: 'block', marginBottom: '0.5rem' }}
            >
              Password
            </label>
            <input
              id="register-password"
              type="password"
              value={registerData.password}
              onChange={(e) =>
                setRegisterData({ ...registerData, password: e.target.value })
              }
              required
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ccc',
                borderRadius: '4px',
              }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label
              htmlFor="register-userClass"
              style={{ display: 'block', marginBottom: '0.5rem' }}
            >
              Class (Optional)
            </label>
            <select
              id="register-userClass"
              value={registerData.userClass}
              onChange={(e) =>
                setRegisterData({ ...registerData, userClass: e.target.value })
              }
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ccc',
                borderRadius: '4px',
              }}
            >
              <option value="WARRIOR">Warrior (Developer)</option>
              <option value="MAGE">Mage (Designer)</option>
              <option value="ROGUE">Rogue (Writer)</option>
              <option value="CLERIC">Cleric (Support)</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.75rem',
              background: '#0070f3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '1rem',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'Signing up...' : 'Sign Up'}
          </button>
        </form>
      )}
    </div>
  );
}

