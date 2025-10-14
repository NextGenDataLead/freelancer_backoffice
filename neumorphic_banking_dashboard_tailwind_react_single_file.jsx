import React from "react";

// Single‑file React component that mimics the dark, glossy banking dashboard style.
// Tailwind only. Drop into a Next.js/CRA/Vite project that has Tailwind configured.
// Exported as default so the canvas can render it directly.

const cx = (...cls) => cls.filter(Boolean).join(" ");

function Sidebar() {
  const Item = ({ children, active = false }) => (
    <button
      className={cx(
        "w-12 h-12 grid place-items-center rounded-2xl transition-all",
        active
          ? "bg-white/10 ring-1 ring-white/15 text-white"
          : "text-slate-300/70 hover:bg-white/5 hover:text-white"
      )}
      aria-label={typeof children === "string" ? children : undefined}
    >
      {children}
    </button>
  );

  return (
    <aside className="hidden md:flex flex-col gap-3 p-3 pr-2">
      <div className="w-12 h-12 rounded-2xl grid place-items-center bg-gradient-to-br from-indigo-400/90 to-sky-400/90 text-slate-900 font-black shadow-lg shadow-sky-900/30">n</div>
      <div className="flex flex-col gap-2 mt-2">
        <Item active>🏠</Item>
        <Item>📑</Item>
        <Item>💳</Item>
        <Item>👥</Item>
        <Item>⚙️</Item>
      </div>
    </aside>
  );
}

function Header() {
  return (
    <header className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="md:hidden w-10 h-10 rounded-2xl grid place-items-center bg-white/10">☰</div>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-white drop-shadow-sm">Dashboard</h1>
        <div className="hidden sm:flex ml-4 bg-white/5 border border-white/10 rounded-2xl px-3 py-2 items-center gap-2 text-slate-300">
          <span className="text-slate-400">🔎</span>
          <input placeholder="Search" className="bg-transparent outline-none placeholder:text-slate-500 w-48" />
        </div>
        <div className="hidden md:flex ml-2 bg-white/10 border border-white/10 rounded-full px-4 py-2 text-slate-200/90">
          <span className="mr-2 text-xs bg-emerald-400/20 text-emerald-300 rounded-full px-2 py-0.5 border border-emerald-400/30">⚡</span>
          8+ Space
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button className="hidden sm:flex bg-white/10 hover:bg-white/15 border border-white/10 rounded-2xl px-4 py-2 text-slate-200 gap-2 items-center transition-colors">
          <span>Customize dashboard</span>
          <span className="text-slate-400">⋯</span>
        </button>
        <button className="hidden sm:flex bg-white/10 hover:bg-white/15 border border-white/10 rounded-2xl px-4 py-2 text-slate-200">Download report</button>
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-2 py-1">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 shadow-inner" />
          <div className="leading-tight">
            <div className="text-slate-100 text-sm font-medium">Jack Dawson</div>
            <div className="text-slate-400 text-xs">@jack_dawson</div>
          </div>
          <div className="text-slate-400 pl-1">▾</div>
        </div>
      </div>
    </header>
  );
}

function GlassCard({ className = "", children, tone = "" }) {
  return (
    <div
      className={cx(
        "relative rounded-3xl p-5 md:p-6 bg-slate-900/60 border border-white/10 shadow-[0_10px_50px_-10px_rgba(0,0,0,.6)] backdrop-blur-xl",
        tone === "alt" && "bg-slate-900/50",
        className
      )}
    >
      {/* subtle stars */}
      <div className="pointer-events-none absolute inset-0 rounded-3xl" style={{
        background:
          "radial-gradient(600px 100px at 90% 10%, rgba(255,255,255,.06), transparent 60%), radial-gradient(400px 120px at 10% 90%, rgba(59,130,246,.15), transparent 60%)",
        maskImage:
          "radial-gradient(circle at 30% 20%, black 0%, black 50%, transparent 70%)"
      }} />
      <div className="relative z-[1]">{children}</div>
    </div>
  );
}

function TotalBalance() {
  return (
    <GlassCard className="col-span-12 lg:col-span-7">
      <div className="flex items-center justify-between">
        <h2 className="text-white text-xl font-semibold">Total Balance</h2>
        <div className="flex gap-2 text-slate-400 text-xs">
          {[
            "1 year",
            "6 month",
            "3 month",
            "1 month",
          ].map((x, i) => (
            <button
              key={x}
              className={cx(
                "px-3 py-1.5 rounded-full border",
                i === 1
                  ? "bg-white/10 text-white border-white/15"
                  : "bg-transparent border-white/10 hover:border-white/20"
              )}
            >
              {x}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="mt-6">
        <div className="h-56 w-full rounded-2xl bg-gradient-to-b from-white/5 to-transparent border border-white/10 p-3">
          <svg viewBox="0 0 700 220" className="w-full h-full">
            <defs>
              <linearGradient id="bars" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="rgba(255,255,255,.5)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0)" />
              </linearGradient>
              <linearGradient id="line" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#22c55e" />
                <stop offset="100%" stopColor="#34d399" />
              </linearGradient>
            </defs>
            {/* Bars */}
            {Array.from({ length: 12 }).map((_, i) => (
              <rect
                key={i}
                x={i * 55 + 25}
                y={40 + (i % 5) * 10}
                width={28}
                height={150 - (i % 5) * 10}
                rx={6}
                fill="url(#bars)"
                opacity={i < 7 ? 0.35 : 0.6}
              />
            ))}
            {/* Grid lines */}
            {Array.from({ length: 4 }).map((_, i) => (
              <line
                key={i}
                x1="0"
                x2="700"
                y1={50 + i * 40}
                y2={50 + i * 40}
                stroke="rgba(255,255,255,.08)"
              />
            ))}
            {/* Line */}
            <path
              d="M20,160 C100,150 150,120 210,140 C260,155 290,120 340,125 C390,130 430,110 470,120 C520,135 560,125 610,110"
              fill="none"
              stroke="url(#line)"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            {/* Tooltip mock */}
            <g transform="translate(240,95)">
              <rect x="-70" y="-32" width="140" height="48" rx="12" fill="white" opacity=".9" />
              <text x="0" y="-10" textAnchor="middle" className="fill-slate-800" style={{fontSize:12,fontWeight:600}}>
                21 Aug, 2024 ↗
              </text>
              <text x="0" y="10" textAnchor="middle" className="fill-slate-900" style={{fontSize:16,fontWeight:700}}>
                8,780.90 USD
              </text>
            </g>
          </svg>
        </div>
        <div className="flex items-center gap-6 mt-3 text-sm text-slate-400">
          <div>6 month average <span className="text-white ml-1">$8,000.00</span></div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-white/60 inline-block" />
            Available money
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block ml-4" />
            Actual balance
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

function MyCards() {
  return (
    <GlassCard className="col-span-12 lg:col-span-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-white text-xl font-semibold">My cards</h2>
        <button className="text-xs bg-white/10 border border-white/10 rounded-full px-3 py-1 text-slate-300 hover:text-white">+ Add new</button>
      </div>
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12">
          <div className="relative overflow-hidden rounded-3xl p-6 h-44 bg-gradient-to-br from-indigo-500 via-sky-600 to-blue-700 text-white border border-white/10">
            <div className="absolute inset-0 opacity-30" style={{background:"radial-gradient(120px 180px at 20% 30%, rgba(255,255,255,.5), transparent 60%), radial-gradient(160px 120px at 70% 60%, rgba(255,255,255,.3), transparent 60%)"}}/>
            <div className="relative z-10 flex items-start justify-between">
              <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-400/20 border border-emerald-400/40 text-emerald-200">Active</span>
              <div className="w-10 h-7 rounded-md bg-white/90" />
            </div>
            <div className="relative z-10 mt-6 text-4xl font-bold tracking-wide">$12,850.00</div>
            <div className="absolute right-6 bottom-6 w-10 h-10 rounded-full bg-white/90" />
          </div>
        </div>
        <div className="col-span-12 md:col-span-6">
          <div className="h-44 rounded-3xl grid place-items-center border border-white/10 bg-white/5 text-slate-400">
            <span className="text-sm">••• Locked</span>
          </div>
        </div>
        <div className="col-span-12 md:col-span-6">
          <div className="h-44 rounded-3xl grid place-items-center border border-white/10 bg-white/5 text-slate-400">
            <span className="text-sm">••• Locked</span>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

function RecentTransactions() {
  const rows = [
    {logo:"🟢", name:"Spotify", date:"17 Jan 2025, 02:00 PM", status:"Completed", type:"Subscription", sum:"$9.99"},
    {logo:"🟦", name:"App Store", date:"16 Jan 2025, 10:06", status:"Canceled", type:"Subscription", sum:"$4.99"},
    {logo:"🟢", name:"GreenGrocers", date:"16 Jan 2025, 02:00 PM", status:"Completed", type:"Groceries", sum:"$4.99"},
  ];
  const pill = (s) => (
    <span className={cx(
      "px-2.5 py-1 rounded-full text-xs border",
      s === "Completed" && "bg-emerald-400/15 text-emerald-300 border-emerald-400/30",
      s === "Canceled" && "bg-rose-400/15 text-rose-300 border-rose-400/30"
    )}>{s}</span>
  );
  return (
    <GlassCard className="col-span-12 lg:col-span-7">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white text-xl font-semibold">Recent transaction</h2>
        <div className="flex gap-2">
          <button className="text-xs bg-white/10 border border-white/10 rounded-full px-3 py-1 text-slate-300 hover:text-white">Sort ↑↓</button>
          <button className="text-xs bg-white/10 border border-white/10 rounded-full px-3 py-1 text-slate-300 hover:text-white">Month ▾</button>
        </div>
      </div>
      <div className="overflow-hidden rounded-2xl border border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-slate-400">
            <tr>
              <th className="text-left font-medium px-4 py-3">Transaction</th>
              <th className="text-left font-medium px-4 py-3">Status</th>
              <th className="text-left font-medium px-4 py-3">Type</th>
              <th className="text-right font-medium px-4 py-3">Sum</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {rows.map((r, i) => (
              <tr key={i} className="text-slate-200">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full grid place-items-center bg-white/10 text-lg">{r.logo}</div>
                    <div>
                      <div className="font-medium">{r.name}</div>
                      <div className="text-xs text-slate-400">{r.date}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">{pill(r.status)}</td>
                <td className="px-4 py-3 text-slate-300">{r.type}</td>
                <td className="px-4 py-3 text-right font-semibold">{r.sum}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
}

function Categories() {
  const cats = [
    { name: "Utility payments", amount: 1200 },
    { name: "Groceries", amount: 845 },
    { name: "Beauty and health", amount: 400 },
  ];
  return (
    <GlassCard className="col-span-12 lg:col-span-5">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-white text-xl font-semibold">Categories</h2>
        <button className="text-xs text-slate-300 hover:text-white">See all</button>
      </div>
      <div className="text-slate-300 text-sm">Spent 8,450.00 USD</div>
      <div className="h-2 mt-3 rounded-full bg-white/10 overflow-hidden">
        <div className="h-full w-2/3 bg-gradient-to-r from-sky-400 to-emerald-400" />
      </div>
      <div className="mt-4 space-y-2">
        {cats.map((c, i) => (
          <div key={c.name} className="flex items-center justify-between bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
            <div className="flex items-center gap-3">
              <span className={cx("w-2 h-2 rounded-full inline-block", i===0 && "bg-sky-400", i===1 && "bg-emerald-400", i===2 && "bg-yellow-300")}></span>
              <div className="text-slate-200">{c.name}</div>
            </div>
            <div className="text-slate-400">{c.amount}.00 USD →</div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}

function PromoCard() {
  return (
    <GlassCard className="col-span-12 lg:col-span-5 xl:col-span-4" tone="alt">
      <div className="h-full rounded-3xl border border-white/10 bg-gradient-to-b from-sky-900/30 to-indigo-900/20 p-6 flex flex-col items-center justify-between text-center">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-sky-400 to-indigo-400 shadow-2xl shadow-sky-900/40" />
        <div>
          <div className="text-white text-xl font-semibold">Revolutionize Your Banking with AI</div>
          <p className="text-slate-300 mt-2 text-sm">Leverage the power of AI to manage your finances more efficiently.</p>
        </div>
        <button className="mt-4 bg-white/10 hover:bg-white/15 border border-white/10 rounded-2xl px-4 py-2 text-slate-200">Customize dashboard</button>
      </div>
    </GlassCard>
  );
}

export default function BankingDashboard() {
  return (
    <div className="min-h-screen text-slate-200 bg-slate-950 relative">
      {/* dreamy background */}
      <div className="pointer-events-none fixed inset-0" style={{
        background:
          "radial-gradient(1000px 600px at -10% -10%, rgba(56,189,248,.15), transparent 60%), radial-gradient(800px 500px at 120% 20%, rgba(99,102,241,.18), transparent 60%), radial-gradient(800px 500px at 50% 120%, rgba(15,23,42,.9), rgba(2,6,23,1))"
      }} />

      <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-6 grid grid-cols-12 gap-4 md:gap-6">
        <div className="col-span-12 flex">
          <Sidebar />
          <div className="flex-1">
            <Header />
          </div>
        </div>

        {/* Main grid */}
        <TotalBalance />
        <MyCards />
        <RecentTransactions />
        <Categories />
        <PromoCard />
      </div>
    </div>
  );
}
