export default function ThoughtFlowBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute top-0 left-0 w-full h-full">
        <div className="absolute top-[10%] left-[5%] w-64 h-64 bg-gradient-to-br from-blue-400/20 to-cyan-400/20 rounded-full blur-3xl animate-[float_15s_ease-in-out_infinite]" />
        <div className="absolute top-[20%] right-[10%] w-96 h-96 bg-gradient-to-br from-violet-400/20 to-purple-400/20 rounded-full blur-3xl animate-[float_18s_ease-in-out_infinite_2s]" />
        <div className="absolute bottom-[15%] left-[15%] w-80 h-80 bg-gradient-to-br from-emerald-400/20 to-teal-400/20 rounded-full blur-3xl animate-[float_20s_ease-in-out_infinite_4s]" />
        <div className="absolute bottom-[25%] right-[5%] w-72 h-72 bg-gradient-to-br from-rose-400/20 to-pink-400/20 rounded-full blur-3xl animate-[float_16s_ease-in-out_infinite_6s]" />
        <div className="absolute top-[40%] left-[30%] w-56 h-56 bg-gradient-to-br from-amber-400/20 to-orange-400/20 rounded-full blur-3xl animate-[float_22s_ease-in-out_infinite_3s]" />
        <div className="absolute top-[60%] right-[25%] w-64 h-64 bg-gradient-to-br from-cyan-400/20 to-blue-400/20 rounded-full blur-3xl animate-[float_19s_ease-in-out_infinite_5s]" />
      </div>

      <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: 'rgb(59, 130, 246)', stopOpacity: 0.4 }}>
              <animate attributeName="stop-color" values="rgb(59,130,246);rgb(139,92,246);rgb(59,130,246)" dur="8s" repeatCount="indefinite" />
            </stop>
            <stop offset="100%" style={{ stopColor: 'rgb(139, 92, 246)', stopOpacity: 0.4 }}>
              <animate attributeName="stop-color" values="rgb(139,92,246);rgb(59,130,246);rgb(139,92,246)" dur="8s" repeatCount="indefinite" />
            </stop>
          </linearGradient>
          <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style={{ stopColor: 'rgb(6, 182, 212)', stopOpacity: 0.4 }}>
              <animate attributeName="stop-color" values="rgb(6,182,212);rgb(16,185,129);rgb(6,182,212)" dur="10s" repeatCount="indefinite" />
            </stop>
            <stop offset="100%" style={{ stopColor: 'rgb(16, 185, 129)', stopOpacity: 0.4 }}>
              <animate attributeName="stop-color" values="rgb(16,185,129);rgb(6,182,212);rgb(16,185,129)" dur="10s" repeatCount="indefinite" />
            </stop>
          </linearGradient>
        </defs>

        <path d="M 100 300 Q 300 100, 500 300 T 900 300" stroke="url(#gradient1)" strokeWidth="2" fill="none" className="animate-[draw_8s_ease-in-out_infinite]" />
        <path d="M 200 150 Q 400 400, 700 150 T 1100 150" stroke="url(#gradient2)" strokeWidth="2" fill="none" className="animate-[draw_10s_ease-in-out_infinite_2s]" />

        <circle cx="200" cy="200" r="6" fill="url(#gradient1)">
          <animate attributeName="r" values="4;8;4" dur="3s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.3;0.8;0.3" dur="3s" repeatCount="indefinite" />
        </circle>
        <circle cx="500" cy="250" r="6" fill="url(#gradient2)">
          <animate attributeName="r" values="4;8;4" dur="4s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.3;0.8;0.3" dur="4s" repeatCount="indefinite" />
        </circle>
        <circle cx="800" cy="180" r="6" fill="url(#gradient1)">
          <animate attributeName="r" values="4;8;4" dur="3.5s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.3;0.8;0.3" dur="3.5s" repeatCount="indefinite" />
        </circle>
      </svg>
    </div>
  );
}
