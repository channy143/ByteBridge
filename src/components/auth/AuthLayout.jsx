import { useNavigate } from 'react-router-dom';
import { Layout, ArrowLeft } from 'lucide-react';

export default function AuthLayout({ children, showBack = true }) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left brand panel — desktop only */}
      <div className="hidden lg:flex w-1/2 relative bg-primary-950 overflow-hidden">
        <div className="absolute inset-0 bg-grid-navy"></div>
        <div className="absolute inset-0 bg-gradient-to-tr from-primary-950 via-primary-950/90 to-primary-900/60"></div>

        <div className="relative z-10 w-full h-full flex flex-col justify-center px-12 xl:px-20 py-16">
          {/* Brand */}
          <div className="flex items-center mb-10">
            <div className="h-11 w-11 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center">
              <Layout className="h-6 w-6 text-white" />
            </div>
            <span className="ml-3 text-2xl font-extrabold tracking-tight text-white">ByteBridge</span>
          </div>

          {/* Decorative accent line */}
          <div className="w-12 h-[3px] bg-primary-400 rounded-full mb-7"></div>

          <h1 className="text-4xl xl:text-5xl font-extrabold leading-[1.1] tracking-tight text-white max-w-md">
            Bridging Learning
            <br />
            <span className="text-primary-300">with Technology</span>
          </h1>

          <p className="mt-7 text-primary-100/80 text-base leading-relaxed max-w-sm">
            An educational space for BTLED ICT students and teachers to learn, collaborate, and grow through technology.
          </p>
        </div>

        <p className="absolute bottom-10 left-12 xl:left-20 text-xs uppercase tracking-[0.22em] text-primary-200/70">
          Educational Portal for BTLED ICT Majors
        </p>
      </div>

      {/* Right auth panel */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Mobile brand header */}
        <div className="lg:hidden flex items-center justify-between px-6 h-16 border-b border-slate-100">
          <div className="flex items-center">
            <div className="h-8 w-8 rounded-lg bg-primary-950 flex items-center justify-center">
              <Layout className="h-4 w-4 text-white" />
            </div>
            <span className="ml-2 font-extrabold text-lg text-primary-950 tracking-tight">ByteBridge</span>
          </div>
          <span className="text-[10px] uppercase tracking-wider text-slate-400">BTLED ICT</span>
        </div>

        <div className="flex-1 flex items-center justify-center px-6 sm:px-12 py-8">
          <div className="w-full max-w-[440px]">
            {showBack && (
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="mb-6 inline-flex items-center text-sm font-medium text-slate-500 hover:text-primary-900 transition-colors group"
                aria-label="Go back"
              >
                <ArrowLeft className="w-4 h-4 mr-1.5 transition-transform group-hover:-translate-x-0.5" />
                Back
              </button>
            )}
            {children}
          </div>
        </div>

        <div className="px-6 pb-6 text-center text-xs text-slate-400">
          ByteBridge · Educational Portal for BTLED ICT Majors
        </div>
      </div>
    </div>
  );
}
