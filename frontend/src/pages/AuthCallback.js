import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

// Use environment variable or fallback to current origin for production compatibility
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || window.location.origin;

export default function AuthCallback() {
  const navigate = useNavigate();
  const hasProcessed = useRef(false);

  useEffect(() => {
    console.log('[AuthCallback] Component mounted, hash:', window.location.hash);
    
    if (hasProcessed.current) {
      console.log('[AuthCallback] Already processed, skipping');
      return;
    }
    hasProcessed.current = true;

    const processSession = async () => {
      const hash = window.location.hash;
      console.log('[AuthCallback] Processing hash:', hash);
      
      const params = new URLSearchParams(hash.substring(1));
      const sessionId = params.get('session_id');
      console.log('[AuthCallback] Extracted session_id:', sessionId ? sessionId.substring(0, 20) + '...' : 'null');

      if (!sessionId) {
        console.log('[AuthCallback] No session_id, navigating to /app');
        navigate('/app');
        return;
      }

      try {
        console.log('[AuthCallback] Calling session-data endpoint...');
        const response = await fetch(
          `${BACKEND_URL}/api/auth/session-data?session_id=${sessionId}`,
          { credentials: 'include' }
        );

        console.log('[AuthCallback] Response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('[AuthCallback] Error response:', errorText);
          throw new Error('Session exchange failed');
        }

        const userData = await response.json();
        console.log('[AuthCallback] User data received:', userData.email);

        document.cookie = `session_token=${userData.session_token}; path=/; max-age=${7*24*60*60}; SameSite=None; Secure`;
        console.log('[AuthCallback] Cookie set, navigating to /app');

        navigate('/app', { state: { user: userData }, replace: true });
      } catch (error) {
        console.error('[AuthCallback] Auth error:', error);
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