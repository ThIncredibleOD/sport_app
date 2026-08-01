import Hero from "../../d-components/hero";
import Purpose from "../../d-components/purpose";
import Story from "../../d-components/story";
import Impact from "../../d-components/impact";
import Why from "../../d-components/why";
import Partner from "../../d-components/partner";
import Spons from "../../components/spons";
import Footer from "../../components/footer";
export default function AboutUs() {
  return (
    <div className="w-full flex flex-col">
      <Hero />
      <Purpose />
      <Story />
      <Impact />
      <Why />
      <Partner />
      <Spons />
      <Footer />
    </div>
  );
}
