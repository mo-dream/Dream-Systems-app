import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from './lib/supabase';
import { Tenant, SupportMessage, BusinessType } from './types';
import { AdminLockScreen } from './components/AdminLockScreen';
import { ChangePinModal } from './components/ChangePinModal';
import { 
  Sparkles, 
  Copy, 
  Trash2, 
  Send, 
  X, 
  Check, 
  Search, 
  RefreshCw, 
  Calendar, 
  Store, 
  UtensilsCrossed, 
  Car, 
  MessageSquare, 
  CheckCircle2, 
  AlertCircle,
  Database,
  ExternalLink,
  ShieldCheck,
  UserPlus,
  Lock,
  KeyRound,
  LogOut
} from 'lucide-react';

const LOGO_URL = 'https://mo-dream.github.io/dream/logo.png';
const PIN_STORAGE_KEY = 'dream_master_admin_pin';
const AUTH_SESSION_KEY = 'dream_master_auth_session';

export default function App() {
  // Admin Authentication & Security
  const [adminPin, setAdminPin] = useState<string>(() => {
    return localStorage.getItem(PIN_STORAGE_KEY) || '1183';
  });
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem(AUTH_SESSION_KEY) === 'true';
  });
  const [showChangePinModal, setShowChangePinModal] = useState(false);

  // Form state
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState<BusinessType>('food');
  const [expiryDate, setExpiryDate] = useState(() => {
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    return nextYear.toISOString().split('T')[0];
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Data state
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [unreadMap, setUnreadMap] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');

  // Chat state
  const [activeTenant, setActiveTenant] = useState<Tenant | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);

  // Notification Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [dbConnected, setDbConnected] = useState<boolean | null>(null);

  const chatScrollRef = useRef<HTMLDivElement>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleUnlock = () => {
    setIsAuthenticated(true);
    localStorage.setItem(AUTH_SESSION_KEY, 'true');
    showToast('تم التحقق بنجاح! مرحباً بك في مركز الإدارة', 'success');
  };

  const handleLockHQ = () => {
    setIsAuthenticated(false);
    localStorage.removeItem(AUTH_SESSION_KEY);
    showToast('تم قفل مركز القيادة بنجاح', 'info');
  };

  const handleSaveNewPin = (newPin: string) => {
    setAdminPin(newPin);
    localStorage.setItem(PIN_STORAGE_KEY, newPin);
    showToast('تم تحديث الرمز السري للوحة الإدارة بنجاح', 'success');
  };

  // 1. Fetch Tenants and Unread Messages from Supabase
  const loadTenants = useCallback(async () => {
    try {
      // Load Tenants
      const { data: tenantsData, error: tenantsErr } = await supabase
        .from('tenants')
        .select('*')
        .order('id', { ascending: false });

      if (tenantsErr) {
        console.warn('Supabase tenants query error:', tenantsErr);
        setDbConnected(false);
        return;
      }

      setDbConnected(true);
      if (tenantsData) {
        setTenants(tenantsData);
      }

      // Load Unread messages count
      const { data: unreadData, error: unreadErr } = await supabase
        .from('support_messages')
        .select('tenant_id')
        .eq('sender', 'client')
        .eq('is_read', false);

      if (!unreadErr && unreadData) {
        const counts: Record<number, number> = {};
        unreadData.forEach((u) => {
          counts[u.tenant_id] = (counts[u.tenant_id] || 0) + 1;
        });
        setUnreadMap(counts);
      }
    } catch (err) {
      console.error('Failed to load tenants:', err);
      setDbConnected(false);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load and interval auto-polling (every 8s)
  useEffect(() => {
    if (isAuthenticated) {
      loadTenants();
      const interval = setInterval(loadTenants, 8000);
      return () => clearInterval(interval);
    }
  }, [loadTenants, isAuthenticated]);

  // 2. Add New Tenant
  const handleAddTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim() || !expiryDate) {
      showToast('يرجى ملء جميع البيانات المطلوبة', 'error');
      return;
    }

    setIsSubmitting(true);
    const generatedKey = `DRM-${Math.floor(1000 + Math.random() * 9000)}`;

    try {
      const { error } = await supabase.from('tenants').insert([
        {
          business_name: businessName.trim(),
          expiry_date: expiryDate,
          license_key: generatedKey,
          business_type: businessType,
        },
      ]);

      if (error) {
        throw error;
      }

      showToast(`تم التفعيل بنجاح! الكود: ${generatedKey}`, 'success');
      setBusinessName('');
      await loadTenants();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'حدث خطأ أثناء الإضافة';
      showToast(`خطأ في الإضافة: ${errorMsg}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Open Chat with Tenant
  const openChat = async (tenant: Tenant) => {
    setActiveTenant(tenant);
    setLoadingChat(true);

    try {
      // Mark client messages as read
      await supabase
        .from('support_messages')
        .update({ is_read: true })
        .eq('tenant_id', tenant.id)
        .eq('sender', 'client');

      // Fetch messages
      const { data, error } = await supabase
        .from('support_messages')
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('created_at', { ascending: true });

      if (!error && data) {
        setMessages(data);
      }
      
      // Update unread map locally
      setUnreadMap((prev) => ({ ...prev, [tenant.id]: 0 }));
    } catch (err) {
      console.error('Chat load error:', err);
    } finally {
      setLoadingChat(false);
    }
  };

  // Refresh active chat messages periodically when chat is open
  useEffect(() => {
    if (!activeTenant || !isAuthenticated) return;

    const refreshCurrentChat = async () => {
      const { data } = await supabase
        .from('support_messages')
        .select('*')
        .eq('tenant_id', activeTenant.id)
        .order('created_at', { ascending: true });
      if (data) {
        setMessages(data);
      }
    };

    const interval = setInterval(refreshCurrentChat, 5000);
    return () => clearInterval(interval);
  }, [activeTenant, isAuthenticated]);

  // Auto scroll chat to bottom
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, activeTenant]);

  // 4. Send Reply in Chat
  const handleSendReply = async () => {
    if (!replyText.trim() || !activeTenant) return;

    const textToSend = replyText.trim();
    setReplyText('');
    setIsSending(true);

    try {
      const { error } = await supabase.from('support_messages').insert([
        {
          tenant_id: activeTenant.id,
          sender: 'admin',
          message: textToSend,
        },
      ]);

      if (error) throw error;

      // Optimistic or fresh reload
      const { data } = await supabase
        .from('support_messages')
        .select('*')
        .eq('tenant_id', activeTenant.id)
        .order('created_at', { ascending: true });

      if (data) {
        setMessages(data);
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'فشل إرسال الرد';
      showToast(errorMsg, 'error');
    } finally {
      setIsSending(false);
    }
  };

  // 5. Delete Tenant
  const handleDeleteTenant = async (id: number, name: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف المشترك نهائياً (${name})؟`)) {
      return;
    }

    try {
      const { error } = await supabase.from('tenants').delete().eq('id', id);
      if (error) throw error;

      showToast(`تم حذف المشترك ${name} بنجاح`, 'info');
      if (activeTenant?.id === id) {
        setActiveTenant(null);
      }
      await loadTenants();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'فشل الحذف';
      showToast(errorMsg, 'error');
    }
  };

  // 6. Copy License Key to Clipboard
  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    showToast(`تم نسخ الكود: ${key}`, 'success');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Helper for Business Type icon and name
  const renderTypeBadge = (type: string) => {
    switch (type) {
      case 'food':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20">
            <UtensilsCrossed className="w-3 h-3" />
            <span>مطعم / جزارة</span>
          </span>
        );
      case 'retail':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
            <Store className="w-3 h-3" />
            <span>أسواق / متجر</span>
          </span>
        );
      case 'auto':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-300 border border-sky-500/20">
            <Car className="w-3 h-3" />
            <span>زيوت / سيارات</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-300 border border-slate-500/20">
            <span>{type}</span>
          </span>
        );
    }
  };

  // If not authenticated, render Admin Lock Screen
  if (!isAuthenticated) {
    return <AdminLockScreen onUnlock={handleUnlock} correctPin={adminPin} />;
  }

  // Filtered tenants list
  const filteredTenants = tenants.filter((t) => {
    const matchesSearch =
      t.business_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.license_key.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedTypeFilter === 'all' || t.business_type === selectedTypeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="min-h-screen text-white relative p-4 md:p-8 font-['Cairo',sans-serif] select-none">
      {/* Background Watermark & Glow */}
      <div className="bg-brand">
        <img
          src={LOGO_URL}
          alt="Dream Master Watermark"
          className="bg-logo"
          onError={(e) => {
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
      </div>

      {/* Floating Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-2xl bg-slate-900 border border-white/20 backdrop-blur-xl animate-bounce">
          {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-[#b68c58]" />}
          {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-500" />}
          {toast.type === 'info' && <Check className="w-5 h-5 text-indigo-400" />}
          <span className="text-sm font-bold text-white">{toast.message}</span>
        </div>
      )}

      {/* Change Pin Modal */}
      <ChangePinModal
        isOpen={showChangePinModal}
        onClose={() => setShowChangePinModal(false)}
        currentPin={adminPin}
        onSaveNewPin={handleSaveNewPin}
      />

      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header Section */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl sm:text-5xl font-black italic tracking-wide text-[#b68c58] drop-shadow-md">
                DREAM MASTER
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#b68c58]/20 text-[#b68c58] border border-[#b68c58]/40">
                HQ ADMIN
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-indigo-400 font-bold uppercase tracking-[0.4em] sm:tracking-[0.5em] mt-1">
              Command Center v2.7 • مصطفى الأسدي
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Database live status */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl glass border border-white/10 text-xs">
              <div
                className={`w-2.5 h-2.5 rounded-full ${
                  dbConnected === true
                    ? 'bg-emerald-500 animate-pulse'
                    : dbConnected === false
                    ? 'bg-amber-500'
                    : 'bg-indigo-400'
                }`}
              />
              <span className="text-slate-300 font-medium">
                {dbConnected === true ? 'متصل بقاعدة البيانات' : 'Supabase Live'}
              </span>
            </div>

            {/* Change PIN Button */}
            <button
              onClick={() => setShowChangePinModal(true)}
              className="px-3 py-1.5 rounded-xl glass hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="تغيير رمز الدخول السري"
            >
              <KeyRound className="w-3.5 h-3.5 text-[#b68c58]" />
              <span className="hidden sm:inline">تغيير الرمز</span>
            </button>

            {/* Lock Admin Screen */}
            <button
              onClick={handleLockHQ}
              className="px-3.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="قفل لوحة الإدارة فوراً"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>قفل 🔒</span>
            </button>

            {/* Brand Logo */}
            <img
              src={LOGO_URL}
              alt="Dream Master Logo"
              className="h-14 sm:h-16 drop-shadow-2xl object-contain hidden md:block"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
        </header>

        {/* Main Grid: Add Tenant & Tenants List + Chat Window */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8 items-start">
          
          {/* Left Column: Form & Tenants Management */}
          <div className="space-y-6">
            
            {/* 1. Add New Tenant Card */}
            <div className="glass p-6 sm:p-8 border-t-4 border-[#b68c58] shadow-2xl space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2 text-white">
                  <UserPlus className="w-5 h-5 text-[#b68c58]" />
                  <span>🎫 تفعيل مشترك جديد</span>
                </h2>
                <span className="text-xs text-slate-400 font-medium">
                  إصدار ترخيص رسمي وتوليد كود DRM
                </span>
              </div>

              <form onSubmit={handleAddTenant} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">اسم المحل أو النشاط التجاري</label>
                  <input
                    id="bn"
                    type="text"
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="مثال: مطعم الأسطورة، أسواق البصرة..."
                    className="custom-input text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">نوع النشاط</label>
                  <select
                    id="bt"
                    value={businessType}
                    onChange={(e) => setBusinessType(e.target.value as BusinessType)}
                    className="custom-input text-sm"
                  >
                    <option value="food">🍽️ مطعم / جزارة</option>
                    <option value="retail">🛒 أسواق / متجر</option>
                    <option value="auto">🛢️ زيوت / سيارات</option>
                  </select>
                </div>

                <div className="col-span-1 md:col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-slate-300">تاريخ انتهاء الاشتراك</label>
                  <input
                    id="ed"
                    type="date"
                    required
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="custom-input text-sm col-span-2"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-gold col-span-1 md:col-span-2 py-4 rounded-xl text-base sm:text-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>جاري الإصدار...</span>
                    </>
                  ) : (
                    <>
                      <span>إصدار الكود 🚀</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Controls Bar: Search & Category Filter */}
            <div className="glass p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="بحث عن اسم المحل أو الكود..."
                  className="custom-input pr-10 py-2 text-xs"
                />
              </div>

              {/* Type Filter Chips */}
              <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto no-scrollbar">
                {[
                  { id: 'all', label: 'الكل' },
                  { id: 'food', label: '🍽️ مطاعم' },
                  { id: 'retail', label: '🛒 أسواق' },
                  { id: 'auto', label: '🛢️ سيارات' },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setSelectedTypeFilter(f.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      selectedTypeFilter === f.id
                        ? 'bg-[#b68c58] text-white shadow-sm'
                        : 'bg-white/5 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}

                <button
                  onClick={loadTenants}
                  title="تحديث القائمة"
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#b68c58]' : ''}`} />
                </button>
              </div>
            </div>

            {/* 2. Tenants List */}
            <div id="list" className="grid gap-3">
              {loading && tenants.length === 0 ? (
                <div className="glass p-12 text-center text-slate-400 space-y-3">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#b68c58]" />
                  <p className="text-sm font-bold">جاري تحميل المشتركين من Supabase...</p>
                </div>
              ) : filteredTenants.length === 0 ? (
                <div className="glass p-12 text-center text-slate-400 space-y-2">
                  <Store className="w-10 h-10 mx-auto opacity-40 text-slate-400" />
                  <p className="text-sm font-bold text-slate-300">
                    {searchQuery ? 'لم يتم العثور على نتائج للبحث' : 'لا يوجد مشتركون حالياً'}
                  </p>
                  <p className="text-xs text-slate-500">قم بتعبئة النموذج أعلاه لإصدار أول كود مشترك.</p>
                </div>
              ) : (
                filteredTenants.map((t) => {
                  const unreadCount = unreadMap[t.id] || 0;
                  const isSelected = activeTenant?.id === t.id;

                  return (
                    <div
                      key={t.id}
                      onClick={() => openChat(t)}
                      className={`glass p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 cursor-pointer transition-all duration-200 hover:bg-white/5 ${
                        isSelected ? 'border-2 border-indigo-500/70 bg-indigo-950/20 shadow-lg' : ''
                      }`}
                    >
                      {/* Left info */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <b className="text-lg font-bold text-white hover:text-indigo-300 transition-colors">
                            {t.business_name}
                          </b>
                          {renderTypeBadge(t.business_type)}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <code className="text-[#b68c58] font-black tracking-wider bg-black/40 px-2.5 py-1 rounded-lg border border-[#b68c58]/30">
                            {t.license_key}
                          </code>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyKey(t.license_key);
                            }}
                            className="text-[11px] bg-white/10 hover:bg-white/20 text-slate-200 px-2.5 py-1 rounded-lg font-bold transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            {copiedKey === t.license_key ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span>تم النسخ</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>نسخ 📋</span>
                              </>
                            )}
                          </button>

                          {t.expiry_date && (
                            <span className="text-[11px] text-slate-400 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span>ينتهي: {t.expiry_date}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right actions & unread badge */}
                      <div className="flex items-center gap-4 self-end sm:self-center">
                        {unreadCount > 0 && (
                          <div className="msg-dot" title={`${unreadCount} رسائل غير مقروءة`}>
                            {unreadCount}
                          </div>
                        )}

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openChat(t);
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600/30 text-indigo-300 hover:bg-indigo-600 hover:text-white transition-all flex items-center gap-1.5 border border-indigo-500/30"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>المحادثة</span>
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTenant(t.id, t.business_name);
                          }}
                          title="حذف نهائي"
                          className="text-rose-500/40 hover:text-rose-500 font-black p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Chat Box */}
          <div
            id="chat-box"
            className={`glass p-6 h-[600px] flex flex-col sticky top-8 border-r-4 border-indigo-500/40 shadow-2xl transition-all ${
              activeTenant ? 'block' : 'hidden lg:flex'
            }`}
          >
            {activeTenant ? (
              <>
                {/* Chat Header */}
                <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-indigo-400" />
                    <span id="chat-user" className="font-black text-indigo-400 text-base truncate">
                      {activeTenant.business_name}
                    </span>
                  </div>

                  <button
                    onClick={() => setActiveTenant(null)}
                    className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
                    title="إغلاق المحادثة"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Chat Messages */}
                <div
                  id="chat-content"
                  ref={chatScrollRef}
                  className="flex-1 overflow-y-auto space-y-3 mb-4 p-1 flex flex-col custom-scroll"
                >
                  {loadingChat ? (
                    <div className="flex items-center justify-center h-full text-slate-400 text-xs">
                      <RefreshCw className="w-4 h-4 animate-spin text-indigo-400 mr-2" />
                      <span>جاري تحميل الرسائل...</span>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-500 text-xs text-center p-4 space-y-2">
                      <MessageSquare className="w-8 h-8 opacity-40 text-indigo-400" />
                      <span>لا توجد رسائل دعم سابقة مع هذا المشترك.</span>
                      <span className="text-[11px] text-slate-600">اكتب رسالة بالأسفل للبدء.</span>
                    </div>
                  ) : (
                    messages.map((m, idx) => {
                      const isAdmin = m.sender === 'admin';
                      return (
                        <div
                          key={m.id || idx}
                          className={`p-3.5 rounded-2xl text-xs font-bold max-w-[85%] leading-relaxed ${
                            isAdmin
                              ? 'bg-indigo-600 text-white self-start rounded-bl-none shadow-md'
                              : 'bg-slate-800 text-slate-100 self-end rounded-br-none border border-white/10'
                          }`}
                        >
                          <div className="text-[10px] opacity-70 mb-1 font-normal">
                            {isAdmin ? 'الإدارة (Admin)' : activeTenant.business_name}
                          </div>
                          <div>{m.message}</div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Chat Reply Input */}
                <div className="flex gap-2">
                  <input
                    id="reply-in"
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="اكتب رد الدعم الفني هنا..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSendReply();
                      }
                    }}
                    className="custom-input flex-1 text-xs py-3"
                  />
                  <button
                    onClick={handleSendReply}
                    disabled={isSending || !replyText.trim()}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 rounded-xl font-black text-sm transition-colors flex items-center justify-center disabled:opacity-50 cursor-pointer shadow-md"
                  >
                    {isSending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>رد</span>}
                  </button>
                </div>
              </>
            ) : (
              /* Idle Chat Box Placeholder */
              <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 p-6 space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-indigo-400">
                  <MessageSquare className="w-7 h-7 opacity-50" />
                </div>
                <h3 className="font-bold text-sm text-slate-300">محادثات الدعم الفني</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  انقر على أي مشترك من القائمة على اليمين لفتح نافذة المحادثة المباشرة والرد على استفساراته.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer info */}
        <footer className="pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <div>
            <span>DREAM MASTER HQ • Basra, Iraq • All Rights Reserved</span>
          </div>
          <div className="flex items-center gap-4">
            <span>Mustafa Alasadi - G.S.A Manager</span>
            <span>•</span>
            <span className="text-[#b68c58] font-bold">Command Center v2.7</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
