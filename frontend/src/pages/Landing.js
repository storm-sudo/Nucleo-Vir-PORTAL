import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { LogIn, Eye, EyeOff } from 'lucide-react';

import { BACKEND_URL } from '@/config';

export default function Landing() {
  const navigate = useNavigate();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginData, setLoginData] = useState({ email: '', password: '' });

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(loginData)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        toast.success('Login successful!');
        navigate('/app');
      } else {
        toast.error(data.detail || 'Login failed');
      }
    } catch (error) {
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-[#163E64] flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img src="/logo.svg" alt="NucleoVir" className="h-12 w-12" />
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">NucleoVir</h1>
                <p className="text-xs text-slate-400">Therapeutics</p>
              </div>
            </div>
            <Button 
              onClick={() => setShowLoginModal(true)}
              data-testid="request-access-btn"
              className="bg-gradient-to-r from-[#FF3D33] to-[#215F9A] hover:from-[#e63529] hover:to-[#1a4d7a] text-white border-0"
            >
              <LogIn className="h-4 w-4 mr-2" />
              Employee Login
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="text-center max-w-2xl">
          <div className="mb-8">
            <img src="/logo.svg" alt="NucleoVir" className="h-32 w-32 mx-auto mb-6" />
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
              NucleoVir Therapeutics
            </h2>
            <p className="text-xl text-slate-300 mb-2">
              Enterprise Portal
            </p>
            <p className="text-slate-400">
              Building full-stack Immunotherapies with AI-Powered Precision
            </p>
          </div>
          
          <Button 
            size="lg"
            onClick={() => setShowLoginModal(true)}
            className="bg-gradient-to-r from-[#FF3D33] to-[#215F9A] hover:from-[#e63529] hover:to-[#1a4d7a] text-white px-8 py-6 text-lg border-0 shadow-lg shadow-[#215F9A]/20"
          >
            <LogIn className="h-5 w-5 mr-2" />
            Access Portal
          </Button>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-700/50 py-6">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-slate-400 text-sm">
            © {new Date().getFullYear()} NucleoVir Therapeutics Pvt. Ltd. All rights reserved.
          </p>
        </div>
      </footer>

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md bg-slate-800 border-slate-700">
            <CardHeader className="text-center pb-2">
              <div className="flex justify-center mb-4">
                <img src="/logo.svg" alt="NucleoVir" className="h-16 w-16" />
              </div>
              <CardTitle className="text-xl text-white">Welcome Back</CardTitle>
              <CardDescription className="text-slate-400">
                Sign in to NucleoVir Enterprise Portal
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Email Address
                  </label>
                  <Input
                    type="email"
                    data-testid="login-email"
                    value={loginData.email}
                    onChange={(e) => setLoginData({...loginData, email: e.target.value})}
                    placeholder="you@nucleovir.com"
                    required
                    className="bg-slate-900 border-slate-600 text-white placeholder:text-slate-500 focus:border-[#215F9A] focus:ring-[#215F9A]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      data-testid="login-password"
                      value={loginData.password}
                      onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                      placeholder="Enter your password"
                      required
                      className="bg-slate-900 border-slate-600 text-white placeholder:text-slate-500 focus:border-[#215F9A] focus:ring-[#215F9A] pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button 
                  type="submit" 
                  data-testid="login-submit"
                  className="w-full bg-gradient-to-r from-[#FF3D33] to-[#215F9A] hover:from-[#e63529] hover:to-[#1a4d7a] text-white py-5 border-0"
                  disabled={isLoading}
                >
                  {isLoading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>
              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => setShowLoginModal(false)}
                  className="text-sm text-slate-400 hover:text-slate-300"
                >
                  Cancel
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
