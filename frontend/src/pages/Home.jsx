import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Menu,
  X,
  Plus,
  Minus,
  ArrowRight,
  RotateCcw,
  Scissors,
  FileText,
  CreditCard,
  Percent,
  RefreshCw,
  BarChart2,
  Users,
} from 'lucide-react';

// Count-up hook for numbers
function useCountUp(endVal, duration = 1400) {
  const [val, setVal] = useState(0);

  useEffect(() => {
    let startTimestamp = null;
    let frameId;

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const easeVal = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setVal(Math.floor(easeVal * endVal));

      if (progress < 1) {
        frameId = requestAnimationFrame(step);
      }
    };

    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, [endVal, duration]);

  return val;
}

// Skewed Yellow Marker Highlight
function MarkerHighlight({ children }) {
  return (
    <span className="relative inline-block px-2 py-0.5 mx-1 z-10 font-black text-[#111111]">
      <span className="absolute inset-0 bg-[#FFD60A] -skew-y-2 -rotate-1 rounded-sm -z-10 border-2 border-[#111111] shadow-[2px_2px_0_#111111]" />
      {children}
    </span>
  );
}

// Barcode Graphic
function Barcode({ code = '890123456789', className = '' }) {
  return (
    <div className={`flex flex-col items-center select-none ${className}`}>
      <div
        className="h-8 w-32"
        style={{
          backgroundImage:
            'repeating-linear-gradient(90deg, #111111 0px, #111111 2px, transparent 2px, transparent 4px, #111111 4px, #111111 7px, transparent 7px, transparent 9px, #111111 9px, #111111 10px, transparent 10px, transparent 12px, #111111 12px, #111111 15px, transparent 15px, transparent 18px)',
        }}
      />
      <span className="font-mono text-[9px] tracking-[0.25em] text-[#111111] mt-1 font-bold">
        *{code}*
      </span>
    </div>
  );
}

// Rubber Stamp
function RubberStamp({ text, color = 'red', className = '', animate = false }) {
  const isGreen = color === 'green';
  const borderCol = isGreen ? 'border-[#19C37D] text-[#19C37D]' : 'border-[#FF4D2E] text-[#FF4D2E]';

  return (
    <div
      className={`inline-block px-3 py-1.5 border-4 border-dashed rounded-lg font-mono font-black text-sm tracking-widest uppercase select-none ${borderCol} ${
        animate ? 'animate-stamp-slam' : 'rotate-[-8deg]'
      } ${className}`}
    >
      {text}
    </div>
  );
}

// 1. NAVBAR
function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-[#F6F1E7] border-b-2 border-[#111111]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 bg-[#111111] text-[#FFD60A] font-black text-xl flex items-center justify-center rounded-lg border-2 border-[#111111] shadow-[2px_2px_0_#111111] group-hover:translate-x-0.5 group-hover:translate-y-0.5 group-hover:shadow-none transition-all">
              S
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-[#111111] tracking-tight">SubFlow</span>
              <span className="font-mono text-[10px] bg-[#FFD60A] px-1.5 py-0.5 rounded border border-[#111111] font-bold text-[#111111]">
                INVOICE V2
              </span>
            </div>
          </Link>

          {/* Desktop Links */}
          <nav className="hidden md:flex items-center gap-7">
            <a href="#features" className="text-sm font-bold text-[#111111] hover:text-[#FF4D2E] transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="text-sm font-bold text-[#111111] hover:text-[#FF4D2E] transition-colors">
              How it works
            </a>
            <a href="#live-demo" className="text-sm font-bold text-[#111111] hover:text-[#FF4D2E] transition-colors flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#19C37D] border border-[#111111]" />
              Printer Demo
            </a>
            <a href="#pricing" className="text-sm font-bold text-[#111111] hover:text-[#FF4D2E] transition-colors">
              Pricing
            </a>
            <a href="#faq" className="text-sm font-bold text-[#111111] hover:text-[#FF4D2E] transition-colors">
              FAQ
            </a>
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              to="/login"
              className="text-sm font-bold text-[#111111] hover:underline px-2 py-1"
            >
              Login
            </Link>
            <Link
              to="/signup"
              className="bg-[#FFD60A] text-[#111111] border-2 border-[#111111] shadow-[4px_4px_0_#111111] font-bold text-xs uppercase px-5 py-2.5 rounded-xl hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#111111] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all cursor-pointer"
            >
              Start free
            </Link>
          </div>

          {/* Mobile Hamburger */}
          <div className="flex md:hidden">
            <button
              type="button"
              onClick={() => setOpen(!open)}
              className="p-2 border-2 border-[#111111] rounded-lg bg-white shadow-[2px_2px_0_#111111]"
              aria-label="Toggle menu"
            >
              {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {open && (
        <div className="md:hidden border-t-2 border-[#111111] bg-[#F6F1E7] p-5 space-y-4">
          <nav className="flex flex-col space-y-3 font-bold text-base">
            <a href="#features" onClick={() => setOpen(false)} className="hover:text-[#FF4D2E]">Features</a>
            <a href="#how-it-works" onClick={() => setOpen(false)} className="hover:text-[#FF4D2E]">How it works</a>
            <a href="#live-demo" onClick={() => setOpen(false)} className="hover:text-[#FF4D2E]">Printer Demo</a>
            <a href="#pricing" onClick={() => setOpen(false)} className="hover:text-[#FF4D2E]">Pricing</a>
            <a href="#faq" onClick={() => setOpen(false)} className="hover:text-[#FF4D2E]">FAQ</a>
          </nav>
          <div className="pt-3 border-t-2 border-[#111111] flex flex-col gap-2.5">
            <Link
              to="/login"
              onClick={() => setOpen(false)}
              className="w-full text-center py-2.5 border-2 border-[#111111] rounded-xl font-bold bg-white shadow-[3px_3px_0_#111111]"
            >
              Login
            </Link>
            <Link
              to="/signup"
              onClick={() => setOpen(false)}
              className="w-full text-center py-2.5 border-2 border-[#111111] rounded-xl font-bold bg-[#FFD60A] shadow-[3px_3px_0_#111111]"
            >
              Start free
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

// 2. INVOICE CARD (HERO RIGHT COLUMN)
function InvoiceCard() {
  const [stamped, setStamped] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setStamped(true);
    }, 900);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative w-full max-w-[420px] mx-auto select-none">
      {/* Floating Sticker 1: Yellow Wobble */}
      <div className="absolute -top-6 -right-4 z-20 bg-[#FFD60A] text-[#111111] border-2 border-[#111111] shadow-[4px_4px_0_#111111] rounded-lg px-3 py-1.5 text-xs font-mono font-bold rotate-[4deg] animate-wobble">
        Discount applied automatically!
      </div>

      {/* Floating Sticker 2: Mint Wobble */}
      <div className="absolute -bottom-5 -left-4 z-20 bg-[#19C37D] text-[#111111] border-2 border-[#111111] shadow-[4px_4px_0_#111111] rounded-lg px-3 py-1.5 text-xs font-mono font-bold rotate-[-5deg] animate-wobble">
        Next billing: 1 Nov
      </div>

      {/* Main Paper Invoice Card */}
      <div className="bg-white border-2 border-[#111111] shadow-[8px_8px_0_#111111] rounded-2xl p-6 sm:p-7 rotate-[-3deg] hover:rotate-0 transition-transform duration-300 relative overflow-hidden">
        {/* Rubber Stamp Slammed */}
        {stamped && (
          <div className="absolute top-24 right-4 z-30 pointer-events-none">
            <RubberStamp text="PAID" color="red" animate={true} className="text-xl px-4 py-2" />
          </div>
        )}

        {/* Invoice Header */}
        <div className="flex items-start justify-between pb-4 border-b-2 border-[#111111]">
          <div>
            <span className="font-mono text-xs font-extrabold text-[#FF4D2E] tracking-wider uppercase">
              TAX INVOICE
            </span>
            <h3 className="font-mono text-xl font-black text-[#111111]">#INV-1042</h3>
          </div>
          <div className="text-right font-mono text-[10px] text-[#111111] space-y-0.5">
            <div>DATE: 01-NOV-2026</div>
            <div>DUE: IMMEDIATE</div>
          </div>
        </div>

        {/* Customer Information */}
        <div className="py-3 border-b-2 border-[#111111] font-mono text-xs flex justify-between">
          <div>
            <span className="text-slate-500 text-[10px]">CUSTOMER:</span>
            <p className="font-bold text-[#111111]">Acme Studio</p>
          </div>
          <div className="text-right">
            <span className="text-slate-500 text-[10px]">METHOD:</span>
            <p className="font-bold text-[#111111]">UPI AUTO-DEBIT</p>
          </div>
        </div>

        {/* Line items list */}
        <div className="py-3 border-b-2 border-[#111111] space-y-2 font-mono text-xs">
          <div className="flex justify-between font-bold text-slate-500 text-[10px] pb-1 border-b border-dashed border-[#111111]">
            <span>DESCRIPTION</span>
            <span>AMOUNT</span>
          </div>

          <div className="flex justify-between">
            <span>Pro Plan x5</span>
            <span className="font-bold">₹2,999</span>
          </div>

          <div className="flex justify-between text-slate-600">
            <span>Variant</span>
            <span>+₹560</span>
          </div>

          <div className="flex justify-between text-[#FF4D2E] font-bold">
            <span>Discount SAVE20</span>
            <span>-₹600</span>
          </div>

          <div className="flex justify-between text-slate-600">
            <span>GST 18%</span>
            <span>+₹532</span>
          </div>
        </div>

        {/* Total in Big Mono Type */}
        <div className="py-4 flex items-center justify-between font-mono">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
            TOTAL DUE:
          </span>
          <span className="text-2xl sm:text-3xl font-black text-[#111111] tracking-tight">
            ₹3,491.00
          </span>
        </div>

        {/* Perforated Bottom Edge with Half-Circle Notches */}
        <div className="relative my-2 py-2">
          {/* Left cutout notch */}
          <div className="absolute -left-9 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#F6F1E7] border-2 border-[#111111]" />
          {/* Dashed perforation line */}
          <div className="border-b-2 border-dashed border-[#111111] flex items-center justify-center">
            <span className="bg-white px-2 font-mono text-[9px] text-slate-400 flex items-center gap-1">
              <Scissors className="w-3 h-3" /> TEAR ALONG PERFORATION
            </span>
          </div>
          {/* Right cutout notch */}
          <div className="absolute -right-9 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#F6F1E7] border-2 border-[#111111]" />
        </div>

        {/* Barcode Strip */}
        <div className="pt-2 flex items-center justify-between">
          <Barcode code="INV1042-ACME-2026" />
          <div className="text-right font-mono text-[9px] text-slate-500">
            <div>STATUS: RECONCILED</div>
            <div className="text-[#19C37D] font-bold">ZERO DUPLICATES</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 2. HERO SECTION
function Hero() {
  return (
    <section className="py-16 md:py-24 border-b-2 border-[#111111] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column */}
          <div className="lg:col-span-7 space-y-6 text-left">
            <div>
              <span className="bg-[#FFD60A] text-[#111111] border-2 border-[#111111] shadow-[3px_3px_0_#111111] px-3.5 py-1.5 text-xs font-mono font-black uppercase rounded-lg inline-flex items-center gap-2 rotate-[-2deg]">
                <span className="w-2 h-2 rounded-full bg-[#FF4D2E] border border-[#111111]" />
                Invoice No. 0001 • Billing, handled
              </span>
            </div>

            <h1 className="text-5xl sm:text-6xl md:text-7xl xl:text-8xl font-black text-[#111111] tracking-tight leading-[0.98]">
              Bills that <MarkerHighlight>send themselves.</MarkerHighlight>
            </h1>

            <p className="text-lg sm:text-xl font-medium text-slate-700 max-w-xl leading-relaxed">
              Automate quotes, recurring invoices, discounts and payments. Never bill a customer twice.
              Know your MRR in real time without spreadsheets.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <Link
                to="/signup"
                className="bg-[#FFD60A] text-[#111111] border-2 border-[#111111] shadow-[5px_5px_0_#111111] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[3px_3px_0_#111111] active:translate-x-[5px] active:translate-y-[5px] active:shadow-none text-base font-black uppercase px-7 py-4 rounded-xl transition-all inline-flex items-center justify-center gap-2"
              >
                <span>Start free</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="#how-it-works"
                className="bg-white text-[#111111] border-2 border-[#111111] shadow-[5px_5px_0_#111111] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[3px_3px_0_#111111] active:translate-x-[5px] active:translate-y-[5px] active:shadow-none text-base font-black uppercase px-7 py-4 rounded-xl transition-all text-center"
              >
                See how it works
              </a>
            </div>

            {/* Three Mono Ticks */}
            <div className="pt-3 flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-xs font-bold text-[#111111]">
              <span className="flex items-center gap-1.5">
                <span className="text-[#19C37D] font-black">✓</span> Never billed twice
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-[#19C37D] font-black">✓</span> Auto tax and discounts
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-[#19C37D] font-black">✓</span> Admin / Staff / Customer
              </span>
            </div>
          </div>

          {/* Right Column: Tilted Paper Invoice */}
          <div className="lg:col-span-5 flex justify-center">
            <InvoiceCard />
          </div>
        </div>
      </div>
    </section>
  );
}

// 3. MARQUEE STRIP
function Marquee() {
  const items = [
    'IDEMPOTENT BILLING',
    'ROLE-BASED ACCESS',
    'AUTO DISCOUNTS',
    'OVERDUE TRACKING',
    'MRR AND ARR',
    'INVOICE PDFs',
    'DASHBOARDS UNDER 2s',
  ];

  return (
    <div className="bg-[#111111] text-[#FFD60A] py-3.5 border-b-2 border-[#111111] overflow-hidden select-none">
      <div className="whitespace-nowrap flex animate-marquee">
        {[...Array(3)].map((_, loopIdx) => (
          <div key={loopIdx} className="flex items-center gap-6 font-mono font-black text-sm tracking-widest shrink-0 px-3">
            {items.map((item, idx) => (
              <React.Fragment key={idx}>
                <span>{item}</span>
                <span className="text-white">✦</span>
              </React.Fragment>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// 4. RUN BILLING DEMO (WOW MOMENT)
function BillingDemo() {
  const [demoState, setDemoState] = useState('idle'); // 'idle' | 'printing_1' | 'printed_1' | 'printing_2' | 'printed_2'
  const [printedLines, setPrintedLines] = useState([]);

  const sampleInvoices = [
    { num: 'INV-1042', customer: 'Acme Studio', plan: 'Pro Plan x5', amount: '₹2,999' },
    { num: 'INV-1043', customer: 'CloudScale AI', plan: 'Scale Monthly', amount: '₹4,999' },
    { num: 'INV-1044', customer: 'HyperStack Systems', plan: 'Enterprise Annual', amount: '₹12,500' },
    { num: 'INV-1045', customer: 'PulsePay India', plan: 'Starter Monthly', amount: '₹999' },
    { num: 'INV-1046', customer: 'Nexus Dynamics', plan: 'Pro Plan x2', amount: '₹2,999' },
    { num: 'INV-1047', customer: 'AeroDev Logistics', plan: 'Custom Contract', amount: '₹7,999' },
  ];

  const handleRunBilling = () => {
    if (demoState === 'printed_1') {
      setDemoState('printing_2');
      setTimeout(() => {
        setDemoState('printed_2');
      }, 600);
      return;
    }

    if (demoState === 'printing_1' || demoState === 'printing_2' || demoState === 'printed_2') return;

    setDemoState('printing_1');
    setPrintedLines([]);

    sampleInvoices.forEach((inv, index) => {
      setTimeout(() => {
        setPrintedLines((prev) => [...prev, inv]);
      }, (index + 1) * 220);
    });

    setTimeout(() => {
      setDemoState('printed_1');
    }, (sampleInvoices.length + 1) * 220);
  };

  const handleReset = () => {
    setDemoState('idle');
    setPrintedLines([]);
  };

  return (
    <section id="live-demo" className="py-20 md:py-28 border-b-2 border-[#111111] bg-[#F6F1E7]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="bg-[#111111] text-[#FFD60A] border-2 border-[#111111] px-3 py-1 rounded text-xs font-mono font-bold uppercase tracking-wider inline-block rotate-[-1deg] shadow-[2px_2px_0_#111111]">
            Printer Mechanism
          </span>
          <h2 className="text-4xl sm:text-5xl font-black text-[#111111] tracking-tight mt-3">
            The Receipt Printer Demo
          </h2>
          <p className="mt-2 text-slate-700 font-medium text-base">
            Click "RUN BILLING" to watch receipts print in real time. Click again to verify zero duplicates.
          </p>
        </div>

        {/* Receipt Printer Card */}
        <div className="bg-white border-2 border-[#111111] shadow-[8px_8px_0_#111111] rounded-2xl p-6 sm:p-8 relative">
          {/* Printer Slot */}
          <div className="bg-[#111111] rounded-xl p-3 border-2 border-[#111111] flex items-center justify-between mb-6 shadow-inner">
            <div className="flex items-center gap-2 font-mono text-xs text-[#FFD60A] font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-[#19C37D] animate-ping" />
              <span>SUBFLOW THERMAL DISPATCHER v2.4</span>
            </div>
            <div className="flex items-center gap-3">
              {demoState !== 'idle' && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="bg-white text-[#111111] font-mono text-xs font-bold px-3 py-1 rounded border border-[#111111] hover:bg-[#FFD60A] flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>RESET</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleRunBilling}
                disabled={demoState === 'printing_1' || demoState === 'printing_2'}
                className="bg-[#FFD60A] text-[#111111] border-2 border-[#111111] shadow-[3px_3px_0_#111111] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none font-mono text-xs font-black uppercase px-5 py-2 rounded-lg active:translate-x-1 active:translate-y-1 active:shadow-none transition-all cursor-pointer"
              >
                {demoState === 'idle'
                  ? 'RUN BILLING'
                  : demoState === 'printing_1'
                  ? 'PRINTING...'
                  : demoState === 'printed_1'
                  ? 'RUN BILLING AGAIN'
                  : 'PRINTED'}
              </button>
            </div>
          </div>

          {/* Paper Receipt Sliding Down */}
          <div className="min-h-[220px] bg-[#F6F1E7] border-2 border-dashed border-[#111111] rounded-xl p-5 font-mono text-xs relative overflow-hidden">
            {demoState === 'idle' && (
              <div className="text-center py-12 text-slate-500 font-bold space-y-1">
                <p>--- READY TO PRINT ---</p>
                <p className="text-[11px] text-slate-400">Click "RUN BILLING" to test invoice generation.</p>
              </div>
            )}

            {printedLines.length > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between font-bold pb-2 border-b-2 border-[#111111] text-[11px]">
                  <span>INV NO. / CUSTOMER</span>
                  <span>TIER</span>
                  <span className="text-right">TOTAL</span>
                </div>

                {printedLines.map((row, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center py-1 border-b border-dashed border-slate-300 animate-slide-in"
                  >
                    <div>
                      <span className="font-black text-[#111111]">{row.num}</span>{' '}
                      <span className="text-slate-600 font-medium">({row.customer})</span>
                    </div>
                    <div className="text-slate-500 text-[10px]">{row.plan}</div>
                    <div className="font-bold text-[#111111]">{row.amount}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Ending Green Stamp */}
            {demoState === 'printed_1' && (
              <div className="mt-6 pt-4 border-t-2 border-[#111111] flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <p className="font-black text-sm text-[#111111]">148 INVOICES CREATED</p>
                  <p className="text-[10px] text-slate-500">All customer ledgers reconciled for current cycle</p>
                </div>
                <RubberStamp text="AUTO-BILLED ✓" color="green" animate={true} />
              </div>
            )}

            {/* Click Again: Red Stamp */}
            {demoState === 'printed_2' && (
              <div className="mt-4 p-5 bg-white border-2 border-[#111111] rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h4 className="font-black text-base text-[#FF4D2E]">0 CREATED.</h4>
                  <p className="text-xs text-slate-700 font-bold mt-0.5">
                    Every subscription is already billed for this period.
                  </p>
                </div>
                <RubberStamp text="NO DUPLICATES" color="red" animate={true} className="text-base px-3 py-1.5" />
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// 5. FEATURES AS "LINE ITEMS"
function Features() {
  const [activeRow, setActiveRow] = useState(0);

  const featuresList = [
    {
      qty: '01',
      title: 'Subscriptions',
      color: 'bg-[#19C37D]',
      amount: '∞ saved hours',
      icon: RefreshCw,
      tag: 'LIFECYCLE ENGINE',
      description: 'Manage monthly, quarterly and annual cadences with automated mid-cycle prorations down to the second.',
    },
    {
      qty: '02',
      title: 'Automatic Invoicing',
      color: 'bg-[#7CC6FE]',
      amount: '100% GST on-time',
      icon: FileText,
      tag: 'TAX COMPLIANT',
      description: 'Tax-compliant, itemized PDF invoices created on cycle renewal and emailed to billing contacts.',
    },
    {
      qty: '03',
      title: 'Discounts',
      color: 'bg-[#FFD60A]',
      amount: '-₹600 auto-cut',
      icon: Percent,
      tag: 'PROMOTIONS',
      description: 'Create percentage, flat coupons, time-limited promotions, and bespoke enterprise volume pricing.',
    },
    {
      qty: '04',
      title: 'Payments',
      color: 'bg-[#C8B6FF]',
      amount: 'Zero chargebacks',
      icon: CreditCard,
      tag: 'SETTLEMENT',
      description: 'Instant UPI recurring mandates, cards, and automatic dunning retries to prevent involuntary churn.',
    },
    {
      qty: '05',
      title: 'Finance Dashboard',
      color: 'bg-[#FF4D2E]',
      amount: '< 2s refresh',
      icon: BarChart2,
      tag: 'REAL-TIME METRICS',
      description: 'Real-time MRR, ARR velocity, overdue balances, and cashflow distribution with zero ETL delay.',
    },
    {
      qty: '06',
      title: 'Role-based Access',
      color: 'bg-[#FFD60A]',
      amount: '3 locked roles',
      icon: Users,
      tag: 'ROW LEVEL SECURITY',
      description: 'Super Admin, Sales Staff Quoting Desk, and Customer Self-Service Portals backed by Supabase RLS.',
    },
  ];

  return (
    <section id="features" className="py-20 md:py-28 border-b-2 border-[#111111] bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <span className="bg-[#FFD60A] text-[#111111] border-2 border-[#111111] px-3 py-1 rounded text-xs font-mono font-bold uppercase tracking-wider inline-block rotate-[-1deg] shadow-[2px_2px_0_#111111]">
            Receipt Line Items
          </span>
          <h2 className="text-4xl sm:text-5xl font-black text-[#111111] tracking-tight mt-3">
            Features as Line Items
          </h2>
          <p className="mt-2 text-slate-700 font-medium text-base">
            Hover over any line item below to expand its colored sticker card and inspection details.
          </p>
        </div>

        {/* Big Receipt-Like Table */}
        <div className="bg-[#F6F1E7] border-2 border-[#111111] shadow-[8px_8px_0_#111111] rounded-2xl p-6 sm:p-8">
          <div className="grid grid-cols-12 pb-3 border-b-2 border-[#111111] font-mono text-xs font-black text-[#111111] uppercase tracking-wider">
            <span className="col-span-1">QTY</span>
            <span className="col-span-7 sm:col-span-8">DESCRIPTION</span>
            <span className="col-span-4 sm:col-span-3 text-right">AMOUNT / VALUE</span>
          </div>

          <div className="divide-y-2 divide-[#111111]">
            {featuresList.map((row, index) => {
              const Icon = row.icon;
              const isSelected = activeRow === index;

              return (
                <div
                  key={row.qty}
                  onMouseEnter={() => setActiveRow(index)}
                  onClick={() => setActiveRow(index)}
                  className={`py-4 transition-all cursor-pointer ${
                    isSelected ? 'px-2' : 'hover:bg-white/50'
                  }`}
                >
                  <div className="grid grid-cols-12 items-center font-mono">
                    <span className="col-span-1 font-bold text-slate-500 text-xs sm:text-sm">
                      {row.qty}
                    </span>
                    <div className="col-span-7 sm:col-span-8 flex items-center gap-2">
                      <span className="font-black text-sm sm:text-base text-[#111111]">
                        {row.title}
                      </span>
                      <span className="hidden sm:inline-block text-[10px] font-bold px-2 py-0.5 rounded border border-[#111111] bg-white">
                        {row.tag}
                      </span>
                    </div>
                    <span className="col-span-4 sm:col-span-3 text-right font-black text-xs sm:text-sm text-[#FF4D2E]">
                      {row.amount}
                    </span>
                  </div>

                  {/* Expanded Colored Sticker Card */}
                  {isSelected && (
                    <div
                      className={`mt-3 p-4 rounded-xl border-2 border-[#111111] shadow-[4px_4px_0_#111111] ${row.color} text-[#111111] flex items-start gap-3.5 animate-slide-in`}
                    >
                      <div className="w-9 h-9 rounded-lg bg-white border-2 border-[#111111] flex items-center justify-center shrink-0 shadow-[2px_2px_0_#111111]">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-mono text-[10px] font-black uppercase tracking-wider">
                          {row.tag} • LINE ITEM {row.qty}
                        </div>
                        <p className="font-bold text-xs sm:text-sm mt-0.5 leading-snug">
                          {row.description}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

// 6. HOW IT WORKS (CONVEYOR OF 6 NUMBERED TICKETS)
function Steps() {
  const steps = [
    { num: '01', title: 'Product', subtitle: 'Define Catalog', rot: 'rotate-[-2deg]', color: 'bg-white' },
    { num: '02', title: 'Plan', subtitle: 'Cadence & Rates', rot: 'rotate-[2deg]', color: 'bg-[#FFD60A]' },
    { num: '03', title: 'Quote', subtitle: 'Staff Proposals', rot: 'rotate-[-1.5deg]', color: 'bg-white' },
    { num: '04', title: 'Subscription', subtitle: 'Provisioning', rot: 'rotate-[2.5deg]', color: 'bg-[#7CC6FE]' },
    { num: '05', title: 'Invoice', subtitle: 'GST Auto-PDF', rot: 'rotate-[-2deg]', color: 'bg-white' },
    { num: '06', title: 'Payment', subtitle: 'Settlement', rot: 'rotate-[1.5deg]', color: 'bg-[#19C37D]' },
  ];

  return (
    <section id="how-it-works" className="py-20 md:py-28 border-b-2 border-[#111111] bg-[#F6F1E7]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="bg-[#111111] text-[#FFD60A] border-2 border-[#111111] px-3 py-1 rounded text-xs font-mono font-bold uppercase tracking-wider inline-block rotate-[-1deg] shadow-[2px_2px_0_#111111]">
            Conveyor Line
          </span>
          <h2 className="text-4xl sm:text-5xl font-black text-[#111111] tracking-tight mt-3">
            How It Works: 6 Paper Tickets
          </h2>
          <p className="mt-2 text-slate-700 font-medium text-base">
            Hover over any ticket to straighten and inspect the continuous subscription lifecycle.
          </p>
        </div>

        {/* 6 Paper Tickets */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-6 relative">
          {steps.map((st) => (
            <div key={st.num} className="relative group">
              <div
                className={`p-5 rounded-2xl border-2 border-[#111111] shadow-[6px_6px_0_#111111] ${st.color} ${st.rot} group-hover:rotate-0 group-hover:translate-y-[-4px] group-hover:shadow-[8px_8px_0_#111111] transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[170px] select-none`}
              >
                <div className="flex items-center justify-between pb-2 border-b-2 border-[#111111]">
                  <span className="font-mono text-xs font-black text-[#111111]">TICKET</span>
                  <span className="font-mono text-xs font-black text-[#FF4D2E]">{st.num}</span>
                </div>

                <div className="my-2">
                  <h4 className="font-black text-lg text-[#111111] tracking-tight">{st.title}</h4>
                  <p className="font-mono text-xs font-bold text-slate-700 mt-0.5">{st.subtitle}</p>
                </div>

                <div className="pt-2 border-t border-dashed border-[#111111] flex items-center justify-between font-mono text-[9px] font-bold text-slate-600">
                  <span>STEP {st.num}</span>
                  <span className="text-[#111111]">AUTO →</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// 7. FINANCE DASHBOARD PREVIEW
function DashboardPreview() {
  const mrrVal = useCountUp(482500, 1600);
  const arrVal = useCountUp(5790000, 1600);

  return (
    <section className="py-20 md:py-28 border-b-2 border-[#111111] bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <span className="bg-[#FFD60A] text-[#111111] border-2 border-[#111111] px-3 py-1 rounded text-xs font-mono font-bold uppercase tracking-wider inline-block rotate-[-1deg] shadow-[2px_2px_0_#111111]">
            Ledger Overview
          </span>
          <h2 className="text-4xl sm:text-5xl font-black text-[#111111] tracking-tight mt-3">
            Finance Dashboard Preview
          </h2>
          <p className="mt-2 text-slate-700 font-medium text-base">
            Track MRR, ARR, and aging buckets in rupees with instant zero-lag queries.
          </p>
        </div>

        {/* Flat White Card with Ink Border */}
        <div className="bg-[#F6F1E7] border-2 border-[#111111] shadow-[8px_8px_0_#111111] rounded-2xl p-6 sm:p-8 space-y-8">
          {/* 4 Colored KPI Blocks */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#FFD60A] border-2 border-[#111111] shadow-[4px_4px_0_#111111] p-4 rounded-xl">
              <span className="font-mono text-xs font-bold text-[#111111] uppercase">MRR</span>
              <div className="font-mono text-2xl sm:text-3xl font-black text-[#111111] mt-1">
                ₹{mrrVal.toLocaleString('en-IN')}
              </div>
              <span className="font-mono text-[11px] font-bold text-[#111111] mt-1 block">
                +32.8% THIS CYCLE
              </span>
            </div>

            <div className="bg-[#7CC6FE] border-2 border-[#111111] shadow-[4px_4px_0_#111111] p-4 rounded-xl">
              <span className="font-mono text-xs font-bold text-[#111111] uppercase">ARR</span>
              <div className="font-mono text-2xl sm:text-3xl font-black text-[#111111] mt-1">
                ₹{arrVal.toLocaleString('en-IN')}
              </div>
              <span className="font-mono text-[11px] font-bold text-[#111111] mt-1 block">
                CONTRACTED VOLUME
              </span>
            </div>

            <div className="bg-[#19C37D] border-2 border-[#111111] shadow-[4px_4px_0_#111111] p-4 rounded-xl">
              <span className="font-mono text-xs font-bold text-[#111111] uppercase">OUTSTANDING</span>
              <div className="font-mono text-2xl sm:text-3xl font-black text-[#111111] mt-1">
                ₹0.00
              </div>
              <span className="font-mono text-[11px] font-bold text-[#111111] mt-1 block">
                100% RECONCILED
              </span>
            </div>

            <div className="bg-[#C8B6FF] border-2 border-[#111111] shadow-[4px_4px_0_#111111] p-4 rounded-xl">
              <span className="font-mono text-xs font-bold text-[#111111] uppercase">OVERDUE</span>
              <div className="font-mono text-2xl sm:text-3xl font-black text-[#111111] mt-1">
                0.0%
              </div>
              <span className="font-mono text-[11px] font-bold text-[#111111] mt-1 block">
                ZERO UNSETTLED
              </span>
            </div>
          </div>

          {/* Chunky Bar Chart */}
          <div className="bg-white border-2 border-[#111111] shadow-[4px_4px_0_#111111] p-6 rounded-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b-2 border-[#111111] font-mono">
              <span className="text-xs font-black uppercase text-[#111111]">
                MONTHLY CASHFLOW PROGRESSION (₹ IN LAKHS)
              </span>
              <span className="text-xs text-[#19C37D] font-black">ALL MONTHS RECONCILED ✓</span>
            </div>

            <div className="h-44 pt-6 flex items-end justify-between gap-3 sm:gap-6 px-2">
              {[
                { month: 'JUN', val: '₹2.4L', height: '42%', color: 'bg-[#7CC6FE]' },
                { month: 'JUL', val: '₹2.9L', height: '54%', color: 'bg-[#7CC6FE]' },
                { month: 'AUG', val: '₹3.4L', height: '65%', color: 'bg-[#7CC6FE]' },
                { month: 'SEP', val: '₹3.9L', height: '76%', color: 'bg-[#7CC6FE]' },
                { month: 'OCT', val: '₹4.3L', height: '88%', color: 'bg-[#7CC6FE]' },
                { month: 'NOV', val: '₹4.8L', height: '98%', color: 'bg-[#FFD60A]', current: true },
              ].map((bar, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                  <span className="font-mono text-[11px] font-bold text-[#111111]">{bar.val}</span>
                  <div className="w-full max-w-[52px] bg-slate-100 border-2 border-[#111111] h-32 flex items-end">
                    <div
                      style={{ height: bar.height }}
                      className={`w-full border-t-2 border-[#111111] ${bar.color} transition-all duration-700`}
                    />
                  </div>
                  <span className={`font-mono text-xs font-black ${bar.current ? 'text-[#FF4D2E]' : 'text-[#111111]'}`}>
                    {bar.month}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Aging Bucket Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono">
            <div className="p-3.5 rounded-xl border-2 border-[#111111] bg-[#19C37D] text-[#111111] flex justify-between items-center font-bold text-xs shadow-[3px_3px_0_#111111]">
              <span>0–30 DAYS (CURRENT)</span>
              <span className="font-black">₹4,82,500.00</span>
            </div>
            <div className="p-3.5 rounded-xl border-2 border-[#111111] bg-[#FFD60A] text-[#111111] flex justify-between items-center font-bold text-xs shadow-[3px_3px_0_#111111]">
              <span>31–60 DAYS</span>
              <span className="font-black">₹0.00</span>
            </div>
            <div className="p-3.5 rounded-xl border-2 border-[#111111] bg-[#FF4D2E] text-white flex justify-between items-center font-bold text-xs shadow-[3px_3px_0_#111111]">
              <span>60+ DAYS</span>
              <span className="font-black">₹0.00</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// 8. PRICING AS 3 TEAR-OFF RECEIPTS
function Pricing() {
  const [cycle, setCycle] = useState('monthly');

  return (
    <section id="pricing" className="py-20 md:py-28 border-b-2 border-[#111111] bg-[#F6F1E7]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <span className="bg-[#111111] text-[#FFD60A] border-2 border-[#111111] px-3 py-1 rounded text-xs font-mono font-bold uppercase tracking-wider inline-block rotate-[-1deg] shadow-[2px_2px_0_#111111]">
            Coupon Receipts
          </span>
          <h2 className="text-4xl sm:text-5xl font-black text-[#111111] tracking-tight mt-3">
            Tear-Off Pricing Receipts
          </h2>
          <p className="mt-2 text-slate-700 font-medium text-base">
            Clear rupee pricing with zero cut of your processed volume.
          </p>

          {/* Chunky Switch */}
          <div className="mt-8 inline-flex items-center border-2 border-[#111111] bg-white rounded-xl p-1 shadow-[4px_4px_0_#111111]">
            <button
              type="button"
              onClick={() => setCycle('monthly')}
              className={`px-5 py-2 font-mono text-xs sm:text-sm font-black rounded-lg transition-all cursor-pointer ${
                cycle === 'monthly' ? 'bg-[#FFD60A] border-2 border-[#111111] shadow-[2px_2px_0_#111111]' : 'text-slate-600'
              }`}
            >
              MONTHLY CADENCE
            </button>
            <button
              type="button"
              onClick={() => setCycle('yearly')}
              className={`px-5 py-2 font-mono text-xs sm:text-sm font-black rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                cycle === 'yearly' ? 'bg-[#FFD60A] border-2 border-[#111111] shadow-[2px_2px_0_#111111]' : 'text-slate-600'
              }`}
            >
              <span>ANNUAL (SAVE 20%)</span>
              <span className="bg-[#19C37D] text-[#111111] text-[9px] px-1.5 py-0.5 rounded border border-[#111111]">
                -20%
              </span>
            </button>
          </div>
        </div>

        {/* 3 Receipts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch pt-2">
          {/* Starter */}
          <div className="bg-white border-2 border-[#111111] shadow-[6px_6px_0_#111111] rounded-2xl p-7 flex flex-col justify-between relative">
            <div>
              <div className="flex justify-between items-start pb-4 border-b-2 border-[#111111] font-mono">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">COUPON #01</span>
                  <h3 className="text-2xl font-black text-[#111111]">STARTER</h3>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 bg-[#7CC6FE] border border-[#111111] rounded">
                  EARLY STAGE
                </span>
              </div>

              <div className="py-6 font-mono">
                <div className="text-3xl sm:text-4xl font-black text-[#111111]">
                  {cycle === 'yearly' ? '₹799' : '₹999'}
                  <span className="text-sm font-normal text-slate-500"> / mo</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  {cycle === 'yearly' ? 'Billed annually' : 'Billed on monthly cadence'}
                </div>
              </div>

              {/* Dotted items */}
              <div className="space-y-2.5 font-mono text-xs py-4 border-y-2 border-dashed border-[#111111]">
                <div className="flex justify-between">
                  <span>Active Subscribers</span>
                  <span className="text-slate-400">. . . . .</span>
                  <span className="font-bold">250 max</span>
                </div>
                <div className="flex justify-between">
                  <span>Recurring Invoicing</span>
                  <span className="text-slate-400">. . . . .</span>
                  <span className="font-bold">Included</span>
                </div>
                <div className="flex justify-between">
                  <span>Staff Seat Accounts</span>
                  <span className="text-slate-400">. . . . .</span>
                  <span className="font-bold">1 Seat</span>
                </div>
                <div className="flex justify-between">
                  <span>Customer Portal</span>
                  <span className="text-slate-400">. . . . .</span>
                  <span className="font-bold">Self-Service</span>
                </div>
                <div className="flex justify-between font-black text-[#111111]">
                  <span>TOTAL DUE TODAY</span>
                  <span>. . . . .</span>
                  <span>₹0.00</span>
                </div>
              </div>
            </div>

            <div className="pt-6">
              <Link
                to="/signup"
                className="w-full text-center block bg-[#111111] text-[#FFD60A] border-2 border-[#111111] shadow-[4px_4px_0_#111111] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none font-mono font-black text-xs uppercase py-3.5 rounded-xl transition-all cursor-pointer"
              >
                CLAIM STARTER COUPON
              </Link>
            </div>
          </div>

          {/* Pro (Highlighted, Yellow, Rotated with Most Popular Stamp) */}
          <div className="bg-[#FFD60A] border-4 border-[#111111] shadow-[10px_10px_0_#111111] rounded-2xl p-8 flex flex-col justify-between relative rotate-[-1.5deg] hover:rotate-0 transition-transform duration-300 lg:-translate-y-2">
            <div className="absolute -top-5 right-6 z-20">
              <RubberStamp text="MOST POPULAR" color="red" className="bg-white shadow-[2px_2px_0_#111111] text-xs px-3 py-1" />
            </div>

            <div>
              <div className="flex justify-between items-start pb-4 border-b-2 border-[#111111] font-mono">
                <div>
                  <span className="text-[10px] font-bold text-[#111111] uppercase">COUPON #02</span>
                  <h3 className="text-3xl font-black text-[#111111]">PRO PLAN</h3>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 bg-[#19C37D] border-2 border-[#111111] rounded shadow-[2px_2px_0_#111111]">
                  SCALE TIER
                </span>
              </div>

              <div className="py-6 font-mono">
                <div className="text-4xl sm:text-5xl font-black text-[#111111]">
                  {cycle === 'yearly' ? '₹2,399' : '₹2,999'}
                  <span className="text-sm font-bold text-slate-800"> / mo</span>
                </div>
                <div className="text-[10px] text-slate-800 font-bold mt-1">
                  {cycle === 'yearly' ? 'Billed annually' : 'Billed on monthly cadence'}
                </div>
              </div>

              <div className="space-y-2.5 font-mono text-xs py-4 border-y-2 border-dashed border-[#111111]">
                <div className="flex justify-between">
                  <span>Active Subscribers</span>
                  <span className="text-slate-800">. . . . .</span>
                  <span className="font-bold">2,500 max</span>
                </div>
                <div className="flex justify-between">
                  <span>Staff Quoting Desk</span>
                  <span className="text-slate-800">. . . . .</span>
                  <span className="font-bold">Included</span>
                </div>
                <div className="flex justify-between">
                  <span>Smart Dunning Retries</span>
                  <span className="text-slate-800">. . . . .</span>
                  <span className="font-bold">Auto</span>
                </div>
                <div className="flex justify-between">
                  <span>Staff Seat Accounts</span>
                  <span className="text-slate-800">. . . . .</span>
                  <span className="font-bold">10 Seats</span>
                </div>
                <div className="flex justify-between font-black text-[#FF4D2E]">
                  <span>TOTAL DUE TODAY</span>
                  <span>. . . . .</span>
                  <span>₹0.00 (14d free)</span>
                </div>
              </div>
            </div>

            <div className="pt-6">
              <Link
                to="/signup"
                className="w-full text-center block bg-[#111111] text-[#FFD60A] border-2 border-[#111111] shadow-[5px_5px_0_#111111] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none font-mono font-black text-sm uppercase py-4 rounded-xl transition-all cursor-pointer"
              >
                TEAR OFF & START 14-DAY TRIAL
              </Link>
            </div>
          </div>

          {/* Enterprise */}
          <div className="bg-white border-2 border-[#111111] shadow-[6px_6px_0_#111111] rounded-2xl p-7 flex flex-col justify-between relative">
            <div>
              <div className="flex justify-between items-start pb-4 border-b-2 border-[#111111] font-mono">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">COUPON #03</span>
                  <h3 className="text-2xl font-black text-[#111111]">ENTERPRISE</h3>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 bg-[#C8B6FF] border border-[#111111] rounded">
                  CUSTOM SLA
                </span>
              </div>

              <div className="py-6 font-mono">
                <div className="text-3xl sm:text-4xl font-black text-[#111111]">
                  {cycle === 'yearly' ? '₹6,399' : '₹7,999'}
                  <span className="text-sm font-normal text-slate-500"> / mo</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  {cycle === 'yearly' ? 'Billed annually' : 'Billed on monthly cadence'}
                </div>
              </div>

              <div className="space-y-2.5 font-mono text-xs py-4 border-y-2 border-dashed border-[#111111]">
                <div className="flex justify-between">
                  <span>Active Subscribers</span>
                  <span className="text-slate-400">. . . . .</span>
                  <span className="font-bold">Unlimited</span>
                </div>
                <div className="flex justify-between">
                  <span>Custom RBAC & Roles</span>
                  <span className="text-slate-400">. . . . .</span>
                  <span className="font-bold">Unlimited</span>
                </div>
                <div className="flex justify-between">
                  <span>Dedicated Accounting Sync</span>
                  <span className="text-slate-400">. . . . .</span>
                  <span className="font-bold">Included</span>
                </div>
                <div className="flex justify-between">
                  <span>99.99% Uptime Guarantee</span>
                  <span className="text-slate-400">. . . . .</span>
                  <span className="font-bold">SLA Contract</span>
                </div>
                <div className="flex justify-between font-black text-[#111111]">
                  <span>TOTAL DUE TODAY</span>
                  <span>. . . . .</span>
                  <span>Custom Invoice</span>
                </div>
              </div>
            </div>

            <div className="pt-6">
              <Link
                to="/signup"
                className="w-full text-center block bg-[#111111] text-[#FFD60A] border-2 border-[#111111] shadow-[4px_4px_0_#111111] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none font-mono font-black text-xs uppercase py-3.5 rounded-xl transition-all cursor-pointer"
              >
                REQUEST ENTERPRISE QUOTE
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// 9. FAQ ACCORDION
function Faq() {
  const [openIdx, setOpenIdx] = useState(0);

  const faqs = [
    {
      q: 'How does SubFlow guarantee customers are never billed twice?',
      a: 'Every recurring billing job computes an atomic idempotency hash before firing a charge or generating an invoice. If a webhook retries or a background job re-runs, the database locks and matches against the existing receipt, guaranteeing zero duplicate charges.',
    },
    {
      q: 'Can sales staff prepare customized quotes before subscriptions start?',
      a: 'Yes. SubFlow provides a dedicated Staff Quoting Desk. Sales reps can construct bespoke proposals with volume discounts and custom billing cycles. When the customer accepts electronically, SubFlow automatically transitions the quote into an active subscription.',
    },
    {
      q: 'Which payment methods are supported for customer checkout?',
      a: 'Customers can pay using UPI auto-mandates (Google Pay, PhonePe, Paytm, BHIM), credit and debit cards (Visa, Mastercard, RuPay), and net banking. Staff can also record manual bank wire transfers with one click.',
    },
    {
      q: 'How does Role-Based Access Control (RBAC) protect our organization?',
      a: 'SubFlow segregates authority into 3 distinct domains: Super Admin (system configuration, staff management), Staff (customer management, quote building), and Customer (self-service invoice and card management), secured by Supabase Row-Level Security.',
    },
    {
      q: 'Can we export generated invoices and financial ledgers for accounting?',
      a: 'Yes. All generated invoices include itemized GST breakdowns and can be downloaded as individual PDFs or exported in bulk as CSV spreadsheets for accounting software reconciliation.',
    },
  ];

  return (
    <section id="faq" className="py-20 md:py-28 border-b-2 border-[#111111] bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <span className="bg-[#FFD60A] text-[#111111] border-2 border-[#111111] px-3 py-1 rounded text-xs font-mono font-bold uppercase tracking-wider inline-block rotate-[-1deg] shadow-[2px_2px_0_#111111]">
            Honest Inquiries
          </span>
          <h2 className="text-4xl sm:text-5xl font-black text-[#111111] tracking-tight mt-3">
            Frequently Asked Questions
          </h2>
          <p className="mt-2 text-slate-700 font-medium text-base">
            No jargon. Honest answers about our subscription billing infrastructure.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = openIdx === index;

            return (
              <div
                key={index}
                className={`border-2 border-[#111111] rounded-xl transition-all shadow-[4px_4px_0_#111111] ${
                  isOpen ? 'bg-[#FFD60A]' : 'bg-[#F6F1E7] hover:bg-white'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setOpenIdx(isOpen ? null : index)}
                  className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 cursor-pointer focus:outline-none"
                  aria-expanded={isOpen}
                >
                  <span className="font-black text-base sm:text-lg text-[#111111]">
                    {faq.q}
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-[#111111] text-white flex items-center justify-center shrink-0 border-2 border-[#111111] shadow-[2px_2px_0_#111111]">
                    {isOpen ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  </div>
                </button>

                {isOpen && (
                  <div className="px-5 sm:px-6 pb-6 pt-1 text-sm font-medium text-[#111111] border-t-2 border-[#111111] leading-relaxed">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// 10. FINAL CTA
function FinalCta() {
  return (
    <section className="py-20 md:py-28 bg-[#F6F1E7] border-b-2 border-[#111111]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#FFD60A] border-4 border-[#111111] shadow-[10px_10px_0_#111111] rounded-3xl p-8 sm:p-14 lg:p-20 relative overflow-hidden">
          {/* Rotated Stamp Sticker */}
          <div className="absolute top-6 right-6 z-20">
            <RubberStamp text="PAID IN FULL" color="red" className="text-base sm:text-xl px-4 py-2 bg-white" />
          </div>

          <div className="max-w-3xl space-y-6">
            <span className="bg-[#111111] text-[#FFD60A] px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wider border-2 border-[#111111] inline-block shadow-[2px_2px_0_#111111]">
              Zero Friction Setup
            </span>

            <h2 className="text-4xl sm:text-6xl md:text-7xl font-black text-[#111111] tracking-tight leading-[0.98]">
              Stop chasing invoices.
            </h2>

            <p className="text-base sm:text-xl font-bold text-[#111111] max-w-xl leading-relaxed">
              Launch your subscription billing engine in less than 15 minutes. Automatic invoices, quotes, and zero duplicate charges.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <Link
                to="/signup"
                className="bg-[#111111] text-[#FFD60A] border-2 border-[#111111] shadow-[5px_5px_0_#111111] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[3px_3px_0_#111111] active:translate-x-[5px] active:translate-y-[5px] active:shadow-none text-base font-black uppercase px-8 py-4 rounded-xl transition-all text-center"
              >
                Start free trial
              </Link>
              <Link
                to="/login"
                className="bg-white text-[#111111] border-2 border-[#111111] shadow-[5px_5px_0_#111111] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[3px_3px_0_#111111] active:translate-x-[5px] active:translate-y-[5px] active:shadow-none text-base font-black uppercase px-8 py-4 rounded-xl transition-all text-center"
              >
                Login to account
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// 11. FOOTER
function Footer() {
  return (
    <footer className="bg-[#111111] text-[#F6F1E7] py-16 text-xs font-mono">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 pb-12 border-b-2 border-white/20">
          {/* Brand */}
          <div className="col-span-2 space-y-4">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#FFD60A] text-[#111111] font-black text-lg flex items-center justify-center rounded-lg border border-[#111111]">
                S
              </div>
              <span className="text-xl font-black text-[#F6F1E7] tracking-tight">SubFlow</span>
            </Link>
            <p className="text-slate-400 max-w-sm leading-relaxed text-xs">
              Neo-brutalist subscription management and billing platform. Built with mathematical idempotency and atomic ledger guarantees.
            </p>
            <div className="pt-2">
              <Barcode code="SUBFLOW-TERMINAL-2026" className="items-start" />
            </div>
          </div>

          {/* Product */}
          <div className="space-y-3">
            <h4 className="font-black text-[#FFD60A] uppercase tracking-wider text-xs">Product</h4>
            <ul className="space-y-2 text-slate-400">
              <li><a href="#features" className="hover:text-white">Subscriptions</a></li>
              <li><a href="#features" className="hover:text-white">Tax Invoices</a></li>
              <li><a href="#live-demo" className="hover:text-white">Receipt Printer</a></li>
              <li><a href="#how-it-works" className="hover:text-white">Pipeline Conveyor</a></li>
              <li><a href="#pricing" className="hover:text-white">Pricing in ₹</a></li>
            </ul>
          </div>

          {/* Portals */}
          <div className="space-y-3">
            <h4 className="font-black text-[#FFD60A] uppercase tracking-wider text-xs">Portals</h4>
            <ul className="space-y-2 text-slate-400">
              <li><Link to="/login" className="hover:text-white">Admin Console</Link></li>
              <li><Link to="/login" className="hover:text-white">Staff Quoting Desk</Link></li>
              <li><Link to="/login" className="hover:text-white">Customer Portal</Link></li>
              <li><Link to="/signup" className="hover:text-white">Instant Setup</Link></li>
            </ul>
          </div>

          {/* System */}
          <div className="space-y-3">
            <h4 className="font-black text-[#FFD60A] uppercase tracking-wider text-xs">System</h4>
            <ul className="space-y-2 text-slate-400">
              <li><a href="#faq" className="hover:text-white">FAQ</a></li>
              <li><span className="text-slate-600">API Documentation</span></li>
              <li><span className="text-slate-600">Supabase RLS</span></li>
              <li className="pt-2">
                <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-white/10 text-[#19C37D] font-bold text-[10px]">
                  <span className="w-2 h-2 rounded-full bg-[#19C37D] animate-ping" />
                  All systems operational
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500 text-[11px]">
          <div>
            &copy; {new Date().getFullYear()} SubFlow Technologies. All rights reserved.
          </div>
          <div className="italic text-slate-400">
            Thank you for your business.
          </div>
        </div>
      </div>
    </footer>
  );
}

// MAIN PAGE
export function Home() {
  return (
    <div className="min-h-screen bg-[#F6F1E7] text-[#111111] antialiased selection:bg-[#FFD60A] selection:text-[#111111]">
      {/* PURE CSS STYLES FOR NEO-BRUTALIST PAPER TEXTURE & STAMPS (NO GRADIENTS) */}
      <style>{`
        /* Repeating ruled paper lines (5% opacity) */
        .paper-ruled-bg {
          background-color: #F6F1E7;
          background-image: repeating-linear-gradient(
            180deg,
            rgba(17, 17, 17, 0.05) 0px,
            rgba(17, 17, 17, 0.05) 1px,
            transparent 1px,
            transparent 32px
          );
        }

        /* Infinite Marquee */
        @keyframes marqueeScroll {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marqueeScroll 25s linear infinite;
        }

        /* Stamp Slam with bounce */
        @keyframes stampSlam {
          0% { opacity: 0; transform: scale(2.8) rotate(-18deg); }
          60% { opacity: 1; transform: scale(0.92) rotate(-6deg); }
          80% { transform: scale(1.05) rotate(-9deg); }
          100% { opacity: 1; transform: scale(1) rotate(-8deg); }
        }
        .animate-stamp-slam {
          animation: stampSlam 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }

        /* Sticker wobble */
        @keyframes gentleWobble {
          0%, 100% { transform: rotate(4deg) translateY(0px); }
          50% { transform: rotate(2deg) translateY(-4px); }
        }
        .animate-wobble {
          animation: gentleWobble 4s ease-in-out infinite;
        }

        /* Slide in for receipts */
        @keyframes slideInReceipt {
          0% { opacity: 0; transform: translateY(-8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-in {
          animation: slideInReceipt 0.2s ease-out forwards;
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-marquee,
          .animate-stamp-slam,
          .animate-wobble,
          .animate-slide-in {
            animation: none !important;
          }
        }
      `}</style>

      <div className="paper-ruled-bg min-h-screen">
        <Navbar />
        <Hero />
        <Marquee />
        <BillingDemo />
        <Features />
        <Steps />
        <DashboardPreview />
        <Pricing />
        <Faq />
        <FinalCta />
        <Footer />
      </div>
    </div>
  );
}

export default Home;
