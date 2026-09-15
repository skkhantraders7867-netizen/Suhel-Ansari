import React, { useState, useEffect } from 'react';
import { 
  Mail, Lock, User, Building2, Phone, ArrowRight, 
  ShieldCheck, CheckCircle2, AlertCircle, Eye, EyeOff, 
  Sparkles, KeyRound, LogIn, UserPlus, X, Check, Loader2,
  Smartphone, Plus, Trash2
} from 'lucide-react';
import { AuthUser } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  currentUser: AuthUser | null;
  onLoginSuccess: (user: AuthUser) => void;
  onClose?: () => void;
  allowClose?: boolean;
}

const STORAGE_USERS_KEY = 'nikkamabooks_registered_users_v1';
const STORAGE_CURRENT_USER_KEY = 'nikkamabooks_logged_in_user_v1';
const STORAGE_PHONE_GOOGLE_ACCOUNTS_KEY = 'vyapar_phone_google_accounts_v1';

export interface GoogleDeviceAccount {
  id: string;
  name: string;
  email: string;
  businessName?: string;
  phone?: string;
  avatarColor?: string;
}

const DEFAULT_PHONE_ACCOUNTS: GoogleDeviceAccount[] = [
  {
    id: 'g-acc-skk',
    name: 'S K Khan',
    email: 'skkhantraders7867@gmail.com',
    businessName: 'SK Khan Traders',
    phone: '+91 98200 78670',
    avatarColor: 'from-blue-600 to-indigo-600',
  },
];

// Official Google G Brand Vector Icon
const GoogleIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4 shrink-0" }) => (
  <svg className={className} viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
);

export function getStoredUser(): AuthUser | null {
  try {
    const data = localStorage.getItem(STORAGE_CURRENT_USER_KEY);
    if (data) return JSON.parse(data);
  } catch (e) {
    console.error('Error reading logged in user:', e);
  }
  return null;
}

export function saveStoredUser(user: AuthUser | null): void {
  if (user) {
    localStorage.setItem(STORAGE_CURRENT_USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(STORAGE_CURRENT_USER_KEY);
  }
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  currentUser,
  onLoginSuccess,
  onClose,
  allowClose = true,
}) => {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  
  // Google Auth states
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showGooglePicker, setShowGooglePicker] = useState(false);
  
  // Google Device Accounts state (all accounts logged into phone/Google)
  const [googleAccounts, setGoogleAccounts] = useState<GoogleDeviceAccount[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_PHONE_GOOGLE_ACCOUNTS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const hasPrimary = parsed.some(
            (a: any) => a.email && a.email.toLowerCase() === 'skkhantraders7867@gmail.com'
          );
          if (!hasPrimary) {
            return [...DEFAULT_PHONE_ACCOUNTS, ...parsed];
          }
          return parsed;
        }
      }
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_PHONE_ACCOUNTS;
  });

  const [showAddAccountForm, setShowAddAccountForm] = useState(false);
  const [newAccEmail, setNewAccEmail] = useState('');
  const [newAccName, setNewAccName] = useState('');
  const [newAccBusiness, setNewAccBusiness] = useState('');

  const savePhoneAccounts = (accounts: GoogleDeviceAccount[]) => {
    setGoogleAccounts(accounts);
    try {
      localStorage.setItem(STORAGE_PHONE_GOOGLE_ACCOUNTS_KEY, JSON.stringify(accounts));
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddNewAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccEmail || !newAccEmail.includes('@')) return;
    const cleanEmail = newAccEmail.trim().toLowerCase();
    const cleanName = newAccName.trim() || cleanEmail.split('@')[0].replace(/[._]/g, ' ');
    const cleanBiz = newAccBusiness.trim() || `${cleanName}'s Business`;

    let updated = [...googleAccounts];
    const exists = updated.find(a => a.email.toLowerCase() === cleanEmail);
    if (!exists) {
      const gradients = [
        'from-emerald-600 to-teal-600',
        'from-purple-600 to-indigo-600',
        'from-amber-600 to-orange-600',
        'from-rose-600 to-pink-600',
        'from-cyan-600 to-blue-600',
      ];
      const newAcc: GoogleDeviceAccount = {
        id: `g-acc-${Date.now()}`,
        name: cleanName,
        email: cleanEmail,
        businessName: cleanBiz,
        avatarColor: gradients[updated.length % gradients.length],
      };
      updated.push(newAcc);
      savePhoneAccounts(updated);
    }

    setShowAddAccountForm(false);
    setNewAccEmail('');
    setNewAccName('');
    setNewAccBusiness('');

    executeGoogleLogin(cleanEmail, cleanName, cleanBiz);
  };

  // Primary detected Google account from session/applet
  const primaryGoogleAccount = googleAccounts[0] || DEFAULT_PHONE_ACCOUNTS[0];

  // Pre-seed sample demo user if none exists
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_USERS_KEY);
      if (!stored) {
        const defaultUsers = [
          {
            id: 'user-demo-1',
            email: 'demo@srenterprises.in',
            password: 'demo',
            name: 'SR Enterprises Demo',
            businessName: 'SR Enterprises & Traders',
            phone: '+91 98765 43210',
            role: 'admin',
            createdAt: new Date().toISOString(),
          }
        ];
        localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(defaultUsers));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  if (!isOpen) return null;

  // Handle Google Sign-In Execution
  const executeGoogleLogin = (googleEmail: string, googleName: string, gBusinessName?: string, gPhone?: string) => {
    setIsGoogleLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    setTimeout(() => {
      try {
        const storedUsersRaw = localStorage.getItem(STORAGE_USERS_KEY);
        const usersList = storedUsersRaw ? JSON.parse(storedUsersRaw) : [];

        let existingUser = usersList.find(
          (u: any) => u.email.toLowerCase() === googleEmail.trim().toLowerCase()
        );

        if (!existingUser) {
          existingUser = {
            id: `google-${Date.now()}`,
            email: googleEmail.trim().toLowerCase(),
            password: '',
            name: googleName.trim(),
            businessName: gBusinessName || `${googleName}'s Business`,
            phone: gPhone || '',
            role: 'admin',
            provider: 'google',
            createdAt: new Date().toISOString(),
          };
          usersList.push(existingUser);
          localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(usersList));
        }

        const authUser: AuthUser = {
          id: existingUser.id,
          name: existingUser.name || googleName,
          email: existingUser.email,
          role: existingUser.role || 'admin',
          businessName: existingUser.businessName || gBusinessName || 'SK Khan Traders',
          phone: existingUser.phone || gPhone || '',
          provider: 'google',
          createdAt: existingUser.createdAt || new Date().toISOString(),
        };

        if (rememberMe) {
          saveStoredUser(authUser);
        }

        // Also ensure this account is remembered in device phone accounts
        try {
          const currentRaw = localStorage.getItem(STORAGE_PHONE_GOOGLE_ACCOUNTS_KEY);
          let currentList: GoogleDeviceAccount[] = currentRaw ? JSON.parse(currentRaw) : [];
          if (!currentList.some((a: any) => a.email && a.email.toLowerCase() === googleEmail.trim().toLowerCase())) {
            currentList.push({
              id: `g-acc-${Date.now()}`,
              name: googleName.trim(),
              email: googleEmail.trim().toLowerCase(),
              businessName: gBusinessName,
              phone: gPhone,
              avatarColor: 'from-blue-600 to-indigo-600',
            });
            localStorage.setItem(STORAGE_PHONE_GOOGLE_ACCOUNTS_KEY, JSON.stringify(currentList));
            setGoogleAccounts(currentList);
          }
        } catch (e) {
          console.error(e);
        }

        setIsGoogleLoading(false);
        setShowGooglePicker(false);
        setSuccessMessage(`Signed in with Google as ${authUser.email}`);

        setTimeout(() => {
          onLoginSuccess(authUser);
        }, 350);
      } catch (err) {
        console.error(err);
        setIsGoogleLoading(false);
        setErrorMessage('Google Sign-In encountered an error. Please try again.');
      }
    }, 600);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!email || !password) {
      setErrorMessage('Please enter both Email and Password');
      return;
    }

    try {
      const storedUsersRaw = localStorage.getItem(STORAGE_USERS_KEY);
      const usersList = storedUsersRaw ? JSON.parse(storedUsersRaw) : [];

      const found = usersList.find(
        (u: any) => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password
      );

      if (found) {
        const authUser: AuthUser = {
          id: found.id,
          name: found.name || 'User',
          email: found.email,
          role: found.role || 'admin',
          businessName: found.businessName || '',
          phone: found.phone || '',
          provider: found.provider || 'email',
          createdAt: found.createdAt || new Date().toISOString(),
        };

        if (rememberMe) {
          saveStoredUser(authUser);
        }
        setSuccessMessage('Logged in successfully!');
        setTimeout(() => {
          onLoginSuccess(authUser);
        }, 400);
      } else {
        const emailExists = usersList.some(
          (u: any) => u.email.toLowerCase() === email.trim().toLowerCase()
        );
        if (emailExists) {
          setErrorMessage('Incorrect password. Please try again.');
        } else {
          setErrorMessage('Account not found with this email. Please sign up or continue with Google.');
        }
      }
    } catch (err) {
      console.error(err);
      setErrorMessage('Login failed. Please try again.');
    }
  };

  const handleQuickDemoLogin = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    try {
      const storedUsersRaw = localStorage.getItem(STORAGE_USERS_KEY);
      const usersList = storedUsersRaw ? JSON.parse(storedUsersRaw) : [];
      const found = usersList.find(
        (u: any) => u.email.toLowerCase() === demoEmail.toLowerCase()
      );
      if (found) {
        const authUser: AuthUser = {
          id: found.id,
          name: found.name,
          email: found.email,
          role: found.role || 'admin',
          businessName: found.businessName,
          phone: found.phone,
          provider: 'demo',
          createdAt: found.createdAt,
        };
        saveStoredUser(authUser);
        setSuccessMessage(`Logged in as ${found.name}`);
        setTimeout(() => {
          onLoginSuccess(authUser);
        }, 300);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!email || !password || !fullName) {
      setErrorMessage('Please fill in Name, Email and Password');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters');
      return;
    }

    try {
      const storedUsersRaw = localStorage.getItem(STORAGE_USERS_KEY);
      const usersList = storedUsersRaw ? JSON.parse(storedUsersRaw) : [];

      const alreadyExists = usersList.some(
        (u: any) => u.email.toLowerCase() === email.trim().toLowerCase()
      );

      if (alreadyExists) {
        setErrorMessage('An account with this email already exists. Please log in.');
        return;
      }

      const newUser = {
        id: `user-${Date.now()}`,
        email: email.trim().toLowerCase(),
        password: password,
        name: fullName.trim(),
        businessName: businessName.trim() || 'My Business',
        phone: phone.trim(),
        role: 'admin',
        provider: 'email',
        createdAt: new Date().toISOString(),
      };

      usersList.push(newUser);
      localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(usersList));

      const authUser: AuthUser = {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: 'admin',
        businessName: newUser.businessName,
        phone: newUser.phone,
        provider: 'email',
        createdAt: newUser.createdAt,
      };

      saveStoredUser(authUser);
      setSuccessMessage('Account created successfully!');
      setTimeout(() => {
        onLoginSuccess(authUser);
      }, 400);
    } catch (err) {
      console.error(err);
      setErrorMessage('Registration failed. Please try again.');
    }
  };

  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setErrorMessage('Please enter your registered email address');
      return;
    }
    setSuccessMessage('Password reset link sent to ' + email + ' (Simulation)');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto no-print">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Header Banner */}
        <div className="bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900 p-6 text-white relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
                <ShieldCheck className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-xl font-black tracking-tight">SR Group Portal</h2>
                <p className="text-xs text-blue-200 font-medium">Google Sign-In & GST Cloud Access</p>
              </div>
            </div>

            {allowClose && onClose && (
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Tab Switchers */}
          <div className="flex bg-black/20 p-1 rounded-xl mt-5 backdrop-blur-xs">
            <button
              onClick={() => { setMode('login'); setShowGooglePicker(false); setErrorMessage(''); setSuccessMessage(''); }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                mode === 'login' 
                  ? 'bg-white text-blue-900 shadow-sm' 
                  : 'text-blue-100 hover:text-white'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>

            <button
              onClick={() => { setMode('signup'); setShowGooglePicker(false); setErrorMessage(''); setSuccessMessage(''); }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                mode === 'signup' 
                  ? 'bg-white text-blue-900 shadow-sm' 
                  : 'text-blue-100 hover:text-white'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Create Account</span>
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4">
          
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800 font-medium">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-xs text-emerald-800 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* GOOGLE SIGN IN SECTION (AVAILABLE IN BOTH SIGN IN & SIGN UP) */}
          {mode !== 'forgot' && (
            <div className="space-y-3">
              {showGooglePicker ? (
                /* Authentic Google Account Chooser (Showing all phone/Google accounts) */
                <div className="p-4 bg-slate-50/90 border-2 border-blue-200 rounded-3xl space-y-3.5 animate-in fade-in zoom-in-95 duration-150">
                  <div className="text-center pb-2 border-b border-slate-200/80">
                    <div className="w-10 h-10 bg-white rounded-full shadow-xs border border-slate-200 flex items-center justify-center mx-auto mb-1.5">
                      <GoogleIcon className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-black text-slate-900">Choose an account</h3>
                    <p className="text-[11px] text-slate-500">
                      to continue to <strong className="text-slate-800 font-bold">Vyapar ERP & Billing</strong>
                    </p>
                    <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-100/70 text-blue-800 text-[10px] font-bold mt-1.5">
                      <Smartphone className="w-3 h-3 text-blue-700" />
                      <span>Phone & Google Accounts ({googleAccounts.length} saved)</span>
                    </div>
                  </div>

                  {/* Accounts List */}
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {googleAccounts.map((acc) => (
                      <div
                        key={acc.id}
                        onClick={() => {
                          if (!isGoogleLoading) {
                            executeGoogleLogin(acc.email, acc.name, acc.businessName, acc.phone);
                          }
                        }}
                        className="w-full p-2.5 bg-white hover:bg-blue-50/90 active:bg-blue-100/80 border border-slate-200 hover:border-blue-400 rounded-2xl flex items-center justify-between transition-all cursor-pointer group shadow-2xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-9 h-9 rounded-full bg-gradient-to-tr ${acc.avatarColor || 'from-blue-600 to-indigo-600'} text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs`}>
                            {acc.name ? acc.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'G'}
                          </div>
                          <div className="min-w-0 text-left">
                            <p className="text-xs font-bold text-slate-900 group-hover:text-blue-700 truncate">
                              {acc.name}
                            </p>
                            <p className="text-[11px] text-slate-500 font-mono truncate">
                              {acc.email}
                            </p>
                            {acc.businessName && (
                              <p className="text-[10px] text-blue-600 font-semibold truncate">
                                🏢 {acc.businessName}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          <span className="text-[10px] font-bold text-blue-700 bg-blue-100 group-hover:bg-blue-600 group-hover:text-white px-2.5 py-1 rounded-full transition-colors">
                            Continue
                          </span>
                          {googleAccounts.length > 1 && (
                            <button
                              type="button"
                              title="Remove this account from options"
                              onClick={(e) => {
                                e.stopPropagation();
                                const updated = googleAccounts.filter(a => a.id !== acc.id);
                                savePhoneAccounts(updated.length > 0 ? updated : DEFAULT_PHONE_ACCOUNTS);
                              }}
                              className="p-1 text-slate-300 hover:text-rose-600 rounded-md transition-colors cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add Another Account Toggle or Form */}
                  {!showAddAccountForm ? (
                    <button
                      type="button"
                      onClick={() => setShowAddAccountForm(true)}
                      className="w-full py-2 px-3 bg-white hover:bg-slate-100 border border-dashed border-slate-300 hover:border-blue-400 rounded-xl text-slate-700 hover:text-blue-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-blue-600" />
                      <span>+ Use another account / Add phone email</span>
                    </button>
                  ) : (
                    <form onSubmit={handleAddNewAccount} className="p-3 bg-white border border-blue-200 rounded-2xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                          <GoogleIcon className="w-3 h-3" />
                          <span>Add another Google Account</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowAddAccountForm(false)}
                          className="text-slate-400 hover:text-slate-600 p-1"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>

                      <input
                        type="email"
                        required
                        placeholder="yourname@gmail.com *"
                        value={newAccEmail}
                        onChange={(e) => setNewAccEmail(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />

                      <div className="grid grid-cols-2 gap-1.5">
                        <input
                          type="text"
                          placeholder="Your Name (optional)"
                          value={newAccName}
                          onChange={(e) => setNewAccName(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <input
                          type="text"
                          placeholder="Business Name (optional)"
                          value={newAccBusiness}
                          onChange={(e) => setNewAccBusiness(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>

                      <div className="flex gap-1.5 pt-1">
                        <button
                          type="submit"
                          className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                        >
                          Sign In & Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowAddAccountForm(false)}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Footer actions */}
                  <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={() => setShowGooglePicker(false)}
                      className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                      <span>Back to standard login</span>
                    </button>
                    <span className="text-[10px] text-slate-400">Google Auth</span>
                  </div>
                </div>
              ) : (
                /* Main Google Sign-In Button */
                <>
                  <button
                    type="button"
                    disabled={isGoogleLoading}
                    onClick={() => setShowGooglePicker(true)}
                    className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 active:bg-slate-100 border-2 border-slate-200 hover:border-slate-300 rounded-2xl text-slate-800 font-bold text-sm shadow-xs transition-all flex items-center justify-center gap-3 group relative cursor-pointer"
                  >
                    {isGoogleLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                        <span className="text-slate-600">Connecting to Google...</span>
                      </>
                    ) : (
                      <>
                        <GoogleIcon className="w-5 h-5" />
                        <span className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                          Continue with Google
                        </span>
                        <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full ml-auto flex items-center gap-1">
                          <Smartphone className="w-2.5 h-2.5 text-blue-600" />
                          <span>{googleAccounts.length} {googleAccounts.length > 1 ? 'Accounts' : 'Account'}</span>
                        </span>
                      </>
                    )}
                  </button>

                  {/* Fast Account Selector / Switch Google ID */}
                  <div className="flex items-center justify-between px-1 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1.5 truncate">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                      <span className="truncate">Active on phone: <strong>{primaryGoogleAccount.email}</strong></span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowGooglePicker(true)}
                      className="text-blue-600 hover:text-blue-800 font-semibold underline ml-2 shrink-0 cursor-pointer"
                    >
                      Choose Account
                    </button>
                  </div>
                </>
              )}

              {/* Aesthetic divider */}
              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink mx-3 text-[10px] font-extrabold uppercase tracking-widest text-slate-400 bg-white px-1">
                  or sign in with email
                </span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>
            </div>
          )}

          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setMode('forgot')}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
                  >
                    Forgot?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-600">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
                  />
                  <span>Keep me signed in</span>
                </label>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Sign In with Password</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {mode === 'signup' && (
            <form onSubmit={handleSignUp} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Your Name / Proprietor"
                    className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Business / Firm Name
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. SR Enterprises / Traders"
                    className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Mobile / WhatsApp
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Create Password *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full pl-10 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer"
              >
                <span>Register & Open Account</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {mode === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="text-center py-2">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-2">
                  <KeyRound className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-800 text-sm">Reset Your Password</h3>
                <p className="text-xs text-slate-500 mt-0.5">Enter your email and we will send you a reset link</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Registered Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@business.com"
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition-all cursor-pointer"
              >
                Send Password Reset Email
              </button>

              <button
                type="button"
                onClick={() => setMode('login')}
                className="w-full text-center text-xs font-bold text-slate-600 hover:text-slate-800 pt-2 cursor-pointer"
              >
                ← Back to Sign In
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};

