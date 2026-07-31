import Hero from "../../e-components/hero";
import Updates from "../../e-components/updates";
import Spons from "../../components/spons";
import Footer from "../../components/footer";
export default function News() {
  return (
    <div className="w-full flex flex-col">
      <Hero />
      <Updates />
      <Spons />
      <Footer />
    </div>
  );
}
