import Hero from "@/components/hero";
import Legacy from "@/components/legacy";
import Backed from "@/components/backed";
import News from "@/components/news";
import Spons from "@/components/spons";
import Footer from "@/components/footer";

import Deets from "@/components/deets";
import Pillars from "@/components/pillars";
export default function Home() {
  return (
    <div className="w-full flex flex-col">
      <Hero />
      <Deets />
      <Pillars />
      <Legacy />
      <Backed />
      <News />
      <Spons />
      <Footer />
    </div>
  );
}
