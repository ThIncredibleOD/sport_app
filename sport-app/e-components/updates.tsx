"use client";

import {
  Newspaper,
  CheckCircle2,
  Trophy,
  Star,
  Handshake,
  Calendar,
  Bell,
  ArrowRight,
} from "lucide-react";

export default function Updates() {
  return (
    <div className="flex min-h-screen bg-[#0b1329] text-white font-sans">
      {/* Sidebar Navigation */}
      <aside className="hidden lg:flex w-56 flex-col justify-between border-r border-slate-800 p-4">
        <div className="space-y-4">
          <nav className="space-y-1">
            {/* Button 1: All News */}
            <button className="flex w-fulll items-center gap-2.5 rounded-md bg-[#16a34a] px-3 py-2 text-left text-xs font-medium text-white transition hover:bg-[#15803d]">
              <Newspaper className="h-4 w-4" />
              <span>All News</span>
            </button>

            {/* Button 2: Latest Updates */}
            <button className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-xs font-medium text-slate-300 transition hover:bg-slate-800">
              <CheckCircle2 className="h-4 w-4" />
              <span>Latest Updates</span>
            </button>

            {/* Button 3: Tournaments */}
            <button className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-xs font-medium text-slate-300 transition hover:bg-slate-800">
              <Trophy className="h-4 w-4" />
              <span>Tournaments</span>
            </button>

            {/* Button 4: Athlete Spotlight */}
            <button className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-xs font-medium text-slate-300 transition hover:bg-slate-800">
              <Star className="h-4 w-4" />
              <span>Athlete Spotlight</span>
            </button>

            {/* Button 5: Partnerships */}
            <button className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-xs font-medium text-slate-300 transition hover:bg-slate-800">
              <Handshake className="h-4 w-4" />
              <span>Partnerships</span>
            </button>

            {/* Button 6: Events */}
            <button className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-xs font-medium text-slate-300 transition hover:bg-slate-800">
              <Calendar className="h-4 w-4" />
              <span>Events</span>
            </button>

            {/* Button 7: Announcements */}
            <button className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-xs font-medium text-slate-300 transition hover:bg-slate-800">
              <Bell className="h-4 w-4" />
              <span>Announcements</span>
            </button>
          </nav>
        </div>

        {/* Newsletter Section */}
        <div className="border-t border-slate-800 pt-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-100">
            STAY CONNECTED
          </h3>
          <p className="mt-1 text-[11px] text-slate-400">
            Subscribe to get the latest updates and news.
          </p>
          <form className="mt-3 space-y-2" onSubmit={(e) => e.preventDefault()}>
            <input
              type="email"
              placeholder="Enter your email"
              className="w-full rounded-md border border-slate-700 bg-[#0f172a] px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:border-[#16a34a] focus:outline-none"
            />
            <button
              type="submit"
              className="w-full rounded-md bg-green-600 py-1.5 text-xs font-semibold text-white transition hover:bg-green-700"
            >
              Subscribe
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-5">
        {/* Header Bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-xl font-bold tracking-wide">LATEST NEWS</h1>
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <span>Sort by:</span>
            <select className="rounded-md border border-slate-700 bg-[#0f172a] px-2.5 py-1 text-xs text-white focus:outline-none">
              <option value="latest">Latest</option>
              <option value="popular">Popular</option>
            </select>
          </div>
        </div>

        {/* Grid for News Cards */}
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {/* Card 1 */}
          <article className="overflow-hidden rounded-lg border border-slate-800 bg-[#0f192e] transition hover:border-slate-700">
            <div className="relative h-36 w-full">
              <img
                src="/news01.png"
                alt="News"
                className="h-full w-full object-cover"
              />
              <span className="absolute bottom-2 left-2 rounded bg-[#16a34a] px-1.5 py-0.5 text-[10px] font-bold uppercase">
                TOURNAMENTS
              </span>
            </div>
            <div className="p-3.5">
              <h2 className="text-sm font-bold leading-snug">
                Maracana Sports Complex to host Nathaniel Idowu summer camp
              </h2>
              <p className="mt-1 text-[10px] text-slate-400">May 28 2026</p>
              <p className="mt-1 text-xs text-slate-300">
               Anticipating a thrilling experience and promising an unforgettable event for all attendees.
              </p>
              <a
                href="https://thenationonlineng.net/maracana-sports-complex-to-host-nathaniel-idowu-summer-camp/"
                className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#16a34a] hover:underline"
              >
                <span>Read More</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </article>

          {/* Card 2 */}
          <article className="overflow-hidden rounded-lg border border-slate-800 bg-[#0f192e] transition hover:border-slate-700">
            <div className="relative h-36 w-full">
              <img
                src="/news02.png"
                alt="News"
                className="h-full w-full object-cover"
              />
              <span className="absolute bottom-2 left-2 rounded bg-[#16a34a] px-1.5 py-0.5 text-[10px] font-bold uppercase">
                UPDATES
              </span>
            </div>
            <div className="p-3.5">
              <h2 className="text-sm font-bold leading-snug">
                Nathaniel Idowu Foundation To Host Maiden Summer Camp For Young Athletes In Lagos
              </h2>
              <p className="mt-1 text-[10px] text-slate-400">May 28 2026</p>
              <p className="mt-1 text-xs text-slate-300">
                Captivating prices to be won by participants.
              </p>
              <a
                href="https://mediatoday.ng/nathaniel-idowu-foundation-to-host-maiden-summer-camp-for-young-athletes-in-lagos/"
                className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#16a34a] hover:underline"
              >
                <span>Read More</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </article>

          {/* Card 3 */}
          <article className="overflow-hidden rounded-lg border border-slate-800 bg-[#0f192e] transition hover:border-slate-700">
            <div className="relative h-36 w-full">
              <img
                src="/news03.png"
                alt="News"
                className="h-full w-full object-cover"
              />
              <span className="absolute bottom-2 left-2 rounded bg-[#16a34a] px-1.5 py-0.5 text-[10px] font-bold uppercase">
                EVENTS
              </span>
            </div>
            <div className="p-3.5">
              <h2 className="text-sm font-bold leading-snug">
               Organisers pick Maracana Stadium for Nathaniel Idowu Summer Camp
              </h2>
              <p className="mt-1 text-[10px] text-slate-400">May 28 2026</p>
              <p className="mt-1 text-xs text-slate-300">
                Follow the latest updates on the preparations for the upcoming summer camp.
              </p>
              <a
                href="https://guardian.ng/sport/organisers-pick-maracana-stadium-for-nathaniel-idowu-summer-camp/"
                className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#16a34a] hover:underline"
              >
                <span>Read More</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </article>

          {/* Card 4 */}
          <article className="overflow-hidden rounded-lg border border-slate-800 bg-[#0f192e] transition hover:border-slate-700">
            <div className="relative h-36 w-full">
              <img
                src="/news04.png"
                alt="News"
                className="h-full w-full object-cover"
              />
              <span className="absolute bottom-2 left-2 rounded bg-[#16a34a] px-1.5 py-0.5 text-[10px] font-bold uppercase">
                PARTNERSHIPS
              </span>
            </div>
            <div className="p-3.5">
              <h2 className="text-sm font-bold leading-snug">
                Maracana stadium to host Nathaniel Idowu Summer Camp
              </h2>
              <p className="mt-1 text-[10px] text-slate-400">May 28 2026</p>
              <p className="mt-1 text-xs text-slate-300">
                Exciting matchups and great talent on display.
              </p>
              <a
                href="https://punchng.com/maracana-stadium-to-host-nathaniel-idowu-summer-camp/"
                className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#16a34a] hover:underline"
              >
                <span>Read More</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </article>

          {/* Card 5 */}
          <article className="overflow-hidden rounded-lg border border-slate-800 bg-[#0f192e] transition hover:border-slate-700">
            <div className="relative h-36 w-full">
              <img
                src="/news05.png"
                alt="News"
                className="h-full w-full object-cover"
              />
              <span className="absolute bottom-2 left-2 rounded bg-[#16a34a] px-1.5 py-0.5 text-[10px] font-bold uppercase">
                ATHLETE SPOTLIGHT
              </span>
            </div>
            <div className="p-3.5">
              <h2 className="text-sm font-bold leading-snug">
               Nathaniel Idowu Summer Camp 1.0 Kicks Off As 321 Children Begin Month-Long Sports Development Programme
              </h2>
              <p className="mt-1 text-[10px] text-slate-400">May 28 2026</p>
              <p className="mt-1 text-xs text-slate-300">
                New talents to behold
              </p>
              <a
                href="https://www.facebook.com/share/p/1DqWf1DBn4/"
                className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#16a34a] hover:underline"
              >
                <span>Read More</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </article>

         
        </div>

        {/* View All Button */}
        <div className="mt-6 flex justify-center">
          <a href="/news">
          <button className="flex items-center gap-1.5 rounded-md border border-slate-700 bg-[#0f192e] px-5 py-2 text-xs font-medium transition hover:bg-slate-800">
            <span>View All News & Events</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
          </a>
        </div>
      </main>

      {/* Right Sidebar */}
      <aside className="hidden xl:flex w-72 flex-col gap-5 border-l border-slate-800 p-4">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider">
            TRENDING NEWS
          </h2>
          <div className="mt-3 space-y-3">
            {/* Trending Item 1 */}
            <div className="flex gap-2.5">
              <img
                src="/news01.png"
                alt="Trending"
                className="h-12 w-16 rounded object-cover"
              />
              <div>
                <h3 className="text-[11px] font-semibold leading-snug cursor-pointer hover:text-[#16a34a]">
                  Peakline U-17 Team Wins Gold in International Cup
                </h3>
                <p className="mt-0.5 text-[9px] text-slate-400">May 28 2026</p>
              </div>
            </div>

            {/* Trending Item 2 */}
            <div className="flex gap-2.5">
              <img
                src="/news02.png"
                alt="Trending"
                className="h-12 w-16 rounded object-cover"
              />
              <div>
                <h3 className="text-[11px] font-semibold leading-snug cursor-pointer hover:text-[#16a34a]">
                  5 Training Tips Every Young Athlete Should Know
                </h3>
                <p className="mt-0.5 text-[9px] text-slate-400">May 28 2026</p>
              </div>
            </div>

            {/* Trending Item 3 */}
            <div className="flex gap-2.5">
              <img
                src="/news03.png"
                alt="Trending"
                className="h-12 w-16 rounded object-cover"
              />
              <div>
                <h3 className="text-[11px] font-semibold leading-snug cursor-pointer hover:text-[#16a34a]">
                  Behind the scenes of Our Scouting Program
                </h3>
                <p className="mt-0.5 text-[9px] text-slate-400">May 28 2026</p>
              </div>
            </div>

            {/* Trending Item 4 */}
            <div className="flex gap-2.5">
              <img
                src="/news04.png"
                alt="Trending"
                className="h-12 w-16 rounded object-cover"
              />
              <div>
                <h3 className="text-[11px] font-semibold leading-snug cursor-pointer hover:text-[#16a34a]">
                  Peakline Joins Global Sports Alliance
                </h3>
                <p className="mt-0.5 text-[9px] text-slate-400">May 28 2026</p>
              </div>
            </div>
          </div>
        </div>

        {/* Banner Ad Section */}
        <div className="relative min-h-[240px] flex-1 overflow-hidden rounded-lg bg-gradient-to-b from-emerald-900 to-black p-4 flex flex-col justify-between">
          <img src="/news1.png" alt="ad banner" />
        </div>
      </aside>
    </div>
  );
}
