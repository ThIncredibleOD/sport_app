import { Calendar, Trophy, Users, Globe } from "lucide-react";

export default function Impact() {
  return (
    <section className="bg-[#0f172a] text-slate-100 p-8 font-sans w-full border-b border-slate-700">
      {/* Header Section */}
      <div className="flex items-center justify-center gap-3 mb-10 w-full">
        <div className="h-[1.5px] w-16 bg-green-500"></div>
        <h2 className="text-[20px] font-bold uppercase tracking-widest text-white">
          Our Impact So Far
        </h2>
        <div className="h-[1.5px] w-16 bg-green-500"></div>
      </div>

      {/* Grid Container for Cards */}
      <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
        {/* Card 1: Athletes */}
        <div className="relative overflow-hidden border border-slate-800 rounded-2xl aspect-[4/3] shadow-lg group">
          <div
            className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
            style={{ backgroundImage: `url('/impact1.jpg')` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-900/40" />

          <div className="absolute inset-0 p-5 flex flex-col justify-between z-10">
            <div className="flex items-start justify-start">
              {/* Maintained the exact padding & layout sizes, increased icon size inside */}
              <div className="p-2 rounded-full border border-green-500/40 bg-slate-950/60 backdrop-blur-sm">
                <Calendar className="w-6 h-6 text-green-500" />
              </div>
            </div>
            <div className="text-left space-y-1">
              <span className="text-2xl font-black text-emerald-600 tracking-tight block">
                2000+
              </span>
              <p className="text-[11px] font-bold text-slate-200 uppercase tracking-wide leading-tight">
                Athletes Developed
              </p>
            </div>
          </div>
        </div>

        {/* Card 2: Leagues */}
        <div className="relative overflow-hidden border border-slate-800 rounded-2xl aspect-[4/3] shadow-lg group">
          <div
            className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
            style={{ backgroundImage: `url('/impact2.jpg')` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-900/40" />

          <div className="absolute inset-0 p-5 flex flex-col justify-between z-10">
            <div className="flex items-start justify-start">
              <div className="p-2 rounded-full border border-green-500/40 bg-slate-950/60 backdrop-blur-sm">
                <Trophy className="w-6 h-6 text-green-500" />
              </div>
            </div>
            <div className="text-left space-y-1">
              <span className="text-2xl font-black text-emerald-600 tracking-tight block">
                50+
              </span>
              <p className="text-[11px] font-bold text-slate-200 uppercase tracking-wide leading-tight">
                Leagues Organized
              </p>
            </div>
          </div>
        </div>

        {/* Card 3: Communities */}
        <div className="relative overflow-hidden border border-slate-800 rounded-2xl aspect-[4/3] shadow-lg group">
          <div
            className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
            style={{ backgroundImage: `url('/news.png')` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-900/40" />

          <div className="absolute inset-0 p-5 flex flex-col justify-between z-10">
            <div className="flex items-start justify-start">
              <div className="p-2 rounded-full border border-green-500/40 bg-slate-950/60 backdrop-blur-sm">
                <Users className="w-6 h-6 text-green-500" />
              </div>
            </div>
            <div className="text-left space-y-1">
              <span className="text-2xl font-black text-emerald-600 tracking-tight block">
                100+
              </span>
              <p className="text-[11px] font-bold text-slate-200 uppercase tracking-wide leading-tight">
                Communities Reached
              </p>
            </div>
          </div>
        </div>

        {/* Card 4: Partners */}
        <div className="relative overflow-hidden border border-slate-800 rounded-2xl aspect-[4/3] shadow-lg group">
          <div
            className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
            style={{ backgroundImage: `url('/impact3.png')` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-900/40" />

          <div className="absolute inset-0 p-5 flex flex-col justify-between z-10">
            <div className="flex items-start justify-start">
              <div className="p-2 rounded-full border border-green-500/40 bg-slate-950/60 backdrop-blur-sm">
                <Globe className="w-6 h-6 text-green-500" />
              </div>
            </div>
            <div className="text-left space-y-1">
              <span className="text-2xl font-black text-emerald-600 tracking-tight block">
                10+
              </span>
              <p className="text-[11px] font-bold text-slate-200 uppercase tracking-wide leading-tight">
                Partner Organizations
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
