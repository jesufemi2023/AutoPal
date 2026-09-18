import React, { useState } from 'react';
import { useAutoPalStore } from '../shared/store.ts';
import { ArchitectModal } from './ArchitectModal.tsx';
import { 
  Car, Shield, Zap, Database, BarChart3, ChevronRight, CheckCircle2, 
  AlertTriangle, Wrench, Fuel, Sparkles, ArrowUpRight, Lock, Clock, Activity,
  HelpCircle, ChevronDown, Check, Star, Code2, Linkedin
} from 'lucide-react';

interface PresetVehicle {
  make: string;
  model: string;
  year: number;
  mileage: number;
  marketVal: string;
  health: number;
  grade: string;
  nextService: string;
  fuelRate: string;
}

const PRESET_VEHICLES: PresetVehicle[] = [
  {
    make: 'Toyota',
    model: 'Camry',
    year: 2018,
    mileage: 78500,
    marketVal: '₦14,800,000',
    health: 94,
    grade: 'A+',
    nextService: 'Brake Pads & Synthetic Oil in 2,400 KM',
    fuelRate: '12.6 KM/L'
  },
  {
    make: 'Lexus',
    model: 'RX 350',
    year: 2016,
    mileage: 104200,
    marketVal: '₦22,500,000',
    health: 91,
    grade: 'A',
    nextService: 'Transmission Flush & Spark Plugs in 3,800 KM',
    fuelRate: '9.8 KM/L'
  },
  {
    make: 'Honda',
    model: 'Accord',
    year: 2017,
    mileage: 89000,
    marketVal: '₦12,200,000',
    health: 89,
    grade: 'A',
    nextService: 'Serpentine Belt & Coolant Flush in 1,900 KM',
    fuelRate: '11.4 KM/L'
  }
];

const LandingTerminal: React.FC = () => {
  const { setTransientVehicle, setCurrentView } = useAutoPalStore();
  
  // Guest Form State
  const [form, setForm] = useState({
    make: '',
    model: '',
    year: new Date().getFullYear() - 5,
    mileage: 85000
  });

  // Interactive Cockpit Selected Preset
  const [activePresetIndex, setActivePresetIndex] = useState(0);
  const activePreset = PRESET_VEHICLES[activePresetIndex];

  // Interactive Calculator State
  const [calcMake, setCalcMake] = useState('Toyota');
  const [calcYear, setCalcYear] = useState(2018);
  const [calcCommuteKm, setCalcCommuteKm] = useState(1500); // monthly KM

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Architect & Engineering Dossier Modal
  const [isArchitectOpen, setIsArchitectOpen] = useState(false);

  const handleGuestAccess = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!form.make || !form.model) {
      alert("Please enter make and model for the trial report.");
      return;
    }
    setTransientVehicle({
      make: form.make,
      model: form.model,
      year: form.year,
      mileage: form.mileage || 50000
    });
    setCurrentView('report');
  };

  const fillQuickPreset = (preset: PresetVehicle) => {
    setForm({
      make: preset.make,
      model: preset.model,
      year: preset.year,
      mileage: preset.mileage
    });
    const trialSection = document.getElementById('trial-scanner');
    if (trialSection) {
      trialSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Calculator Math
  const calculateSavings = () => {
    const baseValuation = calcMake === 'Lexus' ? 24000000 : calcMake === 'Toyota' ? 14500000 : calcMake === 'Honda' ? 12000000 : 16000000;
    const yearDiff = Math.max(1, 2026 - calcYear);
    const estimatedVehicleVal = Math.round(baseValuation * Math.pow(0.92, yearDiff / 2));
    const resaleTrustPremium = Math.round(estimatedVehicleVal * 0.16); // +16% resale premium
    const breakdownSavings = Math.round((calcCommuteKm * 12 * 0.035) * 650); // Preventative maintenance vs catastrophic engine failure
    const fuelSavings = Math.round((calcCommuteKm * 12 / 10) * 0.12 * 980); // 12% fuel optimization at ~980 NGN/L
    const totalBenefit = resaleTrustPremium + breakdownSavings + fuelSavings;

    return {
      estimatedVehicleVal,
      resaleTrustPremium,
      breakdownSavings,
      fuelSavings,
      totalBenefit
    };
  };

  const savings = calculateSavings();

  const faqs = [
    {
      q: "Is the AutoPal Free Plan really free forever?",
      a: "Yes. You can manage 1 vehicle indefinitely on the free tier. This includes standard maintenance logging, odometer tracking, service history records, and access to the verified mechanic directory with zero credit card required."
    },
    {
      q: "How does AutoPal calibrate for Nigerian road & fuel conditions?",
      a: "Our diagnostic rules and maintenance intervals are specifically weighted for Nigeria's high tropical temperatures, dusty dry seasons, heavy stop-and-go city traffic (e.g. Lagos third mainland bridge & Lekki-Epe corridor), and real pump fuel quality metrics."
    },
    {
      q: "How does the Digital Log increase my vehicle's resale value?",
      a: "Buyers in Nigeria fear hidden flood damage, tampered odometers, and delayed oil changes. When you present an AutoPal Digital Dossier with timestamped service records, verified parts, and vitality scores, buyers have proof of care and routinely pay 15% to 25% higher market prices without aggressive haggling."
    },
    {
      q: "Can I use AutoPal if my car has no digital dashboard or OBD scanner?",
      a: "Absolutely. AutoPal does not require an OBD hardware dongle. You can enter simple mileage updates or describe noises/symptoms in plain English to our AI diagnostic expert, which diagnoses the root cause and suggests exact OEM part numbers."
    }
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans selection:bg-blue-600 selection:text-white w-full overflow-x-hidden">
      
      {/* TOP ANNOUNCEMENT BANNER WITH AUTHOR ATTRIBUTION */}
      <div className="bg-slate-950 text-white px-4 py-2 border-b border-slate-800 text-[11px] font-mono flex items-center justify-between">
        <div className="flex items-center gap-2 mx-auto sm:mx-0">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
          <span className="text-slate-400 hidden sm:inline">Production Telemetry Platform</span>
          <span className="text-slate-500 hidden sm:inline">•</span>
          <span className="text-slate-300">Engineered by <strong className="text-white font-bold">Jesufemi Temitope Solomon</strong></span>
        </div>
        <div className="hidden sm:flex items-center gap-3">
          <button 
            onClick={() => setIsArchitectOpen(true)}
            className="text-blue-400 hover:text-blue-300 font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Code2 size={13} />
            <span>View Architect Dossier</span>
          </button>
          <a 
            href="https://www.linkedin.com/in/temitope-solomon-jesufemi-2620ab275/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-400 hover:text-white transition-colors"
            title="LinkedIn Profile"
          >
            <Linkedin size={13} />
          </a>
        </div>
      </div>

      {/* INDUSTRIAL TOPBAR */}
      <nav className="h-20 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl sticky top-0 z-50 px-6 sm:px-12 flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 bg-slate-950 rounded-xl flex items-center justify-center text-white shadow-md border border-slate-800">
            <Car size={20} strokeWidth={2.5} />
          </div>
          <div>
            <span className="font-black tracking-tight text-lg uppercase text-slate-950 block leading-none">
              AutoPal <span className="text-blue-600">NG</span>
            </span>
            <span className="text-[8px] font-mono font-bold tracking-widest text-slate-400 uppercase">
              Precision Telemetry Platform
            </span>
          </div>
        </div>

        {/* Center Quick Navigation (Desktop) */}
        <div className="hidden md:flex items-center gap-8 text-[11px] font-bold uppercase tracking-wider text-slate-500">
          <a href="#cockpit" className="hover:text-blue-600 transition-colors">Telemetry HUD</a>
          <a href="#calculator" className="hover:text-blue-600 transition-colors">Equity Calculator</a>
          <a href="#trial-scanner" className="hover:text-blue-600 transition-colors">Trial Scan</a>
          <button 
            onClick={() => setIsArchitectOpen(true)}
            className="hover:text-blue-600 text-blue-600 font-black flex items-center gap-1 transition-colors uppercase cursor-pointer"
          >
            <Code2 size={13} />
            <span>Architect Bio</span>
          </button>
          <a href="#faq" className="hover:text-blue-600 transition-colors">FAQ</a>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsArchitectOpen(true)}
            className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-[10px] font-mono font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 md:hidden"
          >
            <Code2 size={12} />
            <span>Architect</span>
          </button>
          <button 
            onClick={() => setCurrentView('garage')}
            className="text-slate-700 hover:text-slate-950 px-4 py-2.5 text-[11px] font-black uppercase tracking-wider transition-colors hidden sm:block"
          >
            Sign In
          </button>
          <button 
            onClick={() => setCurrentView('garage')}
            className="bg-slate-950 text-white px-6 sm:px-8 py-3 rounded-xl font-black uppercase tracking-wider text-[11px] hover:bg-blue-600 transition-all shadow-lg shadow-slate-950/10 active:scale-95 border border-slate-800 flex items-center gap-2"
          >
            <span>Start Free Garage</span>
            <ArrowUpRight size={14} />
          </button>
        </div>
      </nav>

      {/* HERO SECTION WITH INDUSTRIAL GRID */}
      <section className="relative pt-12 pb-20 lg:pt-20 lg:pb-28 border-b border-slate-200/80 bg-cad-grid overflow-hidden">
        {/* Subtle Ambient Vignettes */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/5 blur-[120px] pointer-events-none rounded-full"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-600/5 blur-[120px] pointer-events-none rounded-full"></div>

        <div className="max-w-7xl mx-auto px-6 sm:px-12">
          
          {/* Eyebrow Status Chip */}
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-slate-900 text-white text-[9px] font-mono font-bold uppercase tracking-[0.2em] shadow-sm mb-6 border border-slate-800">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]"></span>
            <span>SYSTEM ACTIVE // NIGERIA REGIONAL TELEMETRY</span>
          </div>

          <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            
            {/* Left Column: Direct High-Conversion Copy */}
            <div className="lg:col-span-6 space-y-8">
              <div className="space-y-4">
                <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-slate-950 uppercase leading-[0.95]">
                  Stop Guessing <br />
                  Your Car's Health. <br />
                  <span className="text-blue-600">Command Its Value.</span>
                </h1>
                <p className="text-slate-600 text-base sm:text-lg font-medium leading-relaxed max-w-xl">
                  The industrial-grade vehicle intelligence platform built for Nigerian driving conditions. Automate servicing, eliminate surprise breakdowns, track every Naira of fuel, and preserve up to <span className="font-bold text-slate-900">₦1.8M in resale equity</span>.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-2">
                <button 
                  onClick={() => setCurrentView('garage')}
                  className="px-8 py-4.5 bg-slate-950 text-white rounded-xl font-black uppercase tracking-wider text-[11px] shadow-2xl hover:bg-blue-600 transition-all active:scale-95 flex items-center justify-center gap-3 border border-slate-800 group"
                >
                  <span>Initialize Free Garage</span>
                  <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </button>
                <a 
                  href="#trial-scanner"
                  className="px-8 py-4.5 bg-white border border-slate-300 text-slate-800 rounded-xl font-black uppercase tracking-wider text-[11px] hover:border-blue-600 hover:text-blue-600 transition-all text-center flex items-center justify-center gap-2 shadow-sm"
                >
                  <span>Instant Guest Scan</span>
                  <Activity size={14} />
                </a>
              </div>

              {/* Conversion Proof Badges */}
              <div className="pt-2 flex flex-wrap items-center gap-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-600" />
                  <span>100% Free Forever Tier</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-600" />
                  <span>Zero Credit Card Required</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-600" />
                  <span>Works On All Makes</span>
                </div>
              </div>

              {/* Metrics Ribbon */}
              <div className="grid grid-cols-3 gap-6 pt-8 border-t border-slate-200">
                <div>
                  <div className="text-3xl font-black font-mono text-slate-950 tracking-tight">1,240+</div>
                  <div className="text-[9px] font-bold uppercase text-slate-400 tracking-wider mt-0.5">Vehicles Monitored</div>
                </div>
                <div>
                  <div className="text-3xl font-black font-mono text-blue-600 tracking-tight">₦240M+</div>
                  <div className="text-[9px] font-bold uppercase text-slate-400 tracking-wider mt-0.5">Equity Preserved</div>
                </div>
                <div>
                  <div className="text-3xl font-black font-mono text-emerald-600 tracking-tight">99.4%</div>
                  <div className="text-[9px] font-bold uppercase text-slate-400 tracking-wider mt-0.5">Diagnostic Accuracy</div>
                </div>
              </div>
            </div>

            {/* Right Column: Industrial Live Cockpit HUD */}
            <div id="cockpit" className="lg:col-span-6">
              <div className="bg-slate-950 rounded-[2rem] p-6 sm:p-8 text-white border border-slate-800 shadow-2xl relative overflow-hidden group">
                
                {/* HUD Header */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping"></div>
                    <div>
                      <span className="text-[9px] font-mono uppercase tracking-[0.25em] text-blue-400 block font-bold">
                        TELEMETRY DOSSIER PREVIEW
                      </span>
                      <span className="text-xl font-black uppercase tracking-tight text-white">
                        {activePreset.year} {activePreset.make} {activePreset.model}
                      </span>
                    </div>
                  </div>
                  <div className="px-3 py-1 bg-white/10 border border-white/15 rounded-lg text-[10px] font-mono text-emerald-400 font-bold">
                    HEALTH GRADE: {activePreset.grade}
                  </div>
                </div>

                {/* Preset Switcher Chips */}
                <div className="flex gap-2 mb-6">
                  {PRESET_VEHICLES.map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActivePresetIndex(idx)}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-mono font-bold uppercase transition-all ${
                        activePresetIndex === idx 
                          ? 'bg-blue-600 text-white shadow-md' 
                          : 'bg-white/5 text-slate-400 hover:bg-white/10'
                      }`}
                    >
                      {p.make} {p.model}
                    </button>
                  ))}
                </div>

                {/* Main Metrics Quadrant */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-white/5 border border-white/10 p-5 rounded-xl">
                    <div className="text-[8px] font-mono font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                      Mechanical Vitality
                    </div>
                    <div className="text-3xl sm:text-4xl font-black font-mono text-emerald-400 tracking-tight">
                      {activePreset.health}%
                    </div>
                    <div className="w-full bg-white/10 h-1.5 rounded-full mt-3 overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${activePreset.health}%` }}></div>
                    </div>
                  </div>

                  <div className="bg-white/5 border border-white/10 p-5 rounded-xl">
                    <div className="text-[8px] font-mono font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                      Fair Market Equity
                    </div>
                    <div className="text-2xl sm:text-3xl font-black font-mono text-blue-400 tracking-tight truncate">
                      {activePreset.marketVal}
                    </div>
                    <div className="text-[8px] font-mono text-slate-400 mt-2">
                      Verified Provenance Premium
                    </div>
                  </div>
                </div>

                {/* Live Diagnostics Alert Row */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3 mb-6">
                  <div className="flex items-center justify-between text-[9px] font-mono uppercase tracking-wider text-slate-400">
                    <span className="flex items-center gap-1.5 text-amber-400">
                      <Clock size={12} />
                      Next Critical Horizon
                    </span>
                    <span className="text-slate-300 font-bold">Odometer: {activePreset.mileage.toLocaleString()} KM</span>
                  </div>
                  <div className="text-sm font-bold text-slate-200">
                    {activePreset.nextService}
                  </div>
                  <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 pt-1 border-t border-white/5">
                    <span>Fuel Metabolic Index:</span>
                    <span className="text-emerald-400 font-bold">{activePreset.fuelRate}</span>
                  </div>
                </div>

                {/* HUD Interactive CTA */}
                <div className="flex items-center justify-between pt-2">
                  <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">
                    AI Diagnostic Engine // Verified
                  </span>
                  <button 
                    onClick={() => fillQuickPreset(activePreset)}
                    className="text-[10px] font-black uppercase tracking-wider text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
                  >
                    <span>Test With This Car</span>
                    <ArrowUpRight size={12} />
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* BEFORE VS AFTER: THE HIGH-IMPACT CONVINCER */}
      <section className="py-20 lg:py-28 border-b border-slate-200/80 bg-white">
        <div className="max-w-7xl mx-auto px-6 sm:px-12">
          
          <div className="max-w-3xl mx-auto text-center space-y-4 mb-16">
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-blue-600 bg-blue-50 border border-blue-200 px-4 py-1.5 rounded-full inline-block">
              THE HARD REALITY OF CAR OWNERSHIP
            </span>
            <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-slate-950 leading-tight">
              Traditional Nigerian Car Ownership vs. <br />
              <span className="text-blue-600">The AutoPal Standard</span>
            </h2>
            <p className="text-slate-500 text-sm sm:text-base font-medium">
              See why hundreds of car owners across Lagos, Abuja, and Port Harcourt switched to our automated telemetry cockpit.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            
            {/* The Harsh Reality */}
            <div className="bg-rose-50/50 border-2 border-rose-200/70 rounded-2xl p-8 sm:p-10 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase tracking-tight text-rose-950">Traditional Car Ownership</h3>
                  <span className="text-[9px] font-mono uppercase font-bold text-rose-600">Risk, Waste & Sudden Breakdowns</span>
                </div>
              </div>

              <ul className="space-y-4 text-sm text-slate-700">
                <li className="flex items-start gap-3">
                  <span className="text-rose-500 font-black text-base shrink-0 mt-0.5">✕</span>
                  <span><strong>Mechanic Guesswork:</strong> Paying for trial-and-error parts replacement when mechanics misdiagnose sensor issues.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-rose-500 font-black text-base shrink-0 mt-0.5">✕</span>
                  <span><strong>Catastrophic Overheating:</strong> Driving until the temperature needle spikes in traffic, warping cylinder heads (₦450k+ repair).</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-rose-500 font-black text-base shrink-0 mt-0.5">✕</span>
                  <span><strong>Silent Fuel Leakage:</strong> Burning 20-30% more fuel without knowing your oxygen sensor or injectors are fouled.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-rose-500 font-black text-base shrink-0 mt-0.5">✕</span>
                  <span><strong>Resale Slaughter:</strong> Buyers knocking ₦1,500,000 off your asking price because you have zero recorded proof of maintenance.</span>
                </li>
              </ul>
            </div>

            {/* The AutoPal Standard */}
            <div className="bg-slate-950 text-white border-2 border-blue-600/40 rounded-2xl p-8 sm:p-10 space-y-6 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 rounded-full blur-2xl pointer-events-none"></div>

              <div className="flex items-center gap-3 relative z-10">
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-600/30">
                  <Shield size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase tracking-tight text-white">The AutoPal Intelligence Engine</h3>
                  <span className="text-[9px] font-mono uppercase font-bold text-blue-400">Precision, Savings & Resale Security</span>
                </div>
              </div>

              <ul className="space-y-4 text-sm text-slate-300 relative z-10">
                <li className="flex items-start gap-3">
                  <span className="text-emerald-400 font-black text-base shrink-0 mt-0.5">✓</span>
                  <span><strong>Neural AI Diagnostics:</strong> Instant symptom triage with exact OEM parts required, protecting you from mechanic fraud.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-emerald-400 font-black text-base shrink-0 mt-0.5">✓</span>
                  <span><strong>Predictive Interval Alerts:</strong> Scheduled notification before fluids burn or brake pads grind into expensive rotors.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-emerald-400 font-black text-base shrink-0 mt-0.5">✓</span>
                  <span><strong>Metabolic Fuel Audit:</strong> Detects engine efficiency dips early, saving up to ₦140,000 on wasted fuel each year.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-emerald-400 font-black text-base shrink-0 mt-0.5">✓</span>
                  <span><strong>Verified Digital Dossier:</strong> Download a bank-grade maintenance certificate that commands maximum resale value.</span>
                </li>
              </ul>
            </div>

          </div>
        </div>
      </section>

      {/* INTERACTIVE VALUE PRESERVATION CALCULATOR */}
      <section id="calculator" className="py-20 lg:py-28 border-b border-slate-200/80 bg-slate-50 bg-cad-grid">
        <div className="max-w-7xl mx-auto px-6 sm:px-12">
          
          <div className="max-w-3xl mx-auto text-center space-y-4 mb-14">
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-emerald-600 bg-emerald-50 border border-emerald-200 px-4 py-1.5 rounded-full inline-block">
              FINANCIAL TELEMETRY SIMULATOR
            </span>
            <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-slate-950">
              Calculate Your 3-Year <br />
              <span className="text-blue-600">Protected Vehicle Equity</span>
            </h2>
            <p className="text-slate-500 text-sm sm:text-base font-medium">
              See the exact Naira amount you will preserve by keeping your vehicle on AutoPal telemetry.
            </p>
          </div>

          <div className="max-w-4xl mx-auto bg-white rounded-3xl border border-slate-200/90 shadow-xl p-8 sm:p-12">
            <div className="grid md:grid-cols-3 gap-6 mb-10">
              
              <div className="space-y-2">
                <label className="text-[10px] font-mono font-bold uppercase text-slate-400 tracking-wider">
                  Vehicle Brand
                </label>
                <select 
                  value={calcMake}
                  onChange={e => setCalcMake(e.target.value)}
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:border-blue-600 outline-none text-sm"
                >
                  <option value="Toyota">Toyota</option>
                  <option value="Lexus">Lexus</option>
                  <option value="Honda">Honda</option>
                  <option value="Mercedes">Mercedes-Benz</option>
                  <option value="Nissan">Nissan</option>
                  <option value="Hyundai">Hyundai / Kia</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-mono font-bold uppercase text-slate-400 tracking-wider">
                  Model Year
                </label>
                <select 
                  value={calcYear}
                  onChange={e => setCalcYear(parseInt(e.target.value))}
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:border-blue-600 outline-none text-sm"
                >
                  {[2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014, 2012].map(yr => (
                    <option key={yr} value={yr}>{yr}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-mono font-bold uppercase text-slate-400 tracking-wider">
                  Monthly Commute
                </label>
                <select 
                  value={calcCommuteKm}
                  onChange={e => setCalcCommuteKm(parseInt(e.target.value))}
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:border-blue-600 outline-none text-sm"
                >
                  <option value={800}>Light Commute (~800 KM/mo)</option>
                  <option value={1500}>Average Nigerian Commute (~1,500 KM/mo)</option>
                  <option value={2500}>High Mileage / Interstate (~2,500 KM/mo)</option>
                </select>
              </div>

            </div>

            {/* Calculated Breakdown Display */}
            <div className="bg-slate-950 text-white rounded-2xl p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 border-b border-white/10 pb-6">
                <div>
                  <span className="text-[9px] font-mono uppercase tracking-[0.25em] text-emerald-400 font-bold block">
                    TOTAL 3-YEAR PROTECTED VALUE
                  </span>
                  <div className="text-3xl sm:text-5xl font-black font-mono text-white tracking-tight mt-1">
                    ₦{savings.totalBenefit.toLocaleString()}
                  </div>
                </div>
                <div className="text-left sm:text-right text-[11px] font-mono text-slate-400">
                  Estimated Asset Value: <span className="text-white font-bold">₦{savings.estimatedVehicleVal.toLocaleString()}</span>
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-6 text-sm">
                <div className="space-y-1">
                  <div className="text-[9px] font-mono uppercase text-slate-400">Resale Trust Premium</div>
                  <div className="text-xl font-mono font-bold text-emerald-400">
                    +₦{savings.resaleTrustPremium.toLocaleString()}
                  </div>
                  <div className="text-[9px] text-slate-400">Backed by verified digital audit trail</div>
                </div>

                <div className="space-y-1">
                  <div className="text-[9px] font-mono uppercase text-slate-400">Preventative Repair Savings</div>
                  <div className="text-xl font-mono font-bold text-blue-400">
                    +₦{savings.breakdownSavings.toLocaleString()}
                  </div>
                  <div className="text-[9px] text-slate-400">Avoids catastrophic powertrain faults</div>
                </div>

                <div className="space-y-1">
                  <div className="text-[9px] font-mono uppercase text-slate-400">Fuel Optimization</div>
                  <div className="text-xl font-mono font-bold text-amber-400">
                    +₦{savings.fuelSavings.toLocaleString()}
                  </div>
                  <div className="text-[9px] text-slate-400">Eliminates undetected fuel burn spikes</div>
                </div>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-between items-center">
                <span className="text-[10px] font-mono text-slate-400">
                  Zero setup fee • Automatic mileage calculations
                </span>
                <button 
                  onClick={() => setCurrentView('garage')}
                  className="w-full sm:w-auto px-8 py-3.5 bg-blue-600 text-white rounded-xl font-black uppercase tracking-wider text-[11px] hover:bg-blue-500 transition-all shadow-lg active:scale-95"
                >
                  Claim This Record Free →
                </button>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* CORE 4-PILLAR INDUSTRIAL CAPABILITIES */}
      <section className="py-20 lg:py-28 border-b border-slate-200/80 bg-white">
        <div className="max-w-7xl mx-auto px-6 sm:px-12">
          
          <div className="max-w-3xl mx-auto text-center space-y-4 mb-16">
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-blue-600 bg-blue-50 border border-blue-200 px-4 py-1.5 rounded-full inline-block">
              PRECISION CAPABILITIES
            </span>
            <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-slate-950">
              Engineered For The Demands Of <br />
              <span className="text-blue-600">Modern Vehicle Ownership</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-8 space-y-5 hover:border-blue-400 hover:shadow-lg transition-all group">
              <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/20">
                <Sparkles size={22} />
              </div>
              <h3 className="text-lg font-black uppercase tracking-tight text-slate-950 group-hover:text-blue-600 transition-colors">
                Neural Diagnostics
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Describe squeaks, vibration speeds, or warning lights. Our Gemini engine provides root cause triage and OEM part numbers in seconds.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-8 space-y-5 hover:border-emerald-400 hover:shadow-lg transition-all group">
              <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
                <Fuel size={22} />
              </div>
              <h3 className="text-lg font-black uppercase tracking-tight text-slate-950 group-hover:text-emerald-600 transition-colors">
                Fuel Metabolism
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Compute true KM/L with Nigerian pump price calibration. Get alerted when sudden efficiency dips indicate clogged injectors or vacuum leaks.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-8 space-y-5 hover:border-indigo-400 hover:shadow-lg transition-all group">
              <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
                <Database size={22} />
              </div>
              <h3 className="text-lg font-black uppercase tracking-tight text-slate-950 group-hover:text-indigo-600 transition-colors">
                Immutable History
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Build an authenticated digital record of all oil changes, brake pads, and timing belts that future buyers can verify with zero suspicion.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-8 space-y-5 hover:border-slate-800 hover:shadow-lg transition-all group">
              <div className="w-12 h-12 rounded-xl bg-slate-950 text-white flex items-center justify-center shadow-md">
                <BarChart3 size={22} />
              </div>
              <h3 className="text-lg font-black uppercase tracking-tight text-slate-950 group-hover:text-blue-600 transition-colors">
                Resale Equity Index
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Real-time Nigerian market price benchmarks and condition-weighted valuation to help you buy, sell, or trade at peak profit.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* INSTANT TRIAL SCANNER TERMINAL */}
      <section id="trial-scanner" className="py-20 lg:py-28 border-b border-slate-200/80 bg-slate-950 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-cad-grid-dark pointer-events-none opacity-40"></div>

        <div className="max-w-4xl mx-auto px-6 sm:px-12 relative z-10 space-y-12">
          
          <div className="text-center space-y-4">
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-blue-400 bg-white/10 border border-white/15 px-4 py-1.5 rounded-full inline-block">
              ONE-CLICK GUEST ACCESS // NO PASSWORD REQUIRED
            </span>
            <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-white">
              Generate A Free <br />
              <span className="text-blue-500">Vehicle Service Plan</span>
            </h2>
            <p className="text-slate-400 text-sm sm:text-base font-medium max-w-lg mx-auto">
              Test the platform right now. Enter your car details below to receive a custom AI maintenance schedule and wear analysis instantly.
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 p-8 sm:p-12 rounded-3xl backdrop-blur-xl shadow-2xl">
            
            {/* Quick-Pick Vehicle Badges */}
            <div className="mb-8">
              <span className="text-[9px] font-mono uppercase text-slate-400 font-bold block mb-3">
                Quick fill with popular Nigerian models:
              </span>
              <div className="flex flex-wrap gap-2">
                {[
                  { make: 'Toyota', model: 'Corolla', year: 2016, mileage: 92000 },
                  { make: 'Lexus', model: 'ES 350', year: 2015, mileage: 112000 },
                  { make: 'Honda', model: 'CR-V', year: 2018, mileage: 84000 },
                  { make: 'Mercedes', model: 'C 300', year: 2017, mileage: 98000 }
                ].map((sample, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setForm(sample)}
                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[10px] font-mono transition-colors border border-white/10"
                  >
                    {sample.year} {sample.make} {sample.model}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleGuestAccess} className="grid sm:grid-cols-2 gap-6 text-left">
              <div className="space-y-2">
                <label className="text-[10px] font-mono font-bold text-slate-300 uppercase tracking-wider">
                  Vehicle Brand / Make *
                </label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Toyota, Lexus, Honda" 
                  className="w-full px-5 py-4 bg-white/10 border border-white/20 rounded-xl focus:border-blue-500 focus:bg-white/15 outline-none transition font-bold text-white placeholder:text-slate-500 text-sm"
                  value={form.make}
                  onChange={e => setForm({...form, make: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-mono font-bold text-slate-300 uppercase tracking-wider">
                  Vehicle Model *
                </label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Camry, RX350, Civic" 
                  className="w-full px-5 py-4 bg-white/10 border border-white/20 rounded-xl focus:border-blue-500 focus:bg-white/15 outline-none transition font-bold text-white placeholder:text-slate-500 text-sm"
                  value={form.model}
                  onChange={e => setForm({...form, model: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-mono font-bold text-slate-300 uppercase tracking-wider">
                  Model Year
                </label>
                <input 
                  type="number" 
                  min={1990}
                  max={new Date().getFullYear() + 1}
                  className="w-full px-5 py-4 bg-white/10 border border-white/20 rounded-xl focus:border-blue-500 focus:bg-white/15 outline-none transition font-bold text-white placeholder:text-slate-500 text-sm font-mono"
                  value={form.year}
                  onChange={e => setForm({...form, year: parseInt(e.target.value) || 2018})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-mono font-bold text-slate-300 uppercase tracking-wider">
                  Current Odometer (KM)
                </label>
                <input 
                  type="number" 
                  placeholder="e.g. 85000"
                  className="w-full px-5 py-4 bg-white/10 border border-white/20 rounded-xl focus:border-blue-500 focus:bg-white/15 outline-none transition font-bold text-white placeholder:text-slate-500 text-sm font-mono"
                  value={form.mileage || ''}
                  onChange={e => setForm({...form, mileage: parseInt(e.target.value) || 0})}
                />
              </div>

              <button 
                type="submit"
                className="sm:col-span-2 mt-4 bg-blue-600 text-white py-5 rounded-xl font-black uppercase tracking-wider text-[11px] shadow-2xl hover:bg-blue-500 transition-all active:scale-95 flex items-center justify-center gap-2 border border-blue-400"
              >
                <span>Generate Instant Telemetry Report</span>
                <ChevronRight size={16} />
              </button>
            </form>

            <div className="mt-6 flex items-center justify-center gap-2 text-slate-400 text-[10px] font-mono">
              <Lock size={12} />
              <span>No signup or card required for your guest trial report</span>
            </div>

          </div>

        </div>
      </section>

      {/* DRIVER TESTIMONIALS */}
      <section className="py-20 lg:py-28 border-b border-slate-200/80 bg-white">
        <div className="max-w-7xl mx-auto px-6 sm:px-12">
          
          <div className="max-w-3xl mx-auto text-center space-y-4 mb-16">
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-slate-500 bg-slate-100 border border-slate-200 px-4 py-1.5 rounded-full inline-block">
              COMMUNITY EVIDENCE
            </span>
            <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-slate-950">
              Trusted By Smart Car Owners <br />
              <span className="text-blue-600">Across Nigeria</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-8 space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex gap-1 text-amber-500">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={14} fill="currentColor" />
                  ))}
                </div>
                <p className="text-sm text-slate-700 leading-relaxed italic">
                  "AutoPal diagnosed a squeal in my 2017 Corolla as brake slide pin seizure, not a bad caliper as my mechanic claimed. Saved me over ₦85,000 on unnecessary parts."
                </p>
              </div>
              <div className="pt-4 border-t border-slate-200">
                <div className="font-black text-slate-900 text-sm">Tunde A.</div>
                <div className="text-[10px] font-mono text-slate-500 uppercase">Lekki, Lagos • 2017 Toyota Corolla</div>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-8 space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex gap-1 text-amber-500">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={14} fill="currentColor" />
                  ))}
                </div>
                <p className="text-sm text-slate-700 leading-relaxed italic">
                  "I sold my 2015 Lexus RX 350 for ₦1,200,000 above the initial buyer offers because I had the complete AutoPal verified service dossier with timestamped records."
                </p>
              </div>
              <div className="pt-4 border-t border-slate-200">
                <div className="font-black text-slate-900 text-sm">Dr. Chidinma O.</div>
                <div className="text-[10px] font-mono text-slate-500 uppercase">Maitama, Abuja • 2015 Lexus RX 350</div>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-8 space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex gap-1 text-amber-500">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={14} fill="currentColor" />
                  ))}
                </div>
                <p className="text-sm text-slate-700 leading-relaxed italic">
                  "The fuel metabolic tracker caught an oxygen sensor failure on my Honda before the check engine light even triggered. My monthly fuel bill dropped from ₦180k to ₦145k."
                </p>
              </div>
              <div className="pt-4 border-t border-slate-200">
                <div className="font-black text-slate-900 text-sm">Engr. Kenneth E.</div>
                <div className="text-[10px] font-mono text-slate-500 uppercase">Port Harcourt • 2018 Honda Accord</div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* REASSURING FAQ ACCORDION */}
      <section id="faq" className="py-20 lg:py-28 border-b border-slate-200/80 bg-slate-50">
        <div className="max-w-4xl mx-auto px-6 sm:px-12 space-y-12">
          
          <div className="text-center space-y-4">
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-slate-500 bg-white border border-slate-200 px-4 py-1.5 rounded-full inline-block">
              QUESTIONS & ANSWERS
            </span>
            <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-slate-950">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div 
                  key={idx} 
                  className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden transition-all shadow-sm"
                >
                  <button 
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full p-6 text-left flex items-center justify-between gap-4 font-bold text-slate-950 text-base hover:text-blue-600 transition-colors"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown size={18} className={`shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180 text-blue-600' : 'text-slate-400'}`} />
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-6 text-slate-600 text-sm leading-relaxed border-t border-slate-100 pt-4">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* FINAL HIGH-CONVERSION BOTTOM BANNER */}
      <section className="py-20 lg:py-28 bg-slate-950 text-white relative overflow-hidden text-center">
        <div className="max-w-4xl mx-auto px-6 sm:px-12 space-y-8 relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-blue-600/20 text-blue-400 border border-blue-500/30 text-[10px] font-mono font-bold uppercase">
            <span>GET STARTED IN 30 SECONDS</span>
          </div>

          <h2 className="text-4xl sm:text-6xl font-black uppercase tracking-tight text-white leading-none">
            Ready To Protect Your <br />
            <span className="text-blue-500">Most Expensive Asset?</span>
          </h2>

          <p className="text-slate-400 text-base max-w-xl mx-auto">
            Join thousands of smart car owners who save money, prevent unexpected breakdowns, and preserve true vehicle equity.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <button 
              onClick={() => setCurrentView('garage')}
              className="px-10 py-5 bg-blue-600 text-white rounded-xl font-black uppercase tracking-wider text-[11px] shadow-2xl hover:bg-blue-500 transition-all active:scale-95 border border-blue-400"
            >
              Start Free Garage →
            </button>
            <a 
              href="#trial-scanner"
              className="px-10 py-5 bg-white/10 text-white rounded-xl font-black uppercase tracking-wider text-[11px] hover:bg-white/20 transition-all border border-white/15"
            >
              Run Instant Test Scan
            </a>
          </div>
        </div>
      </section>

      {/* INDUSTRIAL FOOTER */}
      <footer className="py-12 border-t border-slate-200/80 bg-white text-slate-600 text-xs">
        <div className="max-w-7xl mx-auto px-6 sm:px-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-slate-950 rounded-lg flex items-center justify-center text-white">
              <Car size={16} strokeWidth={2.5} />
            </div>
            <span className="font-black tracking-tight text-sm uppercase text-slate-950">AutoPal NG</span>
            <span className="text-[10px] font-mono text-slate-400 ml-2">v4.2.0 • Precision Telemetry</span>
          </div>

          {/* Centered Author Attribution Button */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsArchitectOpen(true)}
              className="px-4 py-2 bg-slate-900 hover:bg-blue-600 text-white rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <Code2 size={14} className="text-blue-400" />
              <span>Engineered by Jesufemi Temitope Solomon</span>
            </button>
            <a 
              href="https://www.linkedin.com/in/temitope-solomon-jesufemi-2620ab275/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="p-2 bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 rounded-xl transition-colors"
              title="Author LinkedIn"
            >
              <Linkedin size={16} />
            </a>
          </div>

          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-widest text-center md:text-right">
            Engineered For Nigerian Climate & High-Value Vehicle Preservation
          </div>
        </div>
      </footer>

      {/* LEAD ARCHITECT & SYSTEM DOSSIER MODAL */}
      <ArchitectModal 
        isOpen={isArchitectOpen} 
        onClose={() => setIsArchitectOpen(false)} 
      />

    </div>
  );
};

export default LandingTerminal;
