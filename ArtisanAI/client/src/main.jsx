import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  Sparkles, Search, Mic, Camera, ShieldCheck, ShoppingBag, Package, Wallet, LogOut, Menu, X, Heart, ArrowRight, Store, Languages, BarChart3, Lock, UserPlus, LogIn, CheckCircle, ImagePlus, MessageCircle, Building2, Send, Volume2, TrendingUp, Users, MapPin, Bell, ChevronDown, Star, Globe, Shield 
} from 'lucide-react';
import './styles.css';

const API = import.meta.env.VITE_API_BASE || '/api';
const money = n => `₹${Number(n || 0).toLocaleString('en-IN')}`;

async function api(path, opts = {}) {
  const token = localStorage.getItem('artisanai_token');
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const r = await fetch(API + path, { ...opts, headers });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.message || 'Something went wrong');
  return data;
}

function App() {
  const [user, setUser] = useState(null);
  const [mode, setMode] = useState('buyer'); // 'seller' or 'buyer'
  const [page, setPage] = useState('home');
  const [products, setProducts] = useState([]);
  const [q, setQ] = useState('');
  const [searchMode, setSearchMode] = useState(false);
  const [cart, setCart] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [toast, setToast] = useState('');
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [voicePurpose, setVoicePurpose] = useState('general');
  const [aiHubOpen, setAiHubOpen] = useState(false);

  const refresh = () => api('/products').then(d => setProducts(d.products)).catch(() => {});

  useEffect(() => {
    refresh();
    const token = localStorage.getItem('artisanai_token');
    if (token) api('/auth/me').then(d => setUser(d.user)).catch(() => {});
  }, []);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(''), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const filtered = useMemo(() => 
    products.filter(p => !q || [p.name, p.category, p.description, ...(p.tags || [])].join(' ').toLowerCase().includes(q.toLowerCase())),
    [products, q]
  );

  const login = (u, t) => {
    localStorage.setItem('artisanai_token', t);
    setUser(u);
    if (u.role === 'artisan') setMode('seller');
    setPage('home');
    setToast(`Welcome back, ${u.name}`);
  };

  const logout = () => {
    localStorage.removeItem('artisanai_token');
    setUser(null);
    setMode('buyer');
    setPage('home');
  };

  const toggleFavorite = (id) => {
    setFavorites(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    setToast(favorites.includes(id) ? 'Removed from favorites' : 'Saved to favorites');
  };

  return (
    <div className="app">
      <TopNavbar 
        user={user} mode={mode} setMode={setMode} page={page}
        q={q} setQ={setQ} onSearch={() => setSearchMode(true)} 
        setPage={setPage} logout={logout} cartCount={cart.length}
        setVoiceOpen={setVoiceOpen} setAiHubOpen={setAiHubOpen}
      />

      <div className={`app-layout ${mode === 'seller' || page !== 'home' ? 'seller-mode' : ''}`}>
        {/* Left Navigation Sidebar (Desktop - Only on Home Buyer Mode) */}
        {mode === 'buyer' && page === 'home' && (
          <LeftSidebar setPage={setPage} setVoiceOpen={setVoiceOpen} setAiHubOpen={setAiHubOpen}/>
        )}

        {/* Center Main Content Workspace */}
        <div className="center-workspace">
          {page === 'studio' && <PhotoStudio setPage={setPage} setToast={setToast} refresh={refresh} setVoiceOpen={setVoiceOpen} setVoicePurpose={setVoicePurpose}/>} 
          {page === 'orders' && <Orders user={user}/>}
          {page === 'cart' && <Cart cart={cart} setCart={setCart} user={user} setPage={setPage} setToast={setToast}/>}
          {page === 'login' && <Auth mode="login" onSuccess={login} switchMode={() => setPage('register')}/>}
          {page === 'register' && <Auth mode="register" onSuccess={login} switchMode={() => setPage('login')}/>}
          {page === 'security' && <Security user={user}/>}
          {page === 'b2b' && <B2B/>}
          {page === 'home' && (
            mode === 'seller' ? (
              <SellerWorkspace 
                user={user} products={products} setPage={setPage} 
                setToast={setToast} setAiHubOpen={setAiHubOpen}
              />
            ) : (
              <BuyerWorkspace 
                products={filtered} q={q} setPage={setPage} setQ={setQ} 
                setSearchMode={setSearchMode} addCart={p => { setCart(c => [...c, p]); setToast('Added to cart'); }}
                favorites={favorites} toggleFavorite={toggleFavorite}
                setVoiceOpen={setVoiceOpen} setAiHubOpen={setAiHubOpen}
              />
            )
          )}
        </div>

        {/* Right AI Assistant Panel (Desktop - Only on Home Buyer Mode) */}
        {mode === 'buyer' && page === 'home' && (
          <RightAiPanel setPage={setPage} setQ={setQ} setSearchMode={setSearchMode}/>
        )}
      </div>

      <Footer/>

      {/* Mobile Bottom Navigation Bar */}
      <MobileBottomBar mode={mode} page={page} setPage={setPage} setAiHubOpen={setAiHubOpen}/>

      {/* Floating Action Modals */}
      {toast && <div className="toast">✓ {toast}</div>}
      {searchMode && <AISearchModal initial={q} close={() => setSearchMode(false)} onResults={items => { setProducts(items); setSearchMode(false); setPage('home'); }}/>}
      <VoiceAssistant open={voiceOpen} setOpen={setVoiceOpen} purpose={voicePurpose} setPurpose={setVoicePurpose} onDescription={text => { window.dispatchEvent(new CustomEvent('artisanai:voice-description', { detail: text })); }} setQ={setQ} setPage={setPage} setSearchMode={setSearchMode} setMode={setMode}/>
      <AICommandCenter open={aiHubOpen} setOpen={setAiHubOpen} setPage={setPage} setSearchMode={setSearchMode} setVoiceOpen={setVoiceOpen}/>
    </div>
  );
}

/* ==========================================================================
   TOP NAVBAR WITH WORKSPACE MODE SWITCHER
   ========================================================================== */
function TopNavbar({ user, mode, setMode, page, q, setQ, onSearch, setPage, logout, cartCount, setVoiceOpen, setAiHubOpen }) {
  return (
    <header className="header-bar">
      <div className="brand-logo" onClick={() => setPage('home')}>
        <div className="brand-icon"><Sparkles size={19}/></div>
        <div>CraftBridge <span>ArtisanAI</span></div>
      </div>

      {/* Mode Switcher Segmented Toggle */}
      <div className="view-switcher">
        <button 
          className={mode === 'seller' ? 'seller-active' : ''} 
          onClick={() => { setMode('seller'); setPage('home'); }}
        >
          <Store size={14}/> SELLER / ARTISAN VIEW
        </button>
        <button 
          className={mode === 'buyer' ? 'buyer-active' : ''} 
          onClick={() => { setMode('buyer'); setPage('home'); }}
        >
          <ShoppingBag size={14}/> BUYER VIEW
        </button>
      </div>

      <div className="top-nav-links">
        <button className={page === 'home' ? 'active' : ''} onClick={() => setPage('home')}>Home</button>
        <button onClick={() => setPage('home')}>Shop</button>
        <button onClick={() => setPage('home')}>Artisans</button>
        <button onClick={() => setPage('studio')}>Catalog AI</button>
      </div>

      <div className="top-user-actions">
        <button className="icon-badge-btn" onClick={() => setPage('cart')} title="Cart">
          <ShoppingBag size={18}/>
          {cartCount > 0 && <span className="badge">{cartCount}</span>}
        </button>
        <button className="icon-badge-btn" onClick={() => setPage('orders')} title="Notifications / Orders">
          <Bell size={18}/>
          <span className="badge">3</span>
        </button>
        {user ? (
          <div className="user-avatar-menu" onClick={() => setPage('security')}>
            <img src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=120&q=80" alt="Avatar"/>
            <span>{user.name}</span>
            <ChevronDown size={14}/>
          </div>
        ) : (
          <button className="primary small" onClick={() => setPage('login')}><LogIn size={15}/> Login</button>
        )}
      </div>
    </header>
  );
}

/* ==========================================================================
   LEFT SIDEBAR (DESKTOP)
   ========================================================================== */
function LeftSidebar({ setPage, setVoiceOpen, setAiHubOpen }) {
  return (
    <aside className="left-sidebar">
      <div className="sidebar-card">
        <div className="sidebar-menu">
          <button className="active" onClick={() => setPage('home')}><Store size={17}/> Home</button>
          <button onClick={() => setPage('home')}><ShoppingBag size={17}/> Shop</button>
          <button onClick={() => setPage('orders')}><Package size={17}/> My Orders</button>
          <button onClick={() => setPage('home')}><Heart size={17}/> Favorites</button>
          <button onClick={() => setAiHubOpen(true)}><Sparkles size={17}/> AI Assistant</button>
          <button onClick={() => setPage('security')}><Lock size={17}/> Profile & Security</button>
        </div>
      </div>

      <div className="sidebar-banner">
        <Sparkles size={28}/>
        <h4 style={{margin: '4px 0 0'}}>Support Local Artisans</h4>
        <p>Build a Better Tomorrow with Ethical Direct Commerce.</p>
        <button className="ghost small" style={{background:'#fff', color: '#155b48', marginTop: 6}} onClick={() => setPage('b2b')}>
          Learn More <ArrowRight size={13}/>
        </button>
      </div>
    </aside>
  );
}

/* ==========================================================================
   SELLER / ARTISAN WORKSPACE (IMAGE 1 LEFT SIDE)
   ========================================================================== */
function SellerWorkspace({ user, products, setPage, setToast, setAiHubOpen }) {
  return (
    <div style={{display:'flex', flexDirection:'column', gap: 24}}>
      {/* Greeting Header */}
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <div>
          <h2 style={{fontSize: 26, margin: 0, fontFamily: 'Playfair Display', color: '#1f2d26'}}>
            Good morning, {user?.name || 'Lakshmi'} 👋
          </h2>
          <span style={{fontSize: 13, color: '#647369'}}>Your craft, your story, your market.</span>
        </div>
        <div style={{display:'flex', gap: 10, alignItems:'center'}}>
          <span className="stat-change">Verified Artisan</span>
          <button className="icon-badge-btn" onClick={() => setPage('orders')}><Bell size={18}/><span className="badge">3</span></button>
        </div>
      </div>

      {/* CREATE NEW PRODUCT PURPLE BANNER */}
      <div className="seller-banner">
        <div>
          <span className="eyebrow" style={{color:'#e0d8ff', fontSize: 11}}>CREATE NEW PRODUCT</span>
          <h2>Turn your craft into a digital product</h2>
          <p>Take a photo, speak about it and let AI create a professional listing in seconds.</p>
          <button className="btn-add" onClick={() => setPage('studio')}>
            <Sparkles size={17}/> + Add New Product
          </button>
        </div>
        <div style={{fontSize: 70, opacity: 0.85}}>📸🎙️</div>
      </div>

      {/* BUSINESS OVERVIEW STAT CARDS */}
      <div>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 12}}>
          <h3 style={{margin: 0, fontSize: 18, fontWeight: 700}}>Your Business Overview</h3>
          <button className="link" style={{fontSize: 12}} onClick={() => setAiHubOpen(true)}>View Analytics →</button>
        </div>
        <div className="stats-grid">
          <div className="stat-box">
            <div className="stat-box-top">
              <div className="stat-icon" style={{background:'#e8f8f0', color:'#27ae60'}}><Package size={18}/></div>
              <span className="stat-change">↑ 2 this week</span>
            </div>
            <strong>12</strong>
            <small>Products</small>
          </div>
          <div className="stat-box">
            <div className="stat-box-top">
              <div className="stat-icon" style={{background:'#e0f2fe', color:'#0284c7'}}><BarChart3 size={18}/></div>
              <span className="stat-change">↑ 18%</span>
            </div>
            <strong>248</strong>
            <small>Views</small>
          </div>
          <div className="stat-box">
            <div className="stat-box-top">
              <div className="stat-icon" style={{background:'#f3e8ff', color:'#9333ea'}}><MessageCircle size={18}/></div>
              <span className="stat-change">↑ 3 new</span>
            </div>
            <strong>8</strong>
            <small>Enquiries</small>
          </div>
          <div className="stat-box">
            <div className="stat-box-top">
              <div className="stat-icon" style={{background:'#ffedd5', color:'#ea580c'}}><Store size={18}/></div>
              <span style={{fontSize:10, color:'#888'}}>Updated today</span>
            </div>
            <strong>42</strong>
            <small>In Stock</small>
          </div>
        </div>
      </div>

      {/* RECENT PRODUCTS */}
      <div>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 12}}>
          <h3 style={{margin: 0, fontSize: 18, fontWeight: 700}}>Recent Products</h3>
          <button className="link" style={{fontSize: 12}} onClick={() => setPage('studio')}>View All →</button>
        </div>
        <div className="products-grid">
          {products.slice(0, 6).map(product => (
            <div className="craft-product-card" key={product.id} onClick={() => setPage('studio')}>
              <div className="craft-card-img">
                <img src={product.image} alt={product.name}/>
                <span className="card-badge">Published</span>
              </div>
              <div className="craft-card-body">
                <h4>{product.name}</h4>
                <span className="craft-card-maker">{product.stock} in stock</span>
                <div className="craft-card-price-row">
                  <span className="craft-card-price">{money(product.price)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MARKET INSIGHT BANNER */}
      <div className="insight-banner">
        <div style={{display:'flex', gap: 14, alignItems:'center'}}>
          <div style={{width: 44, height: 44, borderRadius: 12, background: '#f59e0b', color: '#fff', display: 'grid', placeItems: 'center'}}>
            <TrendingUp size={22}/>
          </div>
          <div>
            <strong style={{fontSize: 14, color: '#92400e'}}>Market Insight</strong>
            <p style={{margin: 0, fontSize: 13, color: '#78350f'}}>Cotton sarees demand increased by 8% this month. Consider adding new colorways!</p>
          </div>
        </div>
        <button className="primary small" style={{background: '#d97706'}} onClick={() => setAiHubOpen(true)}>View Trends →</button>
      </div>
    </div>
  );
}

/* ==========================================================================
   BUYER WORKSPACE (IMAGE 2 CENTER MAIN & IMAGE 1 RIGHT SIDE)
   ========================================================================== */
function BuyerWorkspace({ products, q, setPage, setQ, setSearchMode, addCart, favorites, toggleFavorite, setVoiceOpen, setAiHubOpen }) {
  const [selectedCat, setSelectedCat] = useState('All');
  const [filterTab, setFilterTab] = useState('all');

  const categories = [
    { name: 'Handicrafts', img: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=300&q=80' },
    { name: 'Textiles', img: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=300&q=80' },
    { name: 'Jewellery', img: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=300&q=80' },
    { name: 'Woodwork', img: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=300&q=80' },
    { name: 'Paintings', img: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=300&q=80' },
    { name: 'Home Decor', img: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=300&q=80' },
  ];

  const displayedProducts = useMemo(() => {
    let list = Array.isArray(products) ? products : [];
    if (selectedCat !== 'All') {
      list = list.filter(p => 
        (p.category || '').toLowerCase().includes(selectedCat.toLowerCase()) ||
        (p.tags || []).some(t => t.toLowerCase().includes(selectedCat.toLowerCase()))
      );
    }
    if (filterTab === 'top-rated') {
      list = [...list].sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (filterTab === 'popular') {
      list = [...list].reverse();
    }
    return list;
  }, [products, selectedCat, filterTab]);

  return (
    <div style={{display:'flex', flexDirection:'column', gap: 32}}>
      {/* HERO BANNER */}
      <div className="buyer-hero">
        <div className="buyer-hero-content">
          <span className="eyebrow" style={{color:'#efb84b', fontSize: 11}}>TRADITION × TECHNOLOGY × OPPORTUNITY</span>
          <h1>Discover Authentic<br/>Handmade Products</h1>
          <p>Support marginalized artisans and explore unique crafts, curated with the help of AI.</p>
          
          {/* LARGE SEARCH BAR */}
          <div className="search-bar-lg">
            <Search size={18} style={{marginRight: 10, color: '#777'}}/>
            <input 
              value={q} 
              onChange={e => setQ(e.target.value)} 
              placeholder="Search by craft, material, occasion or ask AI..." 
              onKeyDown={e => { if (e.key === 'Enter') setSearchMode(true); }}
            />
            <button onClick={() => setSearchMode(true)} title="AI Natural Language Search"><Sparkles size={18}/></button>
          </div>

          <div style={{display:'flex', gap: 16, marginTop: 20, fontSize: 12, opacity: 0.9, flexWrap: 'wrap'}}>
            <span style={{cursor: 'pointer'}} onClick={() => setSearchMode(true)}>✨ AI Natural Language Search</span>
            <span style={{cursor: 'pointer'}} onClick={() => setPage('studio')}>📋 AI Smart Cataloging</span>
            <span style={{cursor: 'pointer'}} onClick={() => setVoiceOpen(true)}>🎙️ Voice Assistant</span>
          </div>
        </div>
      </div>

      {/* 4 QUICK AI ACTION CARDS */}
      <div className="quick-ai-grid">
        <div className="quick-ai-card" onClick={() => setSearchMode(true)}>
          <div className="quick-ai-icon" style={{background:'#f3e8ff', color:'#9333ea'}}><Search size={20}/></div>
          <strong style={{fontSize: 14}}>Search Assistant</strong>
          <span style={{fontSize: 12, color: '#666'}}>Find gifts & crafts with AI</span>
        </div>

        <div className="quick-ai-card" onClick={() => setVoiceOpen(true)}>
          <div className="quick-ai-icon" style={{background:'#e0f2fe', color:'#0284c7'}}><Mic size={20}/></div>
          <strong style={{fontSize: 14}}>Voice Assistant</strong>
          <span style={{fontSize: 12, color: '#666'}}>Just speak your craft request</span>
        </div>

        <div className="quick-ai-card" onClick={() => setPage('studio')}>
          <div className="quick-ai-icon" style={{background:'#e8f8f0', color:'#27ae60'}}><ImagePlus size={20}/></div>
          <strong style={{fontSize: 14}}>Image Studio & AI</strong>
          <span style={{fontSize: 12, color: '#666'}}>Clean backgrounds & auto-fill</span>
        </div>

        <div className="quick-ai-card" onClick={() => setAiHubOpen(true)}>
          <div className="quick-ai-icon" style={{background:'#ffedd5', color:'#ea580c'}}><Sparkles size={20}/></div>
          <strong style={{fontSize: 14}}>AI Command Suite</strong>
          <span style={{fontSize: 12, color: '#666'}}>Pricing, ads, vision & translation</span>
        </div>
      </div>

      {/* SHOP BY CATEGORY PHOTO CARDS */}
      <div>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 14}}>
          <div style={{display:'flex', alignItems:'center', gap: 10}}>
            <h3 style={{margin: 0, fontSize: 20, fontWeight: 700}}>Shop by Category</h3>
            {selectedCat !== 'All' && (
              <button 
                onClick={() => { setSelectedCat('All'); setQ(''); }} 
                style={{fontSize: 11, background: '#eaf6ef', color: '#155b48', border: '1px solid #155b48', borderRadius: 99, padding: '2px 8px', cursor: 'pointer'}}
              >
                Clear Filter ({selectedCat}) ✕
              </button>
            )}
          </div>
          <button className="link" style={{fontSize: 13}} onClick={() => setSearchMode(true)}>AI Search All →</button>
        </div>
        <div className="category-photo-grid">
          {categories.map((cat, i) => (
            <div 
              key={i} 
              className={`category-photo-card ${selectedCat === cat.name ? 'active-cat' : ''}`} 
              onClick={() => {
                setSelectedCat(prev => prev === cat.name ? 'All' : cat.name);
              }}
              style={{border: selectedCat === cat.name ? '2px solid var(--green-main)' : '1px solid var(--border-color)', transform: selectedCat === cat.name ? 'scale(1.02)' : 'none'}}
            >
              <img src={cat.img} alt={cat.name}/>
              <span style={{color: selectedCat === cat.name ? 'var(--green-main)' : 'var(--text-main)', fontWeight: selectedCat === cat.name ? 800 : 600}}>
                {cat.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* FEATURED ARTISANS & CRAFTS GRID */}
      <div>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 14}}>
          <h3 style={{margin: 0, fontSize: 20, fontWeight: 700}}>
            {selectedCat === 'All' ? 'Featured Artisans & Crafts' : `${selectedCat} Collection`} ({displayedProducts.length})
          </h3>
          <div style={{display:'flex', gap: 8}}>
            <button 
              className={filterTab === 'all' ? 'primary small' : 'ghost small'} 
              style={{fontSize: 11}}
              onClick={() => setFilterTab('all')}
            >
              All
            </button>
            <button 
              className={filterTab === 'top-rated' ? 'primary small' : 'ghost small'} 
              style={{fontSize: 11}}
              onClick={() => setFilterTab('top-rated')}
            >
              Top Rated
            </button>
            <button 
              className={filterTab === 'popular' ? 'primary small' : 'ghost small'} 
              style={{fontSize: 11}}
              onClick={() => setFilterTab('popular')}
            >
              Popular
            </button>
          </div>
        </div>

        <div className="products-grid">
          {displayedProducts.length > 0 ? (
            displayedProducts.map((p, idx) => (
              <div key={p.id || idx} className="craft-product-card">
                <div className="craft-card-img">
                  <img 
                    src={p.image?.startsWith('/uploads') ? `${API.replace('/api', '')}${p.image}` : p.image} 
                    alt={p.name} 
                    onError={e => { e.target.src = 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=500&q=80'; }}
                  />
                  {idx === 0 && <span className="card-badge">★ Top Rated</span>}
                  {idx === 1 && <span className="card-badge popular">🔥 Popular</span>}
                  <button 
                    className={`btn-fav ${favorites?.includes(p.id) ? 'active' : ''}`} 
                    onClick={e => { e.stopPropagation(); toggleFavorite(p.id); }}
                    title={favorites?.includes(p.id) ? 'Remove Favorite' : 'Add to Favorites'}
                  >
                    <Heart size={16} fill={favorites?.includes(p.id) ? '#e74c3c' : 'none'} color={favorites?.includes(p.id) ? '#e74c3c' : 'currentColor'}/>
                  </button>
                </div>
                <div className="craft-card-body">
                  <h4>{p.name}</h4>
                  <span className="craft-card-maker">by {p.maker || 'Verified Artisan'} • {p.location || p.category}</span>
                  <div style={{fontSize: 12, color: '#f59e0b', margin: '2px 0'}}>★ {p.rating || '4.8 (85)'}</div>
                  <div className="craft-card-price-row">
                    <span className="craft-card-price">{money(p.price)}</span>
                    <button 
                      className="btn-view-product" 
                      onClick={e => { 
                        e.stopPropagation(); 
                        addCart(p); 
                      }}
                    >
                      Add to Bag
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div style={{gridColumn: '1 / -1', textAlign: 'center', padding: '40px 20px', background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0'}}>
              <p style={{color: '#666', fontSize: 14, margin: '0 0 10px'}}>No products found matching "{q || selectedCat}".</p>
              <button className="primary small" onClick={() => { setSelectedCat('All'); setQ(''); }}>Show All Products</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ==========================================================================
   RIGHT AI ASSISTANT PANEL (IMAGE 2 RIGHT SIDEBAR)
   ========================================================================== */
function RightAiPanel({ setPage, setQ, setSearchMode }) {
  const [msg, setMsg] = useState('');
  const [messages, setMessages] = useState([
    { from: 'ai', text: 'Namaste! I am your ArtisanAI Assistant. I can help you discover authentic handmade crafts, suggest fair prices, write listings, or enhance product photos.', suggestions: ['Find a handmade gift', 'Enhance product photo', 'Fair price calculator'] }
  ]);
  const [busy, setBusy] = useState(false);
  const [lastQuery, setLastQuery] = useState('');

  const speakText = (text) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-IN';
      u.rate = 0.95;
      window.speechSynthesis.speak(u);
    }
  };

  const send = async (text = msg) => {
    const val = (text || msg).trim();
    if (!val || busy) return;
    setLastQuery(val);
    setMsg('');
    setMessages(m => [...m, { from: 'user', text: val }]);
    setBusy(true);
    try {
      const res = await api('/ai/chat', { method: 'POST', body: JSON.stringify({ message: val }) });
      setMessages(m => [...m, { from: 'ai', text: res.reply || 'Here is what I found.', suggestions: res.suggestions || [] }]);
    } catch (e) {
      setMessages(m => [...m, { from: 'ai', text: e.message || 'AI service is temporarily unavailable.', isError: true }]);
    } finally {
      setBusy(false);
    }
  };

  const clearChat = () => {
    setMessages([{ from: 'ai', text: 'Namaste! How can I assist you with artisan crafts today?', suggestions: ['Find a handmade gift', 'Enhance product photo', 'Fair price calculator'] }]);
  };

  return (
    <aside className="right-ai-panel">
      {/* AI ASSISTANT CHAT DRAWER */}
      <div className="ai-drawer-card">
        <div className="ai-drawer-head">
          <div style={{display:'flex', alignItems:'center', gap: 6, fontWeight: 700, fontSize: 14}}>
            <Sparkles size={16} style={{color: '#155b48'}}/> AI Assistant
          </div>
          <div style={{display:'flex', alignItems:'center', gap: 8}}>
            <span style={{fontSize: 11, color: '#27ae60', fontWeight: 700}}><span className="online-dot"/> Online</span>
            <button className="ghost small" onClick={clearChat} title="Clear Chat" style={{fontSize: 10, padding: '2px 6px', color: '#888'}}>Clear</button>
          </div>
        </div>

        <div className="ai-chat-body">
          {messages.map((m, i) => (
            <div key={i} className={`ai-bubble-msg ${m.from} ${m.isError ? 'error-bubble' : ''}`}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6}}>
                <span>{m.text}</span>
                {m.from === 'ai' && (
                  <button 
                    onClick={() => speakText(m.text)} 
                    title="Read aloud"
                    style={{padding: 2, color: '#155b48', background: 'transparent', border: 'none', cursor: 'pointer', flexShrink: 0, opacity: 0.8}}
                  >
                    <Volume2 size={13}/>
                  </button>
                )}
              </div>

              {m.isError && lastQuery && (
                <button 
                  onClick={() => send(lastQuery)}
                  style={{marginTop: 6, fontSize: 11, background: '#fee2e2', border: '1px solid #ef4444', color: '#b91c1c', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', display: 'inline-block'}}
                >
                  🔄 Retry
                </button>
              )}

              {m.suggestions && m.suggestions.length > 0 && (
                <div style={{display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6}}>
                  {m.suggestions.map((sug, si) => (
                    <button 
                      key={si} 
                      onClick={() => {
                        if (sug.toLowerCase().includes('photo') || sug.toLowerCase().includes('studio')) {
                          setPage('studio');
                        } else if (sug.toLowerCase().includes('gift') || sug.toLowerCase().includes('search')) {
                          setQ(sug);
                          setSearchMode(true);
                        } else {
                          send(sug);
                        }
                      }}
                      style={{fontSize: 10, background: '#e8f3ee', color: '#155b48', border: 'none', borderRadius: 99, padding: '3px 8px', cursor: 'pointer'}}
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
          {busy && <div className="ai-bubble-msg ai"><Sparkles size={13} style={{animation: 'spin 2s linear infinite', display: 'inline-block', marginRight: 4}}/> Gemini AI is thinking...</div>}
        </div>

        {/* Quick Action Prompt Chips */}
        <div style={{display:'flex', flexWrap:'wrap', gap: 6}}>
          <button className="ghost small" style={{fontSize: 10}} onClick={() => { setQ('handmade gift under ₹1000'); setSearchMode(true); }}>🔍 Find gift</button>
          <button className="ghost small" style={{fontSize: 10}} onClick={() => setPage('studio')}>🖼️ Enhance photo</button>
          <button className="ghost small" style={{fontSize: 10}} onClick={() => send('Explain fair pricing for handmade crafts')}>💰 Fair price</button>
        </div>

        <form className="ai-chat-input-row" onSubmit={e => { e.preventDefault(); send(); }}>
          <input value={msg} onChange={e => setMsg(e.target.value)} placeholder="Ask anything about crafts, prices..."/>
          <button type="submit" disabled={busy || !msg.trim()}><Send size={15}/></button>
        </form>
      </div>

      {/* SMART CATALOG AI SUGGESTION CARD */}
      <div className="smart-catalog-card">
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 8}}>
          <strong style={{fontSize: 13, color: '#155b48'}}>Smart Catalog</strong>
          <span style={{fontSize: 11, color: '#666', cursor: 'pointer'}} onClick={() => setPage('studio')}>Create Listing →</span>
        </div>
        <div className="smart-catalog-img">
          <img src="https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=400&q=80" alt="Elephant"/>
          <span className="card-badge" style={{background: '#155b48'}}>✨ AI Featured</span>
        </div>
        <h4 style={{margin: '4px 0 2px', fontSize: 14}}>Kashmir Walnut Wood Carved Box</h4>
        <span style={{fontSize: 11, color: '#666'}}>Authentic heritage craft from Srinagar</span>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginTop: 10}}>
          <strong style={{fontSize: 16, color: '#155b48'}}>₹1,899 <small style={{fontSize: 10, color: '#27ae60', background: '#e8f8f0', padding: '2px 6px', borderRadius: 4}}>Artisan Fair Wage</small></strong>
          <button className="primary small" style={{fontSize: 11}} onClick={() => setPage('studio')}>Open Studio</button>
        </div>
      </div>

      {/* WHY CHOOSE US CIRCULAR ICONS */}
      <div className="why-choose-grid">
        <div>
          <div className="why-icon" style={{background:'#ffedd5', color:'#ea580c'}}><Wallet size={20}/></div>
          <span style={{fontSize: 10, fontWeight: 700}}>Fair Pricing</span>
        </div>
        <div>
          <div className="why-icon" style={{background:'#e0f2fe', color:'#0284c7'}}><Sparkles size={20}/></div>
          <span style={{fontSize: 10, fontWeight: 700}}>AI-Powered</span>
        </div>
        <div>
          <div className="why-icon" style={{background:'#e8f8f0', color:'#27ae60'}}><ShieldCheck size={20}/></div>
          <span style={{fontSize: 10, fontWeight: 700}}>Secure</span>
        </div>
        <div>
          <div className="why-icon" style={{background:'#f3e8ff', color:'#9333ea'}}><Globe size={20}/></div>
          <span style={{fontSize: 10, fontWeight: 700}}>Global</span>
        </div>
      </div>
    </aside>
  );
}

/* ==========================================================================
   PAGE COMPONENTS FOR SUB-NAVIGATIONS (STUDIO, ORDERS, CART, AUTH, ETC.)
   ========================================================================== */
function PhotoStudio({ setPage, setToast, refresh, setVoiceOpen, setVoicePurpose }) {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [selectedAiTile, setSelectedAiTile] = useState('quality');
  const [aiStatus, setAiStatus] = useState('');
  const [isListeningStory, setIsListeningStory] = useState(false);

  // Dynamic Product Form Fields
  const [name, setName] = useState('Terracotta Diya Lamp');
  const [category, setCategory] = useState('Handicrafts');
  const [material, setMaterial] = useState('Natural Clay');
  const [price, setPrice] = useState('450');
  const [description, setDescription] = useState('Discover this beautifully handcrafted terracotta festive diya, meticulously made by an artisan using natural clay.');
  const [tags, setTags] = useState('terracotta, natural clay, handmade, artisan, traditional');
  const [stock, setStock] = useState('10');
  const [currentStep, setCurrentStep] = useState(1);

  useEffect(() => {
    const applyVoiceDescription = event => {
      if (event.detail) {
        setDescription(String(event.detail).slice(0, 500));
        setToast('🎙️ Spoken product story applied to description!');
      }
    };
    window.addEventListener('artisanai:voice-description', applyVoiceDescription);
    return () => window.removeEventListener('artisanai:voice-description', applyVoiceDescription);
  }, []);

  // Map each AI tile to a backend background/mode value
  const tileModes = {
    quality: { background: 'studio', label: 'Enhancing Quality...' },
    bg:      { background: 'white',  label: 'Removing Background...' },
    lighting:{ background: 'sage',   label: 'Adjusting Lighting...' },
    crop:    { background: 'terracotta', label: 'Auto Cropping...' },
  };

  const processPhoto = async () => {
    if (!file) { setToast('Please upload a photo first'); return; }
    setBusy(true);
    const mode = tileModes[selectedAiTile];
    setAiStatus(mode.label);
    try {
      const form = new FormData();
      form.append('image', file);
      form.append('background', mode.background);
      form.append('enhancement', selectedAiTile);
      const token = localStorage.getItem('artisanai_token');
      const headers = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      const response = await fetch(`${API}/ai/photo`, { method: 'POST', headers, body: form });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || `Photo enhancement failed (${response.status})`);
      if (!data.image) throw new Error('The enhancement service returned no image. Please try again.');
      setResult(`${data.image}?v=${Date.now()}`);
      // Auto-fill form fields from AI vision analysis
      if (data.metadata) {
        if (data.metadata.name) setName(data.metadata.name);
        if (data.metadata.category) setCategory(data.metadata.category);
        if (data.metadata.material) setMaterial(data.metadata.material);
        if (data.metadata.detailedDescription) setDescription(data.metadata.detailedDescription);
        if (data.metadata.tags?.length) setTags(data.metadata.tags.join(', '));
        setToast(`✨ AI Vision: Photo enhanced & product details auto-filled!`);
      } else {
        setToast(`✅ Photo enhanced successfully (${selectedAiTile} mode)`);
      }
      setCurrentStep(2);
    } catch (e) {
      setToast(e.message || 'Photo enhancement is unavailable. Please check that the server is running.');
    } finally {
      setBusy(false);
      setAiStatus('');
    }
  };

  const analyzeImageDirectly = async () => {
    if (!file) { setToast('Please upload a photo first'); return; }
    setBusy(true);
    setAiStatus('Analyzing craft image with AI Vision...');
    try {
      const form = new FormData();
      form.append('image', file);
      form.append('name', name);
      form.append('category', category);
      form.append('material', material);
      const token = localStorage.getItem('artisanai_token');
      const headers = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      const response = await fetch(`${API}/ai/analyze-image`, { method: 'POST', headers, body: form });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Image analysis failed');
      const res = data.result;
      if (res) {
        if (res.name) setName(res.name);
        if (res.category) setCategory(res.category);
        if (res.material) setMaterial(res.material);
        if (res.detailedDescription) setDescription(res.detailedDescription);
        if (res.tags?.length) setTags(res.tags.join(', '));
        setToast(`🔍 AI Vision analyzed: ${res.craftType || res.category}! Details auto-filled.`);
        setCurrentStep(2);
      }
    } catch (e) {
      setToast(e.message || 'Image analysis failed');
    } finally {
      setBusy(false);
      setAiStatus('');
    }
  };

  const generateAiStory = async () => {
    setBusy(true);
    setAiStatus('Generating rich AI craft story...');
    try {
      const data = await api('/ai/generate-description', {
        method: 'POST',
        body: JSON.stringify({ 
          name: name || 'Handcrafted Artisan Product', 
          material: material || 'Traditional Natural Materials', 
          category: category || 'Handicrafts', 
          story: description ? `Enhance and write a compelling story for: ${description}` : `${name} meticulously crafted using authentic ${material}.` 
        })
      });
      const generated = data.result?.detailedDescription || data.result?.shortDescription;
      if (generated) {
        setDescription(generated.slice(0, 500));
      }
      if (data.result?.tags?.length) {
        setTags(data.result.tags.join(', '));
      }
      setCurrentStep(3);
      setToast('✨ AI craft story generated and updated in description!');
    } catch (e) {
      setToast(e.message || 'Could not generate story');
    } finally {
      setBusy(false);
      setAiStatus('');
    }
  };

  const startVoiceStory = () => {
    const supported = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
    if (!supported) {
      setVoicePurpose('description');
      setVoiceOpen(true);
      return;
    }
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new Recognition();
    recognition.lang = 'en-IN';
    recognition.interimResults = true;
    recognition.continuous = false;
    
    recognition.onstart = () => {
      setIsListeningStory(true);
      setToast('🎙️ Listening... Speak your craft story now.');
    };
    
    recognition.onresult = async (e) => {
      const spoken = Array.from(e.results).map(r => r[0].transcript).join('');
      if (spoken) {
        setDescription(spoken.slice(0, 500));
        if (e.results[0].isFinal) {
          setIsListeningStory(false);
          setBusy(true);
          setAiStatus('Refining your spoken story with AI...');
          try {
            const data = await api('/ai/generate-description', {
              method: 'POST',
              body: JSON.stringify({ 
                name: name || 'Handcrafted Artisan Craft', 
                material: material || 'Natural Materials', 
                category: category || 'Handicrafts', 
                story: spoken 
              })
            });
            const enriched = data.result?.detailedDescription || data.result?.shortDescription || spoken;
            setDescription(enriched.slice(0, 500));
            if (data.result?.tags?.length) setTags(data.result.tags.join(', '));
            setToast('✨ Spoken craft story refined and updated in description!');
          } catch (err) {
            setDescription(spoken.slice(0, 500));
            setToast('🎙️ Spoken story saved to description!');
          } finally {
            setBusy(false);
            setAiStatus('');
          }
        }
      }
    };
    
    recognition.onerror = () => {
      setIsListeningStory(false);
      setToast('Could not catch your voice. Please try again or tap the button.');
    };
    
    recognition.onend = () => {
      setIsListeningStory(false);
    };
    
    recognition.start();
  };

  const suggestAiPrice = async () => {
    setBusy(true);
    setAiStatus('Calculating fair price...');
    try {
      const data = await api('/ai/suggest-price', {
        method: 'POST',
        body: JSON.stringify({ cost: Number(price) || 200, hours: 4, category, material })
      });
      if (data.result?.suggestedPrice) setPrice(String(data.result.suggestedPrice));
      setCurrentStep(4);
      setToast(`💰 AI Fair Price: ₹${data.result?.suggestedPrice}`);
    } catch (e) {
      setToast(e.message);
    } finally {
      setBusy(false);
      setAiStatus('');
    }
  };

  const publishProduct = async () => {
    if (!name || !price) {
      setToast('Please enter a product name and price');
      return;
    }
    setPublishing(true);
    try {
      const payload = {
        name,
        category,
        material,
        price: Number(price),
        description,
        tags,
        stock: Number(stock || 1),
        image: result ? result.split('?')[0] : 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=500&q=80'
      };

      const data = await api('/products', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (refresh) refresh();
      setToast('🎉 Product successfully published to ArtisanAI Marketplace!');
      setCurrentStep(4);
      setPage('home');
    } catch (e) {
      setToast(e.message);
    } finally {
      setPublishing(false);
    }
  };

  const currentPreviewImage = result ? result : (
    file ? URL.createObjectURL(file) : 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=600&q=80'
  );

  return (
    <div className="publish-page-container">
      {/* Header Bar */}
      <div className="publish-header">
        <div className="publish-header-icon">
          <Sparkles size={24}/>
        </div>
        <div>
          <h2 style={{margin: 0, fontSize: 20, fontWeight: 700, color: '#155b48'}}>Enhance Photo & Publish Product</h2>
          <span style={{fontSize: 13, color: '#647369'}}>Use AI to improve your product image, add details, and publish it directly to the ArtisanAI marketplace.</span>
        </div>
        <button onClick={() => setPage('home')} style={{marginLeft:'auto',background:'#f3f4f6',border:'none',borderRadius:8,padding:'8px 14px',cursor:'pointer',fontSize:12,fontWeight:600,color:'#555'}}>← Back</button>
      </div>

      {/* AI BUSY BANNER */}
      {busy && aiStatus && (
        <div style={{background:'linear-gradient(90deg,#155b48,#00b894)',color:'#fff',borderRadius:14,padding:'12px 20px',display:'flex',alignItems:'center',gap:12,fontSize:14,fontWeight:600,animation:'pulse 1.5s infinite'}}>
          <Sparkles size={18}/> 🤖 {aiStatus}
          <span style={{fontSize:11,opacity:.8,marginLeft:'auto'}}>AI is working...</span>
        </div>
      )}

      {/* 4 Step Workflow Stepper */}
      <div className="publish-stepper">
        <button type="button" className={`stepper-item ${currentStep === 1 ? 'active' : currentStep > 1 ? 'complete' : ''}`} onClick={() => setCurrentStep(1)}>
          <div className="stepper-circle">1</div>
          <span>Upload & Enhance</span>
        </button>
        <div className="stepper-line"/>
        <button type="button" className={`stepper-item ${currentStep === 2 ? 'active' : currentStep > 2 ? 'complete' : ''}`} onClick={() => setCurrentStep(2)}>
          <div className="stepper-circle">2</div>
          <span>Product Details</span>
        </button>
        <div className="stepper-line"/>
        <button type="button" className={`stepper-item ${currentStep === 3 ? 'active' : currentStep > 3 ? 'complete' : ''}`} onClick={() => setCurrentStep(3)}>
          <div className="stepper-circle">3</div>
          <span>Pricing & Inventory</span>
        </button>
        <div className="stepper-line"/>
        <button type="button" className={`stepper-item ${currentStep === 4 ? 'active' : ''}`} onClick={() => setCurrentStep(4)}>
          <div className="stepper-circle">4</div>
          <span>Publish</span>
        </button>
      </div>

      {/* 3 Column Grid */}
      <div className="publish-3col-grid">

        {/* COLUMN 1: UPLOAD & AI ENHANCEMENT */}
        <div className="publish-card">
          <div className="publish-card-title">
            <ImagePlus size={18}/> Upload Product Photo
          </div>

          <label className="publish-dropzone">
            <div style={{width: 48, height: 48, borderRadius: '50%', background: '#e8f3ee', color: '#155b48', display: 'grid', placeItems: 'center'}}>
              <ImagePlus size={24}/>
            </div>
            {file ? (
              <b style={{fontSize: 13, color: '#155b48'}}>{file.name}</b>
            ) : (
              <>
                <span style={{fontSize: 12, color: '#556'}}>Drag & drop your image here</span>
                <span style={{fontSize: 11, color: '#889'}}>or</span>
                <span className="primary small" style={{background: '#155b48', padding: '6px 16px', fontSize: 12}}>Choose File</span>
                <small style={{fontSize: 10, color: '#889'}}>Supports JPG, PNG (Max 5MB)</small>
              </>
            )}
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => { setFile(e.target.files?.[0] || null); setResult(null); }}/>
          </label>

          {/* AI Enhancement Panel */}
          <div className="ai-enhance-panel">
            <div style={{display: 'flex', gap: 6, alignItems: 'center', fontSize: 12, fontWeight: 700, color: '#155b48'}}>
              <Sparkles size={15}/> AI Enhancement — Select Mode & Click Enhance
            </div>

            <div className="ai-tiles-2x2">
              <button 
                type="button" 
                className={`ai-tile-btn ${selectedAiTile === 'quality' ? 'active' : ''}`}
                onClick={() => { setSelectedAiTile('quality'); }}
              >
                <Sparkles size={16}/>
                <strong>Enhance Quality</strong>
                <small>Sharper & clearer</small>
              </button>

              <button 
                type="button" 
                className={`ai-tile-btn ${selectedAiTile === 'bg' ? 'active' : ''}`}
                onClick={() => { setSelectedAiTile('bg'); }}
              >
                <ImagePlus size={16}/>
                <strong>Clean Background</strong>
                <small>Clean & professional</small>
              </button>

              <button 
                type="button" 
                className={`ai-tile-btn ${selectedAiTile === 'lighting' ? 'active' : ''}`}
                onClick={() => { setSelectedAiTile('lighting'); }}
              >
                <Volume2 size={16}/>
                <strong>Adjust Lighting</strong>
                <small>Brighter & natural</small>
              </button>

              <button 
                type="button" 
                className={`ai-tile-btn ${selectedAiTile === 'crop' ? 'active' : ''}`}
                onClick={() => { setSelectedAiTile('crop'); }}
              >
                <Package size={16}/>
                <strong>Auto Crop</strong>
                <small>Perfect framing</small>
              </button>
            </div>

            {!file && (
              <div style={{background:'#fff8e1',border:'1px solid #ffe082',borderRadius:10,padding:'8px 12px',fontSize:11,color:'#795548',textAlign:'center'}}>
                ⬆️ Upload a product photo above first, then click Enhance
              </div>
            )}

            <button 
              className="primary full" 
              style={{background: file ? '#155b48' : '#aaa', fontSize: 13, marginTop: 4, cursor: file ? 'pointer' : 'not-allowed'}} 
              disabled={busy || !file} 
              onClick={processPhoto}
            >
              <Sparkles size={15}/> {busy && aiStatus ? aiStatus : file ? `✨ Enhance Photo (${selectedAiTile === 'quality' ? 'Quality' : selectedAiTile === 'bg' ? 'Clean BG' : selectedAiTile === 'lighting' ? 'Lighting' : 'Auto Crop'}) →` : 'Upload Photo First'}
            </button>

            <button 
              type="button"
              className="ghost full" 
              style={{fontSize: 12, marginTop: 6, border: '1px solid #155b48', color: '#155b48', background: '#eaf8f4', cursor: file ? 'pointer' : 'not-allowed'}} 
              disabled={busy || !file} 
              onClick={analyzeImageDirectly}
            >
              <Search size={14}/> 🔍 Analyze Details via AI Vision (Auto-Fill Form)
            </button>
          </div>
        </div>

        {/* COLUMN 2: PRODUCT INFORMATION FORM */}
        <div className="publish-card">
          <div className="publish-card-title">
            <Package size={18}/> Product Information
          </div>

          <div className="publish-form">
            <label>Product Name *
              <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Terracotta Diya Lamp"/>
            </label>

            <label>Category *
              <select value={category} onChange={e => setCategory(e.target.value)}>
                <option>Handicrafts</option>
                <option>Textiles</option>
                <option>Jewellery</option>
                <option>Woodwork</option>
                <option>Paintings</option>
                <option>Home Decor</option>
                <option>Bamboo Craft</option>
              </select>
            </label>

            <label>Material
              <input value={material} onChange={e => setMaterial(e.target.value)} placeholder="e.g. Natural Clay"/>
            </label>

            <div className="form-row-2col">
              <label>Selling Price (₹) *
                <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="Enter price"/>
              </label>

              <label>Stock Quantity *
                <input type="number" value={stock} onChange={e => setStock(e.target.value)} placeholder="Enter quantity"/>
              </label>
            </div>

            {/* AI Price Suggest Button */}
            <button 
              type="button"
              onClick={suggestAiPrice}
              disabled={busy}
              style={{display:'flex',alignItems:'center',gap:6,background:'#fff8e6',border:'1px solid #f0c060',color:'#8a6200',borderRadius:10,padding:'8px 14px',fontSize:12,fontWeight:700,cursor:'pointer'}}
            >
              <TrendingUp size={14}/> {busy && aiStatus === 'Calculating fair price...' ? 'Calculating...' : '💰 AI Fair Price Suggestion'}
            </button>

            <label>Craft Story & Description *
              <textarea 
                value={description} 
                onChange={e => setDescription(e.target.value.slice(0, 500))} 
                rows="4" 
                placeholder="Share the story behind your craft, materials used, and what makes it special..."
                style={{borderColor: isListeningStory ? '#22c55e' : undefined, background: isListeningStory ? '#f0fdf4' : '#fff'}}
              />
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2}}>
                {isListeningStory ? (
                  <span style={{fontSize: 11, color: '#16a34a', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4}}>
                    <span className="ai-pulse-dot" style={{background: '#ef4444'}}/> 🎙️ Listening to your voice... Speak now!
                  </span>
                ) : (
                  <span style={{fontSize: 11, color: '#64748b'}}>AI & Voice will auto-fill and polish this story</span>
                )}
                <span style={{fontSize: 10, color: '#889'}}>{description.length}/500</span>
              </div>
            </label>

            {/* AI Generate Story & Voice Buttons */}
            <div style={{display: 'flex', gap: 8, flexDirection: 'column'}}>
              <button 
                type="button"
                onClick={generateAiStory}
                disabled={busy}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  background: 'linear-gradient(135deg, #4834d4, #6c5ce7)', color: '#fff',
                  border: 'none', borderRadius: 10, padding: '10px 14px', fontSize: 13,
                  fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(108,92,231,0.25)',
                  transition: '.15s'
                }}
              >
                <Sparkles size={15}/> {busy && aiStatus === 'Generating rich AI craft story...' ? '🤖 AI is writing story...' : '✨ ✍️ Generate AI Craft Story'}
              </button>

              <button
                type="button"
                onClick={startVoiceStory}
                disabled={busy}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  background: isListeningStory ? '#fee2e2' : '#eaf8f4',
                  border: isListeningStory ? '1px solid #ef4444' : '1px solid #9bd8c8',
                  color: isListeningStory ? '#b91c1c' : '#155b48',
                  borderRadius: 10, padding: '10px 14px', fontSize: 13,
                  fontWeight: 700, cursor: 'pointer', transition: '.15s'
                }}
              >
                <Mic size={15}/> {isListeningStory ? '🔴 Stop Listening (Click to Finish)' : '🎙️ Speak Product Story (Voice to Text & AI)'}
              </button>
            </div>

            <label>Tags (comma separated)
              <input value={tags} onChange={e => setTags(e.target.value)} placeholder="e.g. terracotta, handmade, eco-friendly"/>
            </label>
          </div>
        </div>

        {/* COLUMN 3: LIVE MARKETPLACE PRODUCT PREVIEW */}
        <div className="publish-card">
          <div className="publish-card-title">
            <ShoppingBag size={18}/> Product Preview
          </div>
          <span style={{fontSize: 11, color: '#667'}}>See how your product will look on the marketplace.</span>

          {/* Main Photo Preview */}
          <div className="preview-img-box">
            <img src={currentPreviewImage} alt="Product Preview"/>
            <div className="preview-ai-badge">
              <Sparkles size={11}/> AI Enhanced
            </div>
          </div>

          {/* Thumbnails Gallery */}
          <div className="preview-thumbnails">
            <div className="preview-thumb"><img src={currentPreviewImage} alt="Thumb 1"/></div>
            <div className="preview-thumb"><img src={currentPreviewImage} alt="Thumb 2"/></div>
            <div className="preview-thumb"><img src={currentPreviewImage} alt="Thumb 3"/></div>
            <div className="preview-thumb-more">+ More Photos</div>
          </div>

          {/* Title & Category Tag */}
          <div>
            <div className="preview-title-price">
              <h4>{name || 'Terracotta Diya Lamp'}</h4>
            </div>
            <span className="preview-category-pill">{category || 'Handicrafts'}</span>
          </div>

          {/* Price & Stock Status */}
          <div style={{display: 'flex', alignItems: 'center', gap: 6}}>
            <span className="preview-price-tag">₹ {price || '450'}</span>
            <span className="stock-badge-green">🟢 In Stock ({stock || '10'})</span>
          </div>

          {/* Description snippet */}
          <p style={{fontSize: 12, color: '#667', margin: 0, lineHeight: 1.4}}>
            {description || 'Handcrafted terracotta diya made with traditional techniques. Perfect for home decor and festivals.'}
          </p>

          {/* PROMINENT PUBLISH BUTTON */}
          <button 
            className="btn-publish-green"
            disabled={publishing}
            onClick={publishProduct}
          >
            <Send size={16}/> {publishing ? 'Publishing...' : '🚀 Publish to Marketplace →'}
          </button>
        </div>

      </div>
    </div>
  );
}

function Orders({ user }) {
  const [orders, setOrders] = useState([]);
  useEffect(() => { api('/orders').then(d => setOrders(d.orders)).catch(() => {}); }, []);
  return (
    <main className="page">
      <span className="eyebrow">Commerce</span>
      <h1>Orders & fulfillment</h1>
      <p className="muted">Secure order status and transparent transaction records.</p>
      {orders.length ? (
        <div className="orders">
          {orders.map(o => (
            <div className="order" key={o.id}>
              <div><b>#{o.id.slice(0,8)}</b><span>{new Date(o.createdAt).toLocaleDateString()}</span></div>
              <div><span>{o.items.length} item(s)</span><strong>{money(o.total)}</strong></div>
              <div className="status">{o.status}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty">
          <Package size={42}/>
          <h2>No orders yet</h2>
          <p>Your order history will appear here when you place an order.</p>
        </div>
      )}
    </main>
  );
}

function Cart({ cart, setCart, user, setPage, setToast }) {
  const total = cart.reduce((s, p) => s + p.price, 0);
  const checkout = async () => {
    if (!user || !localStorage.getItem('artisanai_token')) { setToast('Please login to place an order'); setPage('login'); return; }
    try {
      await api('/orders', { method: 'POST', body: JSON.stringify({ items: cart.map(p => ({ productId: p.id, qty: 1 })), address: { city: 'Demo' } }) });
      setCart([]);
      setToast('Order placed securely');
      setPage('orders');
    } catch (e) {
      setToast(e.message);
    }
  };
  return (
    <main className="page">
      <span className="eyebrow">Your bag</span>
      <h1>Shopping cart</h1>
      {cart.length ? (
        <>
          <div className="cart-list">
            {cart.map((p, i) => (
              <div className="cart-item" key={i}>
                <img src={p.image || "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=150&q=80"} alt={p.name}/>
                <div><b>{p.name}</b><span>{p.category || 'Handicraft'}</span></div>
                <strong>{money(p.price)}</strong>
                <button onClick={() => setCart(c => c.filter((_, j) => j !== i))}>Remove</button>
              </div>
            ))}
          </div>
          <div className="checkout">
            <span>Total <b>{money(total)}</b></span>
            <button className="primary" onClick={checkout}>Place secure demo order <ArrowRight size={16}/></button>
          </div>
        </>
      ) : (
        <div className="empty">
          <ShoppingBag size={42}/>
          <h2>Your cart is empty</h2>
          <p>Discover a handmade product and support direct artisan commerce.</p>
        </div>
      )}
    </main>
  );
}

function Auth({ mode, onSuccess, switchMode }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'customer', phone: '', language: 'Tamil' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async e => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const d = await api(`/auth/${mode === 'login' ? 'login' : 'register'}`, { method: 'POST', body: JSON.stringify(form) });
      onSuccess(d.user, d.token);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="auth">
      <div className="auth-card">
        <div className="auth-side">
          <div className="logo big"><Sparkles/></div>
          <h1>{mode === 'login' ? 'Welcome back.' : 'Start your digital journey.'}</h1>
          <p>Secure, AI-first commerce built for artisans and the people who support them.</p>
        </div>
        <form onSubmit={submit} className="form">
          <span className="eyebrow">{mode === 'login' ? 'Secure sign in' : 'Create account'}</span>
          <h2>{mode === 'login' ? 'Login to ArtisanAI' : 'Join ArtisanAI'}</h2>
          {mode === 'register' && (
            <>
              <label>Full name<input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}/></label>
              <label>I am a<select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}><option value="artisan">Artisan / Seller</option><option value="customer">Customer</option><option value="b2b">B2B Buyer</option></select></label>
            </>
          )}
          <label>Email<input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}/></label>
          <label>Password<input type="password" minLength="8" required value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}/></label>
          {error && <div className="error">{error}</div>}
          <button className="primary full" disabled={busy}>{busy ? 'Please wait...' : mode === 'login' ? 'Login securely' : 'Create secure account'} <ArrowRight size={17}/></button>
          <p className="switch">{mode === 'login' ? "Don't have an account?" : "Already have an account?"} <button type="button" onClick={switchMode}>{mode === 'login' ? 'Register' : 'Login'}</button></p>
        </form>
      </div>
    </main>
  );
}

function Security({ user }) {
  return (
    <main className="page">
      <span className="eyebrow">Account protection</span>
      <h1>Security & privacy</h1>
      <div className="security-grid">
        <div className="panel">
          <Lock size={24}/>
          <h2>Secure account</h2>
          <p>Passwords are hashed on the server. API access uses short-lived signed sessions and role-based authorization.</p>
        </div>
      </div>
    </main>
  );
}

function B2B() {
  return (
    <main className="page">
      <div className="b2b-hero">
        <div>
          <span className="eyebrow">AI Market Linkage</span>
          <h1>Source handmade at scale.</h1>
          <p>Connect hotels, retailers, corporate gifting teams and institutions directly with verified artisan capacity.</p>
        </div>
      </div>
    </main>
  );
}

/* ==========================================================================
   MOBILE BOTTOM NAVIGATION BAR
   ========================================================================== */
function MobileBottomBar({ mode, page, setPage, setAiHubOpen }) {
  return (
    <div className="mobile-bottom-bar">
      {mode === 'seller' ? (
        <>
          <button className={page === 'home' ? 'active' : ''} onClick={() => setPage('home')}><Store size={18}/> Home</button>
          <button onClick={() => setPage('studio')}><Package size={18}/> Catalog</button>
          <button className="btn-add-circle" onClick={() => setAiHubOpen(true)}><Sparkles size={22}/></button>
          <button onClick={() => setPage('orders')}><MessageCircle size={18}/> Enquiries</button>
          <button onClick={() => setPage('security')}><Lock size={18}/> Profile</button>
        </>
      ) : (
        <>
          <button className={page === 'home' ? 'active' : ''} onClick={() => setPage('home')}><Store size={18}/> Home</button>
          <button onClick={() => setPage('home')}><ShoppingBag size={18}/> Categories</button>
          <button onClick={() => setPage('home')}><Heart size={18}/> Favorites</button>
          <button onClick={() => setPage('orders')}><Package size={18}/> Orders</button>
          <button onClick={() => setPage('security')}><Lock size={18}/> Profile</button>
        </>
      )}
    </div>
  );
}

/* ==========================================================================
   FOOTER (DARK GREEN)
   ========================================================================== */
function Footer() {
  return (
    <footer className="footer-dark">
      <div className="footer-content">
        <div className="brand-logo" style={{color: '#fff'}}>
          <div className="brand-icon" style={{background:'#fff', color: '#155b48'}}><Sparkles size={19}/></div>
          CraftBridge <span style={{color: '#efb84b'}}>ArtisanAI</span>
        </div>

        <div className="footer-links">
          <span>Home</span>
          <span>Shop</span>
          <span>Artisans</span>
          <span>Catalog</span>
          <span>About</span>
          <span>Contact</span>
        </div>
      </div>
      <div style={{textAlign: 'center', fontSize: 12, opacity: 0.6, marginTop: 20}}>
        © 2026 CraftBridge ArtisanAI. All rights reserved.
      </div>
    </footer>
  );
}

/* ==========================================================================
   AI MODALS & COMMAND CENTER
   ========================================================================== */
function AISearchModal({ initial, close, onResults }) {
  const [q, setQ] = useState(initial || '');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const run = async (queryText = q) => {
    const text = (queryText || q).trim();
    if (!text) return;
    setLoading(true); 
    setStatus('AI is understanding your request and filtering authentic crafts...');
    setError('');
    try {
      const d = await api('/ai/search', { method: 'POST', body: JSON.stringify({ query: text }) });
      const count = d.products?.length || 0;
      setStatus(`✨ AI Search: Found ${count} matching handcrafted items!`);
      if (d.products && d.products.length > 0) {
        onResults(d.products);
      } else {
        setStatus('No exact matches found. Showing all authentic products.');
        const all = await api('/products');
        onResults(all.products || []);
      }
      setTimeout(() => close(), 800);
    } catch (e) {
      console.warn('AI search error, using client-side matching:', e);
      try {
        const all = await api('/products');
        const needle = text.toLowerCase();
        const matched = (all.products || []).filter(p => 
          [p.name, p.category, p.description, ...(p.tags || [])].join(' ').toLowerCase().includes(needle)
        );
        setStatus(`Found ${matched.length || all.products?.length || 0} items.`);
        onResults(matched.length > 0 ? matched : (all.products || []));
        setTimeout(() => close(), 800);
      } catch (err) {
        setError('Unable to load products. Please check if the server is running.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="overlay">
      <div className="modal ai-search-modal">
        <button className="close" onClick={close}><X/></button>
        <div className="ai-orb"><Sparkles/></div>
        <span className="eyebrow">AI Natural Language Search</span>
        <h2>Tell me what you need</h2>
        <p>Search by occasion, material, budget, or craft tradition. E.g. “eco-friendly wedding gift under ₹1500” or “terracotta decor”.</p>
        <textarea 
          autoFocus 
          value={q} 
          onChange={e => setQ(e.target.value)} 
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); run(); } }}
          placeholder="I need a handmade gift under ₹1000..."
        />
        <div className="chips">
          <button onClick={() => { setQ('handmade gift under ₹1000'); run('handmade gift under ₹1000'); }}>🎁 Gift under ₹1000</button>
          <button onClick={() => { setQ('eco-friendly bamboo basket'); run('eco-friendly bamboo basket'); }}>🌿 Bamboo Craft</button>
          <button onClick={() => { setQ('terracotta home decor'); run('terracotta home decor'); }}>🏺 Terracotta</button>
          <button onClick={() => { setQ('handloom cotton textile'); run('handloom cotton textile'); }}>🧵 Handloom</button>
          <button onClick={() => { setQ('traditional brass bell'); run('traditional brass bell'); }}>🔔 Brass Craft</button>
        </div>
        {status && <div className="ai-inline-status">{status}</div>}
        {error && (
          <div style={{color: '#b91c1c', background: '#fee2e2', padding: '8px 12px', borderRadius: 8, fontSize: 12, marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <span>{error}</span>
            <button onClick={() => run()} style={{fontWeight: 700, textDecoration: 'underline'}}>Retry</button>
          </div>
        )}
        <button className="primary full" disabled={loading || !q.trim()} onClick={() => run()}>
          {loading ? 'AI is searching...' : 'Ask AI to find crafts'} <Sparkles size={17}/>
        </button>
      </div>
    </div>
  );
}

function VoiceAssistant({ open, setOpen, purpose = 'general', setPurpose, onDescription, setQ, setPage, setSearchMode, setMode }) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [message, setMessage] = useState('Ask me to find a product, open your seller tools, or speak a craft story.');
  const supported = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const speak = (text) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-IN';
      u.rate = 0.95;
      window.speechSynthesis.speak(u);
    }
  };

  const createDescription = async (text) => {
    setMessage('Creating AI product description from your voice...');
    try {
      const data = await api('/ai/generate-description', {
        method: 'POST',
        body: JSON.stringify({ name: 'Handcrafted Product', category: 'Handicrafts', material: 'Traditional materials', story: text })
      });
      const description = data.result?.detailedDescription;
      if (!description) throw new Error('AI returned an empty description.');
      onDescription?.(description);
      setMessage('✨ Your product description is ready and copied into your studio form!');
      speak('Your product description is ready and added to the listing form.');
      setTimeout(() => setOpen(false), 1500);
    } catch (error) {
      setMessage(error.message || 'Could not create the description. Please try again.');
      speak('Could not create description. Please try again.');
    } finally {
      setPurpose?.('general');
    }
  };

  const listen = () => {
    if (!supported) {
      setMessage('Voice input is not supported in this browser. Try Chrome or Edge.');
      return;
    }
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new Recognition();
    recognition.lang = 'en-IN';
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onstart = () => setListening(true);
    recognition.onresult = e => {
      const text = e.results[0][0].transcript;
      setTranscript(text);
      if (purpose === 'description') {
        createDescription(text);
        return;
      }
      const lower = text.toLowerCase();
      let reply = `I heard: "${text}"`;
      if (lower.includes('dashboard') || lower.includes('sell') || lower.includes('seller') || lower.includes('artisan')) {
        setMode?.('seller'); 
        setPage('home'); 
        reply = 'Opening your Artisan Seller Workspace.';
      } else if (lower.includes('studio') || lower.includes('photo') || lower.includes('image') || lower.includes('enhance')) {
        setPage('studio'); 
        reply = 'Opening the AI Photo Studio & Product Publisher.';
      } else {
        setQ(text);
        setSearchMode(true);
        reply = `Searching the ArtisanAI marketplace for "${text}"...`;
      }
      setMessage(reply);
      speak(reply);
    };
    recognition.onerror = () => {
      setMessage('Could not catch your voice. Please tap the button and try again.');
      setListening(false);
    };
    recognition.onend = () => setListening(false);
    recognition.start();
  };

  return (
    <>
      {open && (
        <div className="overlay" onClick={() => setOpen(false)}>
          <div className="voice-panel" onClick={e => e.stopPropagation()}>
            <div className="voice-panel-head">
              <div className="voice-icon"><Volume2 size={18}/></div>
              <div>
                <b>ArtisanAI Voice Assistant</b>
                <small>Hands-free navigation & voice cataloging</small>
              </div>
              <button className="close" onClick={() => setOpen(false)}><X size={18}/></button>
            </div>
            <div className={`voice-wave ${listening ? 'is-listening' : ''}`}>
              <span/><span/><span/><span/><span/>
            </div>
            <p className="voice-message">{message}</p>
            {transcript && <div className="voice-transcript"><Mic size={14}/> {transcript}</div>}
            <div className="voice-controls">
              <button className="primary full" onClick={listen}>
                <Mic size={17}/> {listening ? 'Listening...' : purpose === 'description' ? '🎙️ Speak product story' : 'Tap to speak'}
              </button>
              <button className="ghost" onClick={() => speak(message)} title="Read aloud">
                <Volume2 size={17}/>
              </button>
            </div>
            <div className="voice-suggestions">
              <button onClick={() => { setQ('handmade gift under ₹1000'); setSearchMode(true); setOpen(false); }}>🎁 Find gift</button>
              <button onClick={() => { setPage('studio'); setPurpose?.('general'); setOpen(false); }}>🖼️ Open AI Studio</button>
              <button onClick={() => { setMode?.('seller'); setPage('home'); setPurpose?.('general'); setOpen(false); }}>📊 Seller tools</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function AICommandCenter({ open, setOpen, setPage, setSearchMode, setVoiceOpen }) {
  const [name, setName] = useState('Handwoven Bamboo Fruit Basket');
  const [material, setMaterial] = useState('Natural seasoned bamboo');
  const [category, setCategory] = useState('Bamboo Craft');
  const [cost, setCost] = useState('250');
  const [hours, setHours] = useState('4');
  const [language, setLanguage] = useState('Tamil');
  const [query, setQuery] = useState('How can I increase sales for my handmade terracotta items?');
  const [imageFile, setImageFile] = useState(null);
  const [result, setResult] = useState(null);
  const [activeTab, setActiveTab] = useState('description');
  const [busy, setBusy] = useState('');

  const speakText = (text) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-IN';
      u.rate = 0.95;
      window.speechSynthesis.speak(u);
    }
  };

  const copyToClipboard = (text) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(typeof text === 'string' ? text : JSON.stringify(text, null, 2));
    }
  };

  const run = async (action) => {
    setBusy(action);
    setActiveTab(action);
    setResult(null);
    try {
      let data;
      if (action === 'description') {
        data = await api('/ai/generate-description', {
          method: 'POST',
          body: JSON.stringify({ name, material, category, story: `${name} crafted with care using traditional ${material}.` })
        });
        setResult({ type: 'description', data: data?.result });
      } else if (action === 'price') {
        data = await api('/ai/suggest-price', {
          method: 'POST',
          body: JSON.stringify({ cost: Number(cost) || 250, hours: Number(hours) || 4, demand: 'normal', category, material })
        });
        setResult({ type: 'price', data: data?.result });
      } else if (action === 'marketing') {
        data = await api('/ai/marketing', {
          method: 'POST',
          body: JSON.stringify({ name, price: (Number(cost) || 250) * 2, category, material, description: `${name} made of ${material}` })
        });
        setResult({ type: 'marketing', data: data?.result });
      } else if (action === 'tags') {
        data = await api('/ai/generate-tags', {
          method: 'POST',
          body: JSON.stringify({ category, material })
        });
        setResult({ type: 'tags', data: data?.tags });
      } else if (action === 'translate') {
        data = await api('/ai/translate', {
          method: 'POST',
          body: JSON.stringify({ text: `${name} is an authentic handmade ${category} crafted with ${material}.`, language })
        });
        setResult({ type: 'translate', data: { original: `${name} is an authentic handmade ${category} crafted with ${material}.`, translated: data?.result, language } });
      } else if (action === 'insight') {
        data = await api('/ai/insight');
        setResult({ type: 'insight', data: data?.insight });
      } else if (action === 'customer') {
        data = await api('/ai/customer-assistant', {
          method: 'POST',
          body: JSON.stringify({ query: query || 'handmade gift', preferences: { category } })
        });
        setResult({ type: 'customer', data });
      } else if (action === 'image-analysis') {
        if (!imageFile) {
          throw new Error('Please choose a product photo to analyze first.');
        }
        const form = new FormData();
        form.append('image', imageFile);
        form.append('name', name);
        form.append('category', category);
        form.append('material', material);
        const token = localStorage.getItem('artisanai_token');
        const headers = {};
        if (token) headers.Authorization = `Bearer ${token}`;
        const res = await fetch(`${API}/ai/analyze-image`, { method: 'POST', headers, body: form });
        const resData = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(resData.message || 'Image analysis failed');
        setResult({ type: 'image-analysis', data: resData?.result });
      } else if (action === 'chat') {
        data = await api('/ai/chat', {
          method: 'POST',
          body: JSON.stringify({ message: query })
        });
        setResult({ type: 'chat', data: data?.reply });
      }
    } catch (e) {
      setResult({ type: 'error', data: e.message || 'AI service error', failedAction: action });
    } finally {
      setBusy('');
    }
  };

  return (
    <>
      {open && (
        <div className="overlay" onClick={() => setOpen(false)}>
          <aside className="ai-hub ai-hub-expanded" onClick={e => e.stopPropagation()}>
            <div className="ai-hub-head">
              <div>
                <span className="eyebrow">ArtisanAI Intelligence Suite</span>
                <h2>One AI team for every craft task</h2>
                <small className="ai-hub-subtitle">Powered by Google Gemini 2.5 + Instant Local Heuristics</small>
              </div>
              <button className="close" onClick={() => setOpen(false)}><X size={18}/></button>
            </div>

            <div className="ai-hub-actions ai-tool-grid">
              <button onClick={() => { setSearchMode(true); setOpen(false); }}><Search size={15}/> AI Search</button>
              <button onClick={() => { setVoiceOpen(true); setOpen(false); }}><Mic size={15}/> Voice AI</button>
              <button onClick={() => { setPage('studio'); setOpen(false); }}><ImagePlus size={15}/> Photo Studio</button>
            </div>

            <div className="ai-hub-form">
              <div className="ai-hub-fields">
                <label>Product name
                  <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Bamboo Basket"/>
                </label>
                <label>Material
                  <input value={material} onChange={e => setMaterial(e.target.value)} placeholder="e.g. Seasoned Bamboo"/>
                </label>
              </div>

              <div className="ai-hub-fields">
                <label>Category
                  <select value={category} onChange={e => setCategory(e.target.value)}>
                    <option value="Bamboo Craft">Bamboo Craft</option>
                    <option value="Terracotta">Terracotta</option>
                    <option value="Handloom">Handloom</option>
                    <option value="Woodcraft">Woodcraft</option>
                    <option value="Metal Craft">Metal Craft</option>
                    <option value="Paintings">Paintings</option>
                    <option value="Jewellery">Jewellery</option>
                    <option value="Home Decor">Home Decor</option>
                  </select>
                </label>
                <label>Target Language
                  <select value={language} onChange={e => setLanguage(e.target.value)}>
                    <option value="Tamil">Tamil (தமிழ்)</option>
                    <option value="Hindi">Hindi (हिंदी)</option>
                    <option value="Telugu">Telugu (తెలుగు)</option>
                    <option value="Malayalam">Malayalam (മലയാളം)</option>
                    <option value="Kannada">Kannada (ಕನ್ನಡ)</option>
                    <option value="Marathi">Marathi (मराठी)</option>
                    <option value="Bengali">Bengali (বাংলা)</option>
                    <option value="English">English</option>
                  </select>
                </label>
              </div>

              <div className="ai-hub-fields">
                <label>Material cost (₹)
                  <input type="number" value={cost} onChange={e => setCost(e.target.value)} placeholder="250"/>
                </label>
                <label>Crafting hours
                  <input type="number" value={hours} onChange={e => setHours(e.target.value)} placeholder="4"/>
                </label>
              </div>

              <label>AI Question / Story prompt
                <input value={query} onChange={e => setQuery(e.target.value)} placeholder="e.g. Handmade for wedding gift / Pongal festival special..." />
              </label>

              <label>Product photo (for Vision AI analysis)
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setImageFile(f);
                    }
                  }} 
                />
              </label>
            </div>

            <div className="ai-feature-buttons">
              {[
                { id: 'description', label: '✍️ Description' },
                { id: 'price', label: '💰 Fair Price' },
                { id: 'marketing', label: '📣 Marketing' },
                { id: 'image-analysis', label: '🔍 Vision AI' },
                { id: 'customer', label: '🛍️ Shopping Guide' },
                { id: 'tags', label: '🏷️ Tags' },
                { id: 'translate', label: '🌐 Translate' },
                { id: 'insight', label: '📊 Business Tip' },
                { id: 'chat', label: '💬 Chat' }
              ].map(tab => (
                <button 
                  key={tab.id} 
                  disabled={!!busy} 
                  className={activeTab === tab.id ? 'active' : ''} 
                  onClick={() => run(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {busy && (
              <div className="ai-status">
                <span className="ai-pulse-dot" />
                <span>AI is crafting {busy}...</span>
              </div>
            )}

            {result && (
              <div className={`ai-result ${result.type === 'error' ? 'error' : ''}`}>
                <div className="ai-result-head">
                  <span style={{fontWeight: 700}}>✨ AI Result ({result.type})</span>
                  <div style={{display: 'flex', gap: 6}}>
                    {typeof result.data === 'string' && (
                      <button onClick={() => speakText(result.data)} title="Listen to AI result">🔊 Listen</button>
                    )}
                    {result.data?.translated && (
                      <button onClick={() => speakText(result.data.translated)} title="Listen to AI result">🔊 Listen</button>
                    )}
                    <button onClick={() => copyToClipboard(result.data)}>📋 Copy</button>
                  </div>
                </div>

                <div className="ai-result-content">
                  {/* 1. DESCRIPTION RESULT */}
                  {result.type === 'description' && (
                    <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
                      <div style={{fontWeight: 700, color: '#155b48'}}>{result.data.title || name}</div>
                      <p style={{margin: 0, fontSize: 13, lineHeight: 1.5}}>{result.data.shortDescription || result.data.detailedDescription}</p>
                      {result.data.careInstructions && (
                        <div style={{fontSize: 11, background: '#f0fdf4', padding: '6px 10px', borderRadius: 8, border: '1px solid #bbf7d0'}}>
                          🧼 <b>Care:</b> {result.data.careInstructions}
                        </div>
                      )}
                      {result.data.tags && (
                        <div className="chips">
                          {result.data.tags.map((t, idx) => (
                            <button key={idx} onClick={() => copyToClipboard(t)}>#{t}</button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 2. PRICE RESULT */}
                  {result.type === 'price' && (
                    <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
                      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, textAlign: 'center'}}>
                        <div style={{background: '#f8fafc', padding: 8, borderRadius: 8, border: '1px solid #e2e8f0'}}>
                          <small style={{color: '#64748b'}}>Min Safe</small>
                          <div style={{fontWeight: 700, color: '#0f172a'}}>₹{result.data.minimumPrice}</div>
                        </div>
                        <div style={{background: '#ecfdf5', padding: 8, borderRadius: 8, border: '1px solid #a7f3d0'}}>
                          <small style={{color: '#047857'}}>Suggested Fair</small>
                          <div style={{fontWeight: 700, fontSize: 16, color: '#065f46'}}>₹{result.data.suggestedPrice}</div>
                        </div>
                        <div style={{background: '#fdf4ff', padding: 8, borderRadius: 8, border: '1px solid #f5d0fe'}}>
                          <small style={{color: '#86198f'}}>Boutique Premium</small>
                          <div style={{fontWeight: 700, color: '#701a75'}}>₹{result.data.premiumPrice}</div>
                        </div>
                      </div>
                      <p style={{margin: '4px 0 0', fontSize: 12, color: '#334155'}}>{result.data.reason || result.data.explanation}</p>
                    </div>
                  )}

                  {/* 3. MARKETING RESULT */}
                  {result.type === 'marketing' && (
                    <div style={{display: 'flex', flexDirection: 'column', gap: 10}}>
                      {result.data.whatsapp && (
                        <div>
                          <b style={{fontSize: 11, color: '#15803d'}}>📱 WhatsApp Broadcast:</b>
                          <pre style={{marginTop: 4, background: '#f0fdf4', border: '1px solid #bbf7d0', padding: 8, borderRadius: 8}}>{result.data.whatsapp}</pre>
                        </div>
                      )}
                      {result.data.instagram && (
                        <div>
                          <b style={{fontSize: 11, color: '#c026d3'}}>📸 Instagram Caption:</b>
                          <pre style={{marginTop: 4, background: '#fdf4ff', border: '1px solid #f5d0fe', padding: 8, borderRadius: 8}}>{result.data.instagram}</pre>
                        </div>
                      )}
                      {result.data.reelScript && (
                        <div>
                          <b style={{fontSize: 11, color: '#2563eb'}}>🎬 Video Reel Script:</b>
                          <pre style={{marginTop: 4, background: '#eff6ff', border: '1px solid #bfdbfe', padding: 8, borderRadius: 8}}>{result.data.reelScript}</pre>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 4. VISION / IMAGE ANALYSIS RESULT */}
                  {result.type === 'image-analysis' && (
                    <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
                      <div style={{fontWeight: 700, color: '#155b48'}}>{result.data.name || 'Craft Analysis'}</div>
                      <p style={{margin: 0, fontSize: 13}}>{result.data.visualDescription || result.data.description}</p>
                      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12}}>
                        <div>🌿 <b>Material:</b> {result.data.possibleMaterial || result.data.material || 'Natural handmade'}</div>
                        <div>🏷️ <b>Category:</b> {result.data.craftCategory || result.data.category || category}</div>
                      </div>
                      {result.data.suggestedTags && (
                        <div className="chips">
                          {result.data.suggestedTags.map((t, idx) => (
                            <button key={idx}>#{t}</button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 5. CUSTOMER SHOPPING ASSISTANT RESULT */}
                  {result.type === 'customer' && (
                    <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
                      <p style={{margin: 0, fontSize: 13, lineHeight: 1.5}}>{result.data.recommendation}</p>
                      {result.data.suggestedCategories && (
                        <div className="chips">
                          {result.data.suggestedCategories.map((c, idx) => (
                            <button key={idx} onClick={() => { setCategory(c); run('customer'); }}>🛍️ {c}</button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 6. TRANSLATE RESULT */}
                  {result.type === 'translate' && (
                    <div>
                      <p style={{fontSize: 14, fontWeight: 600, color: '#155b48', margin: '0 0 8px'}}>{result.data?.translated || String(result.data)}</p>
                      <small style={{color: '#64748b'}}>Translated accurately to {language}</small>
                    </div>
                  )}

                  {/* 7. BUSINESS TIP RESULT */}
                  {result.type === 'insight' && (
                    <div style={{background: '#fffbeb', border: '1px solid #fde68a', padding: 10, borderRadius: 8}}>
                      <div style={{fontSize: 11, fontWeight: 700, color: '#b45309', marginBottom: 4}}>💡 SIMULATED BUSINESS ADVISOR</div>
                      <p style={{margin: 0, fontSize: 13, color: '#78350f'}}>{String(result.data)}</p>
                    </div>
                  )}

                  {/* 8. TAGS RESULT */}
                  {result.type === 'tags' && Array.isArray(result.data) && (
                    <div className="chips">
                      {result.data.map((tag, idx) => (
                        <button key={idx} onClick={() => copyToClipboard(tag)}>#{tag}</button>
                      ))}
                    </div>
                  )}

                  {/* 9. CHAT RESULT */}
                  {result.type === 'chat' && (
                    <p style={{margin: 0, fontSize: 13, lineHeight: 1.5}}>{String(result.data)}</p>
                  )}

                  {/* 10. ERROR RESULT */}
                  {result.type === 'error' && (
                    <div style={{color: '#b91c1c'}}>
                      <p style={{margin: '0 0 8px', fontSize: 13}}>{String(result.data)}</p>
                      {result.failedAction && (
                        <button 
                          onClick={() => run(result.failedAction)}
                          style={{background: '#fee2e2', border: '1px solid #ef4444', color: '#b91c1c', borderRadius: 6, padding: '4px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer'}}
                        >
                          🔄 Try Again
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </aside>
        </div>
      )}
    </>
  );
}

// Mount the React application into the page.
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('ArtisanAI: #root element was not found in client/index.html');
}
createRoot(rootElement).render(<App />);

