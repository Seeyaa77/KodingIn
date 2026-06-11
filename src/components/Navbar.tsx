"use client";

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useKodingin } from '@/context/KodinginContext';
import { isMock } from '@/lib/supabase';
import { Search, LogOut, User, Award, Shield, ChevronDown, Check, LogIn, UserPlus, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function Navbar() {
  const { currentUser, users, switchUserProfile, registerUserProfile, searchQuery, setSearchQuery, logout } = useKodingin();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showRegForm, setShowRegForm] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Registration mock inputs
  const [regUsername, setRegUsername] = useState('');
  const [regDisplay, setRegDisplay] = useState('');
  const [regTech, setRegTech] = useState('');

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regUsername.trim() || !regDisplay.trim()) return;
    registerUserProfile(regUsername.trim(), regDisplay.trim(), regTech.split(',').map(t => t.trim()).filter(Boolean));
    setShowRegForm(false);
    setRegUsername('');
    setRegDisplay('');
    setRegTech('');
    setDropdownOpen(false);
  };

  const handleLogout = async () => {
    await logout();
    setDropdownOpen(false);
    router.push('/login');
  };

  return (
    <>
      <nav className="sticky top-0 z-40 w-full border-b border-border-default bg-bg-app/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          
          {/* Left: Brand & Connection Status */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 group">
              <span className="font-bold text-base text-text-primary tracking-tight group-hover:text-accent-blue transition-colors">
                KodingIn
              </span>
              <div 
                className={`w-2 h-2 rounded-full ${isMock ? 'bg-accent-warning' : 'bg-accent-success'} animate-pulse`} 
                title={isMock ? "Mock Database Mode (Local Storage)" : "Production Database Mode (Supabase)"}
              />
            </Link>
          </div>

          {/* Center: Global Search Bar */}
          <div className="flex-1 max-w-md relative">
            <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-text-muted">
              <Search size={14} />
            </div>
            <input
              type="text"
              placeholder="Search threads or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-bg-card border border-border-default pl-9 pr-4 py-1.5 rounded-lg text-xs text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:border-accent-blue/50 focus:ring-1 focus:ring-accent-blue/25 transition-all"
            />
          </div>

          {/* Right: Actions & Profile Dropdown */}
          <div className="flex items-center gap-3">
            {currentUser ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-1.5 p-1 rounded-lg hover:bg-hover-bg transition-colors cursor-pointer focus:outline-none"
                >
                  <img
                    src={currentUser.avatarUrl}
                    alt={currentUser.displayName}
                    className="w-6 h-6 rounded-md bg-bg-elevated border border-border-default"
                  />
                  <span className="text-xs font-medium text-text-secondary hidden sm:inline max-w-[100px] truncate">
                    {currentUser.displayName}
                  </span>
                  <ChevronDown size={12} className={`text-text-muted transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Card */}
                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-bg-card card-border rounded-xl shadow-2xl p-2 animate-fade-in text-xs z-50">
                    <div className="px-3 py-2 border-b border-border-default mb-1.5">
                      <div className="font-semibold text-text-primary flex items-center gap-1">
                        {currentUser.displayName}
                        {currentUser.role === 'admin' && (
                          <span className="inline-flex items-center gap-0.5 text-[8px] bg-accent-danger/10 text-accent-danger px-1 py-0.5 rounded font-bold uppercase">
                            <Shield size={7} /> Admin
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-text-muted">@{currentUser.username}</div>
                      
                      <div className="mt-2 flex items-center gap-1 text-[10px] text-accent-success font-semibold bg-accent-success/5 border border-accent-success/15 px-2 py-0.5 rounded">
                        <Award size={10} />
                        <span>{currentUser.reputation} Reputation Points</span>
                      </div>
                    </div>

                    <Link
                      href={`/profile/${currentUser.username}`}
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-hover-bg transition-colors cursor-pointer"
                    >
                      <User size={13} />
                      <span>View Profile</span>
                    </Link>

                    {/* Switch profile simulator for Mock DB */}
                    {isMock && (
                      <div className="border-t border-border-default my-1.5 pt-1.5">
                        <span className="block px-3 py-1 text-[9px] text-text-muted uppercase tracking-wider font-semibold">
                          Simulate Account
                        </span>
                        <div className="max-h-32 overflow-y-auto px-1 space-y-0.5 mt-1">
                          {users.map(u => (
                            <button
                              key={u.id}
                              onClick={() => {
                                switchUserProfile(u.id);
                                setDropdownOpen(false);
                              }}
                              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-left text-text-secondary hover:text-text-primary hover:bg-hover-bg transition-colors cursor-pointer"
                            >
                              <span className="truncate">@{u.username}</span>
                              {currentUser.id === u.id && <Check size={11} className="text-accent-success" />}
                            </button>
                          ))}
                          <button
                            onClick={() => setShowRegForm(true)}
                            className="w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-left text-accent-blue hover:bg-accent-blue/5 transition-colors cursor-pointer"
                          >
                            <UserPlus size={11} />
                            <span>Create Mock User</span>
                          </button>
                        </div>
                      </div>
                    )}

                    <button
                      onClick={handleLogout}
                      className="w-full border-t border-border-default mt-1.5 pt-1.5 flex items-center gap-2 px-3 py-2 rounded-lg text-accent-danger hover:bg-accent-danger/5 transition-colors cursor-pointer text-left"
                    >
                      <LogOut size={13} />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-accent-blue hover:bg-accent-blue/90 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                <LogIn size={13} />
                <span>Sign In</span>
              </Link>
            )}
          </div>

        </div>
      </nav>

      {/* Mock Registration Dialog */}
      {showRegForm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-bg-card card-border rounded-xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold text-text-primary">Create Mock Account</h2>
              <button onClick={() => setShowRegForm(false)} className="text-text-muted hover:text-text-primary cursor-pointer">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleRegisterSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-text-muted mb-1.5 font-medium">Username</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. dev_guy"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  className="w-full bg-bg-app border border-border-default p-2.5 rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent-blue"
                />
              </div>
              <div>
                <label className="block text-text-muted mb-1.5 font-medium">Display Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={regDisplay}
                  onChange={(e) => setRegDisplay(e.target.value)}
                  className="w-full bg-bg-app border border-border-default p-2.5 rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent-blue"
                />
              </div>
              <div>
                <label className="block text-text-muted mb-1.5 font-medium">Tech Stack (comma separated)</label>
                <input
                  type="text"
                  placeholder="React, Next.js, Go"
                  value={regTech}
                  onChange={(e) => setRegTech(e.target.value)}
                  className="w-full bg-bg-app border border-border-default p-2.5 rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent-blue"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-accent-blue hover:bg-accent-blue/90 text-white py-2.5 rounded-lg font-medium transition-colors cursor-pointer text-xs"
              >
                Create Account
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
