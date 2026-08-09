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
      <div className="min-h-screen flex bg-white">
        {/* Left brand panel — desktop only */}
        <div className="hidden lg:flex w-1/2 relative bg-primary-950 overflow-hidden">
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
          <div className="relative z-10 w-full h-full flex flex-col justify-center pl-[100px] xl:pl-[120px] pr-12 py-16">
            {/* Brand */}
            <div className="flex items-center mb-10">
              <div className="h-11 w-11 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center backdrop-blur-sm">
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

            <p className="mt-4 text-xs uppercase tracking-[0.22em] text-primary-200/70">
              Educational Portal for BTLED ICT Majors
            </p>
          </div>
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
        </div>
      </div>
    </>
  );
}
