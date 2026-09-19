import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout, ArrowLeft } from 'lucide-react';

const SLIDESHOW_IMAGES = [
  {
    url: 'https://picsum.photos/seed/he-cooking/1200/800',
    alt: 'Cooking and food preparation',
  },
  {
    url: 'https://picsum.photos/seed/ia-woodwork/1200/800',
    alt: 'Industrial arts woodworking',
  },
  {
    url: 'https://picsum.photos/seed/he-sewing/1200/800',
    alt: 'Sewing and textiles',
  },
  {
    url: 'https://picsum.photos/seed/ia-electronics/1200/800',
    alt: 'Electronics and circuitry',
  },
  {
    url: 'https://picsum.photos/seed/he-baking/1200/800',
    alt: 'Baking and pastry',
  },
  {
    url: 'https://picsum.photos/seed/ia-drafting/1200/800',
    alt: 'Technical drafting and design',
  },
  {
    url: 'https://picsum.photos/seed/he-interior/1200/800',
    alt: 'Interior design and home management',
  },
  {
    url: 'https://picsum.photos/seed/ia-welding/1200/800',
    alt: 'Welding and metalwork',
  },
];

const SLIDE_INTERVAL = 5000;

export default function AuthLayout({ children, showBack = false }) {
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);

  const next = useCallback(() => {
    setCurrent((i) => (i + 1) % SLIDESHOW_IMAGES.length);
  }, []);

  useEffect(() => {
    const id = setInterval(next, SLIDE_INTERVAL);
    return () => clearInterval(id);
  }, [next]);

  return (
    <>
      <style>{`
        .auth-slide {
          position: absolute;
          inset: 0;
          background-size: cover;
          background-position: center;
          opacity: 0;
          transition: opacity 1.2s ease-in-out;
          will-change: opacity;
        }
        .auth-slide.active {
          opacity: 1;
          z-index: 1;
        }
      `}</style>
      <div className="min-h-screen lg:h-screen w-full flex bg-white lg:overflow-hidden">
        {/* Left brand panel — desktop only, pinned and non-scrollable */}
        <div className="hidden lg:flex w-1/2 h-full relative bg-primary-950 overflow-hidden flex-shrink-0 select-none">
          {/* Slideshow background */}
          <div className="absolute inset-0">
            {SLIDESHOW_IMAGES.map((img, i) => (
              <div
                key={img.url}
                className={`auth-slide ${i === current ? 'active' : ''}`}
                style={{ backgroundImage: `url(${img.url})` }}
                role="img"
                aria-label={img.alt}
              />
            ))}
          </div>

          {/* Overlay gradient for text readability */}
          <div className="absolute inset-0 bg-gradient-to-tr from-primary-950/80 via-primary-950/50 to-primary-900/30 z-[2]" />
          {/* Left dark fade */}
          <div className="absolute inset-0 z-[3]" style={{ background: 'linear-gradient(to right, rgba(2,6,23,0.85) 0%, rgba(2,6,23,0.5) 40%, transparent 70%)' }} />
          {/* Right dark fade */}
          <div className="absolute inset-0 z-[3]" style={{ background: 'linear-gradient(to left, rgba(2,6,23,0.7) 0%, transparent 50%)' }} />

          {/* Content */}
          <div className="relative z-10 w-full h-full flex flex-col justify-center pl-10 xl:pl-14 pr-8 py-10">
            {/* Brand */}
            <div className="flex items-center mb-6">
              <div className="h-9 w-9 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center backdrop-blur-sm">
                <Layout className="h-5 w-5 text-white" />
              </div>
              <span className="ml-2.5 text-xl font-extrabold tracking-tight text-white">ByteBridge</span>
            </div>

            {/* Decorative accent line */}
            <div className="w-10 h-[3px] bg-primary-400 rounded-full mb-5"></div>

            <h1 className="text-3xl xl:text-4xl font-extrabold leading-tight tracking-tight text-white max-w-sm">
              Bridging Learning
              <br />
              <span className="text-primary-300">with Technology</span>
            </h1>

            <p className="mt-5 text-primary-100/80 text-[13.5px] leading-relaxed max-w-xs">
              An educational space for BTLED ICT students and teachers to learn, collaborate, and grow through technology.
            </p>

            <p className="mt-3 text-[11px] uppercase tracking-[0.2em] text-primary-200/70">
              Educational Portal for BTLED ICT Majors
            </p>
          </div>
        </div>

        {/* Right auth panel — independent scroll container */}
        <div className="flex-1 flex flex-col min-h-screen lg:min-h-0 lg:h-full lg:overflow-y-auto">
          {/* Mobile brand header */}
          <div className="lg:hidden flex items-center justify-between px-5 h-14 border-b border-slate-100 flex-shrink-0">
            <div className="flex items-center">
              <div className="h-7 w-7 rounded-lg bg-primary-950 flex items-center justify-center">
                <Layout className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="ml-2 font-extrabold text-base text-primary-950 tracking-tight">ByteBridge</span>
            </div>
            <span className="text-[10px] uppercase tracking-wider text-slate-400">BTLED ICT</span>
          </div>

          <div className="flex-1 flex flex-col justify-center px-5 sm:px-10 py-6 min-h-full">
            <div className="w-full max-w-[400px] mx-auto my-auto">
              {showBack && (
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="mb-4 inline-flex items-center text-xs font-medium text-slate-500 hover:text-primary-900 transition-colors group"
                  aria-label="Go back"
                >
                  <ArrowLeft className="w-3.5 h-3.5 mr-1 transition-transform group-hover:-translate-x-0.5" />
                  Back
                </button>
              )}
              {children}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
