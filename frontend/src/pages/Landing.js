import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Building2, Users, FileText, Calendar, MessageSquare, Microscope, Package, ClipboardList, LogIn } from 'lucide-react';

import { BACKEND_URL } from '@/config';

export default function Landing() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [loginLoading, setLoginLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(loginData)
      });
      
      if (response.ok) {
        const userData = await response.json();
        document.cookie = `session_token=${userData.session_token}; path=/; max-age=${7*24*60*60}; SameSite=None; Secure`;
        toast.success('Login successful!');
        navigate('/app', { state: { user: userData }, replace: true });
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Invalid email or password');
      }
    } catch (error) {
      toast.error('Login failed. Please try again.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        toast.success('Message sent successfully!');
        setFormData({ name: '', email: '', subject: '', message: '' });
      } else {
        toast.error('Failed to send message');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-900">Employee Login</h2>
              <button onClick={() => setShowLoginModal(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <Input
                  type="email"
                  placeholder="your.name@nucleovir.com"
                  value={loginData.email}
                  onChange={(e) => setLoginData({...loginData, email: e.target.value})}
                  required
                  data-testid="login-email"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                <Input
                  type="password"
                  placeholder="Enter your password"
                  value={loginData.password}
                  onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                  required
                  data-testid="login-password"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full bg-sky-500 hover:bg-sky-600" 
                disabled={loginLoading}
                data-testid="login-submit"
              >
                {loginLoading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
            <p className="mt-4 text-sm text-slate-500 text-center">
              Contact your administrator if you need access
            </p>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Building2 className="h-8 w-8 text-sky-500" />
              <span className="text-xl font-heading font-bold text-slate-900">Nucleo-vir Therapeutics</span>
            </div>
            <div className="hidden md:flex space-x-8">
              <a href="#about" className="text-slate-600 hover:text-slate-900 transition-colors">About</a>
              <a href="#services" className="text-slate-600 hover:text-slate-900 transition-colors">Services</a>
              <a href="#contact" className="text-slate-600 hover:text-slate-900 transition-colors">Contact</a>
            </div>
            <Button onClick={() => setShowLoginModal(true)} data-testid="request-access-btn" className="bg-slate-900 hover:bg-slate-800">
              <LogIn className="w-4 h-4 mr-2" />
              Login
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative bg-slate-950 overflow-hidden">
        <div className="absolute inset-0">
          <img 
            src="https://images.unsplash.com/photo-1582719299074-be127353065f?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDN8MHwxfHNlYXJjaHwyfHxiaW90ZWNoJTIwbGFib3JhdG9yeSUyMHNjaWVudGlzdCUyMHJlc2VhcmNoJTIwbW9kZXJufGVufDB8fHx8MTc2ODIwNTU4NHww&ixlib=rb-4.1.0&q=85"
            alt="Biotech Laboratory"
            className="w-full h-full object-cover opacity-30"
          />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
          <div className="max-w-3xl">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-heading font-bold text-white mb-6" style={{ letterSpacing: '-0.02em' }}>
              Advancing Therapeutics Through Innovation
            </h1>
            <p className="text-lg sm:text-xl text-slate-300 mb-8 leading-relaxed">
              Cutting-edge biotech research and development platform. Streamline your workflows, manage lab operations, and accelerate discoveries.
            </p>
            <Button onClick={() => setShowLoginModal(true)} size="lg" data-testid="hero-request-access-btn" className="bg-sky-500 hover:bg-sky-600 text-white shadow-lg">
              <LogIn className="w-5 h-5 mr-2" />
              Employee Login
            </Button>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <img 
                src="https://images.unsplash.com/photo-1582719366768-de4481b828ce?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDN8MHwxfHNlYXJjaHwxfHxiaW90ZWNoJTIwbGFib3JhdG9yeSUyMHNjaWVudGlzdCUyMHJlc2VhcmNoJTIwbW9kZXJufGVufDB8fHx8MTc2ODIwNTU4NHww&ixlib=rb-4.1.0&q=85"
                alt="Scientist analyzing data"
                className="rounded-lg shadow-[0_8px_24px_rgba(0,0,0,0.08)]"
              />
            </div>
            <div>
              <h2 className="text-3xl sm:text-4xl font-heading font-bold text-slate-900 mb-6">About Nucleo-vir Therapeutics</h2>
              <p className="text-slate-600 mb-4 leading-relaxed">
                We are a leading biotechnology company focused on developing novel therapeutics for complex diseases. Our integrated platform combines cutting-edge research with enterprise-grade management tools.
              </p>
              <p className="text-slate-600 leading-relaxed">
                From lab operations to HR management, our comprehensive system empowers teams to focus on what matters most: breakthrough science.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-16 sm:py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-heading font-bold text-slate-900 mb-4">Platform Features</h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              A complete enterprise solution for biotech organizations
            </p>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg border border-slate-200 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-shadow duration-300">
              <Users className="h-10 w-10 text-sky-500 mb-4" />
              <h3 className="text-lg font-heading font-semibold text-slate-900 mb-2">HR Management</h3>
              <p className="text-slate-600 text-sm">Employee onboarding, attendance tracking, and payroll management</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg border border-slate-200 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-shadow duration-300">
              <Microscope className="h-10 w-10 text-sky-500 mb-4" />
              <h3 className="text-lg font-heading font-semibold text-slate-900 mb-2">Lab Notebook</h3>
              <p className="text-slate-600 text-sm">Digital lab notes, SOPs, and experiment tracking</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg border border-slate-200 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-shadow duration-300">
              <Package className="h-10 w-10 text-sky-500 mb-4" />
              <h3 className="text-lg font-heading font-semibold text-slate-900 mb-2">Inventory Management</h3>
              <p className="text-slate-600 text-sm">Equipment and reagent tracking with approval workflows</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg border border-slate-200 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-shadow duration-300">
              <FileText className="h-10 w-10 text-sky-500 mb-4" />
              <h3 className="text-lg font-heading font-semibold text-slate-900 mb-2">Project Management</h3>
              <p className="text-slate-600 text-sm">Kanban boards and workflow automation</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg border border-slate-200 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-shadow duration-300">
              <Calendar className="h-10 w-10 text-sky-500 mb-4" />
              <h3 className="text-lg font-heading font-semibold text-slate-900 mb-2">Equipment Scheduling</h3>
              <p className="text-slate-600 text-sm">Book lab equipment with calendar integration</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg border border-slate-200 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-shadow duration-300">
              <MessageSquare className="h-10 w-10 text-sky-500 mb-4" />
              <h3 className="text-lg font-heading font-semibold text-slate-900 mb-2">Team Chat</h3>
              <p className="text-slate-600 text-sm">Group messaging with file sharing</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg border border-slate-200 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-shadow duration-300">
              <ClipboardList className="h-10 w-10 text-sky-500 mb-4" />
              <h3 className="text-lg font-heading font-semibold text-slate-900 mb-2">Helpdesk & CRM</h3>
              <p className="text-slate-600 text-sm">Ticketing system for internal and external support</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg border border-slate-200 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-shadow duration-300">
              <FileText className="h-10 w-10 text-sky-500 mb-4" />
              <h3 className="text-lg font-heading font-semibold text-slate-900 mb-2">Payment Workflow</h3>
              <p className="text-slate-600 text-sm">Automated payment request and approval system</p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section id="contact" className="py-16 sm:py-24 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-heading font-bold text-slate-900 mb-4">Get in Touch</h2>
            <p className="text-lg text-slate-600">Have questions? We'd love to hear from you.</p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6 bg-slate-50 p-8 rounded-lg border border-slate-200">
            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Name</label>
                <Input 
                  data-testid="contact-name-input"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                  className="h-10"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                <Input 
                  data-testid="contact-email-input"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required
                  className="h-10"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Subject</label>
              <Input 
                data-testid="contact-subject-input"
                value={formData.subject}
                onChange={(e) => setFormData({...formData, subject: e.target.value})}
                required
                className="h-10"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Message</label>
              <Textarea 
                data-testid="contact-message-textarea"
                value={formData.message}
                onChange={(e) => setFormData({...formData, message: e.target.value})}
                required
                rows={5}
              />
            </div>
            <Button type="submit" disabled={loading} data-testid="contact-submit-btn" className="w-full bg-slate-900 hover:bg-slate-800">
              {loading ? 'Sending...' : 'Send Message'}
            </Button>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <Building2 className="h-8 w-8 text-sky-500" />
              <span className="text-xl font-heading font-bold">Nucleo-vir Therapeutics</span>
            </div>
            <p className="text-slate-400">© {new Date().getFullYear()} Nucleo-vir Therapeutics. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}