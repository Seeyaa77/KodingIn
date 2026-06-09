"use client";

import React, { useState, useEffect } from 'react';
import { useKodingku } from '@/context/KodingkuContext';
import { supabase, isMock } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { X, Eye, EyeOff, Loader2, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const { currentUser } = useKodingku();

  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [techStackInput, setTechStackInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);

  useEffect(() => { if (currentUser) router.push('/'); }, [currentUser, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setErrorMsg(null); setInfoMsg(null);
    if (!email.trim() || !password) return;
    setLoading(true);
    try {
      if (isMock) {
        const { data: usersData } = await supabase.from('users').select('*');
        const matched = (usersData || []).find((u: any) => u.username === email.split('@')[0] || u.id === email);
        if (matched) { supabase.auth.switchUser(matched.id); setInfoMsg("Logged in successfully. Redirecting..."); setTimeout(() => router.push('/'), 1200); }
        else throw new Error("User not found. Try a guest credential or register.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        setInfoMsg("Logged in successfully. Redirecting...");
        setTimeout(() => router.push('/'), 1500);
      }
    } catch (err: any) { setErrorMsg(err.message); } finally { setLoading(false); }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault(); setErrorMsg(null); setInfoMsg(null);
    if (!email.trim() || !password || !username.trim() || !displayName.trim()) return;
    setLoading(true);
    const techStack = techStackInput.split(',').map(t => t.trim()).filter(Boolean);
    try {
      if (isMock) {
        supabase.auth.registerUser(username.trim(), displayName.trim(), techStack);
        setInfoMsg("Account created! Redirecting...");
        setTimeout(() => router.push('/'), 1200);
      } else {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { data: { username: username.trim().toLowerCase(), display_name: displayName.trim(), tech_stack: techStack } } });
        if (error) throw error;
        if (data.user && !data.session) { setInfoMsg("Verification code sent to your email."); setShowOtpModal(true); }
        else if (data.session) { setInfoMsg("Registration completed. Redirecting..."); setTimeout(() => router.push('/'), 1500); }
      }
    } catch (err: any) { setErrorMsg(err.message); } finally { setLoading(false); }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault(); setErrorMsg(null);
    if (!otpCode.trim() || otpCode.length !== 6) { setErrorMsg("Please enter a valid 6-digit code."); return; }
    setOtpLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: otpCode.trim(), type: 'signup' });
      if (error) throw error;
      setInfoMsg("Email verified! Redirecting..."); setShowOtpModal(false);
      setTimeout(() => router.push('/'), 1500);
    } catch (err: any) { setErrorMsg(err.message); } finally { setOtpLoading(false); }
  };

  const handleOAuthLogin = async (provider: 'github' | 'google') => {
    setErrorMsg(null); setInfoMsg(null);
    try {
      if (isMock) { await supabase.auth.signInWithOAuth(provider); setInfoMsg(`${provider} login simulated. Redirecting...`); setTimeout(() => router.push('/'), 1200); }
      else { const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: `${window.location.origin}/auth/callback` } }); if (error) throw error; }
    } catch (err: any) { setErrorMsg(err.message); }
  };

  const inputClass = "w-full bg-bg-app border border-border-default p-2.5 rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent-blue placeholder:text-text-muted/50";

  return (
    <main className="flex-grow flex items-center justify-center p-4 md:p-6 bg-bg-app">
      <div className="w-full max-w-md bg-bg-card card-border rounded-xl shadow-2xl p-6 relative animate-fade-in">

        <div className="absolute top-4 left-4">
          <Link href="/" className="text-text-muted hover:text-accent-blue flex items-center gap-1.5 transition-colors text-xs">
            <ArrowLeft size={12} /> Back
          </Link>
        </div>

        <div className="text-center mb-6 mt-3">
          <h1 className="text-lg font-bold text-text-primary">Welcome to KodingIn</h1>
          <p className="text-xs text-text-muted mt-1">Sign in to join the community</p>
        </div>

        {isMock && (
          <div className="mb-4 border border-accent-warning/20 bg-accent-warning/5 text-accent-warning p-2.5 rounded-lg text-[11px] text-center">
            Demo mode — using local storage
          </div>
        )}

        {/* Tabs */}
        <div className="flex bg-bg-app border border-border-default rounded-lg p-0.5 mb-4">
          {(['login', 'register'] as const).map(tab => (
            <button key={tab} onClick={() => { setActiveTab(tab); setErrorMsg(null); }}
              className={`w-1/2 py-2 rounded-md text-xs font-medium transition-colors cursor-pointer capitalize ${activeTab === tab ? 'bg-bg-elevated text-text-primary' : 'text-text-muted hover:text-text-primary'}`}>
              {tab === 'login' ? 'Sign In' : 'Register'}
            </button>
          ))}
        </div>

        {errorMsg && (
          <div className="mb-4 border border-accent-danger/20 bg-accent-danger/5 text-accent-danger p-2.5 rounded-lg flex items-start gap-2 text-xs">
            <AlertCircle size={14} className="shrink-0 mt-0.5" /> <span>{errorMsg}</span>
          </div>
        )}
        {infoMsg && (
          <div className="mb-4 border border-accent-success/20 bg-accent-success/5 text-accent-success p-2.5 rounded-lg flex items-start gap-2 text-xs">
            <CheckCircle2 size={14} className="shrink-0 mt-0.5" /> <span>{infoMsg}</span>
          </div>
        )}

        {activeTab === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div><label className="block text-xs text-text-muted mb-1.5">Email</label><input type="text" required placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} /></div>
            <div>
              <label className="block text-xs text-text-muted mb-1.5">Password</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} required placeholder="Your password" value={password} onChange={(e) => setPassword(e.target.value)} className={`${inputClass} pr-10`} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary cursor-pointer">
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="w-full py-2.5 bg-accent-blue hover:bg-accent-blue/90 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer text-sm">
              {loading ? <><Loader2 size={14} className="animate-spin" /> Signing in...</> : 'Sign In'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-3">
            <div><label className="block text-xs text-text-muted mb-1">Email</label><input type="email" required placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} /></div>
            <div><label className="block text-xs text-text-muted mb-1">Username</label><input type="text" required placeholder="e.g. hackerman" value={username} onChange={(e) => setUsername(e.target.value)} className={inputClass} /></div>
            <div><label className="block text-xs text-text-muted mb-1">Display Name</label><input type="text" required placeholder="e.g. John Doe" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className={inputClass} /></div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Password</label>
              <input type={showPassword ? 'text' : 'password'} required placeholder="Min 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
            </div>
            <div><label className="block text-xs text-text-muted mb-1">Tech Stack (optional)</label><input type="text" placeholder="React, Rust, Go" value={techStackInput} onChange={(e) => setTechStackInput(e.target.value)} className={inputClass} /></div>
            <button type="submit" disabled={loading} className="w-full py-2.5 bg-accent-blue hover:bg-accent-blue/90 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer text-sm mt-1">
              {loading ? <><Loader2 size={14} className="animate-spin" /> Creating account...</> : 'Create Account'}
            </button>
          </form>
        )}

        <div className="my-5 flex items-center gap-3 text-text-muted text-[11px]">
          <span className="flex-1 h-px bg-border-default" /><span>or continue with</span><span className="flex-1 h-px bg-border-default" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => handleOAuthLogin('github')} className="py-2 border border-border-default hover:border-border-hover rounded-lg text-text-primary hover:bg-hover-bg transition-all flex items-center justify-center gap-2 cursor-pointer text-xs font-medium">
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" /></svg>
            GitHub
          </button>
          <button onClick={() => handleOAuthLogin('google')} className="py-2 border border-border-default hover:border-border-hover rounded-lg text-text-primary hover:bg-hover-bg transition-all flex items-center justify-center gap-2 cursor-pointer text-xs font-medium">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Google
          </button>
        </div>
      </div>

      {/* OTP Modal */}
      {showOtpModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-bg-card card-border rounded-xl p-6 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-sm text-text-primary">Verify Email</h2>
              <button onClick={() => setShowOtpModal(false)} className="text-text-muted hover:text-text-primary cursor-pointer"><X size={16} /></button>
            </div>
            <p className="text-xs text-text-muted mb-4">Enter the 6-digit code sent to your email to complete registration.</p>
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <input type="text" required maxLength={6} placeholder="000000" value={otpCode} onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                className="w-full bg-bg-app border border-border-default p-3 rounded-lg text-center tracking-[0.5em] font-bold text-lg text-text-primary focus:outline-none focus:border-accent-blue" />
              <button type="submit" disabled={otpLoading} className="w-full py-2.5 bg-accent-blue hover:bg-accent-blue/90 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer text-sm">
                {otpLoading ? <><Loader2 size={14} className="animate-spin" /> Verifying...</> : 'Verify & Continue'}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
