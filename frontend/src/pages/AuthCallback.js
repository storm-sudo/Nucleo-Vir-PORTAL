import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function AuthCallback() {
  const navigate = useNavigate();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processSession = async () => {
      const hash = window.location.hash;
      const params = new URLSearchParams(hash.substring(1));
      const sessionId = params.get('session_id');

      if (!sessionId) {
        navigate('/app');
        return;
      }

      try {
        const response = await fetch(
          `${BACKEND_URL}/api/auth/session-data?session_id=${sessionId}`,
          { credentials: 'include' }
        );

        if (!response.ok) {
          throw new Error('Session exchange failed');
        }

        const userData = await response.json();

        document.cookie = `session_token=${userData.session_token}; path=/; max-age=${7*24*60*60}; SameSite=None; Secure`;

        navigate('/app', { state: { user: userData }, replace: true });
      } catch (error) {
        console.error('Auth error:', error);
        navigate('/');
      }
    };

    processSession();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500 mx-auto mb-4"></div>
        <p className="text-slate-600">Authenticating...</p>
      </div>
    </div>
  );
}