import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { WIDE_IMAGE } from "@/config";

export default function WideImage() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["-12%", "12%"]);
  return (
    <section className="experience-image section-pad" ref={ref}>
      <div className="wide-image">
        <motion.img src={WIDE_IMAGE} alt="Party lights and crowd" style={{ y }} />
        <div className="wide-overlay">
          <span>THE ROOM WILL BE LOUD.</span>
          <b>BE THERE.</b>
        </div>
      </div>
    </section>
  );
}
