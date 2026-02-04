import { Gift } from 'lucide-react';

export default function App() {
  return (
    <div className="size-full flex items-center justify-center bg-gray-50">
      <div 
        className="w-[520px] rounded-[40px] px-8 pt-8 pb-6 shadow-lg"
        style={{
          background: `
            radial-gradient(circle 130px at 50% 0%, #FCE7D2 0%, #FCE7D2 30%, transparent 85%),
            radial-gradient(ellipse 400px 180px at 50% 25%, #C5D4EB 0%, rgba(232, 237, 245, 0.4) 60%, transparent 100%),
            #FFFFFF
          `
        }}
      >
        {/* Main heading with gift icon */}
        <div className="flex items-center justify-between mb-16">
          <h1 className="text-[32px] leading-tight font-semibold tracking-tight whitespace-nowrap">
            <span className="text-gray-900">Afternoon, Sunshine</span>
          </h1>
          <div className="bg-white/40 backdrop-blur-sm rounded-full p-3 flex items-center justify-center">
            <Gift className="w-6 h-6 text-[#6B7FA0]" strokeWidth={2} />
          </div>
        </div>
        
        {/* Days row */}
        <div className="flex items-center justify-between">
          {[1, 2, 3, 4, 5, 6, 7].map((day, index) => (
            <div key={day} className="flex flex-col items-center gap-1">
              <span className={`text-[13px] ${index === 0 ? 'text-gray-800 font-medium' : 'text-gray-600/70'}`}>
                Day
              </span>
              <div className="bg-white/60 backdrop-blur-2xl rounded-full w-12 h-12 flex items-center justify-center border border-white/90 shadow-[0_4px_12px_rgba(0,0,0,0.08),inset_0_1px_2px_rgba(255,255,255,0.5)]">
                <span className={`text-[22px] font-medium ${index === 0 ? 'text-gray-900' : 'text-gray-600/60'}`}>
                  {day}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}