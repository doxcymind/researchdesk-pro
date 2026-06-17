/* Ambient drifting research icons — reused from the homepage so every page
   shares the same moving-background motif. Renders fixed, behind content,
   non-interactive, and auto-hides on mobile. */

const ICONS = [
  { icon: '📚', x: '4%',  y: '8%',  size: 26, delay: '0s',   dur: '7s'  },
  { icon: '🔬', x: '9%',  y: '18%', size: 22, delay: '1.5s', dur: '8s'  },
  { icon: '📖', x: '2%',  y: '32%', size: 20, delay: '3s',   dur: '6s'  },
  { icon: '🧬', x: '7%',  y: '46%', size: 18, delay: '0.8s', dur: '9s'  },
  { icon: '🎓', x: '3%',  y: '62%', size: 24, delay: '2s',   dur: '7.5s'},
  { icon: '📝', x: '8%',  y: '75%', size: 20, delay: '4s',   dur: '6.5s'},
  { icon: '🏛',  x: '5%',  y: '88%', size: 22, delay: '1s',   dur: '8.5s'},
  { icon: '📜', x: '88%', y: '6%',  size: 24, delay: '0.5s', dur: '8s'  },
  { icon: '🔭', x: '93%', y: '17%', size: 20, delay: '2.5s', dur: '7s'  },
  { icon: '📊', x: '86%', y: '29%', size: 22, delay: '1.2s', dur: '9s'  },
  { icon: '✏️', x: '91%', y: '42%', size: 18, delay: '3.5s', dur: '6s'  },
  { icon: '📋', x: '87%', y: '56%', size: 20, delay: '0.3s', dur: '7.5s'},
  { icon: '🧪', x: '94%', y: '68%', size: 22, delay: '2.2s', dur: '8s'  },
  { icon: '📌', x: '89%', y: '80%', size: 18, delay: '1.8s', dur: '6.5s'},
  { icon: '🏥', x: '92%', y: '91%', size: 22, delay: '0.7s', dur: '7s'  },
  { icon: '📑', x: '14%', y: '22%', size: 18, delay: '2.8s', dur: '9s'  },
  { icon: '💡', x: '16%', y: '55%', size: 20, delay: '1.1s', dur: '7s'  },
  { icon: '📓', x: '12%', y: '78%', size: 18, delay: '3.2s', dur: '6s'  },
  { icon: '🔍', x: '78%', y: '14%', size: 18, delay: '0.9s', dur: '8s'  },
  { icon: '📄', x: '80%', y: '44%', size: 18, delay: '2.6s', dur: '7s'  },
  { icon: '🩺', x: '76%', y: '72%', size: 20, delay: '1.4s', dur: '9s'  },
  { icon: '🧠', x: '35%', y: '4%',  size: 20, delay: '1.6s', dur: '7s'  },
  { icon: '📒', x: '55%', y: '3%',  size: 18, delay: '3s',   dur: '8.5s'},
  { icon: '💊', x: '70%', y: '5%',  size: 18, delay: '0.4s', dur: '6.5s'},
]

export default function FloatingIcons({ opacity = 0.16 }: { opacity?: number }) {
  return (
    <div aria-hidden className="rd-floating-icons" style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {ICONS.map((f, i) => (
        <div key={i} style={{
          position: 'absolute', left: f.x, top: f.y, fontSize: f.size,
          opacity, filter: 'grayscale(0.25)',
          animation: `rdFloatIcon ${f.dur} ${f.delay} ease-in-out infinite`,
        }}>{f.icon}</div>
      ))}
      <style>{`
        @keyframes rdFloatIcon {
          0%   { transform: translateY(0px) rotate(0deg); }
          25%  { transform: translateY(-10px) rotate(3deg); }
          50%  { transform: translateY(-18px) rotate(-2deg); }
          75%  { transform: translateY(-8px) rotate(4deg); }
          100% { transform: translateY(0px) rotate(0deg); }
        }
        @media (max-width: 768px) { .rd-floating-icons { display: none !important; } }
      `}</style>
    </div>
  )
}
