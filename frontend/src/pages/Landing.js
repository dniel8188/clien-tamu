import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { motion } from "framer-motion";
import { Camera, ArrowRight, Lock } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Landing() {
  const [demo, setDemo] = useState(null);

  useEffect(() => {
    axios
      .get(`${API}/public/galleries/arsa-demo`)
      .then((r) => setDemo(r.data))
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-[#FBF9F5] text-[#2A2523]">
      <header className="flex items-center justify-between px-6 sm:px-12 py-6">
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5 text-[#C6A052]" />
          <span className="font-serif text-2xl tracking-tight">Arsa Gallery</span>
        </div>
        <Link
          to="/admin/login"
          data-testid="landing-admin-link"
          className="flex items-center gap-2 text-sm text-[#756B64] hover:text-[#2A2523] transition-colors"
        >
          <Lock className="w-4 h-4" /> Admin
        </Link>
      </header>

      <main className="px-6 sm:px-12 max-w-6xl mx-auto">
        <section className="pt-16 sm:pt-24 pb-14 max-w-3xl">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-xs tracking-[0.3em] uppercase text-[#C6A052] mb-6"
          >
            Wedding Photography · Multi-Client Gallery
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.05 }}
            className="font-serif font-light text-4xl sm:text-5xl lg:text-6xl leading-[1.05] tracking-tight"
          >
            Momen indah yang tersimpan rapi, siap diunduh oleh setiap tamu.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="mt-6 text-base sm:text-lg text-[#756B64] leading-relaxed max-w-xl"
          >
            Galeri elegan untuk setiap klien. Tamu cukup buka tautan, melihat foto,
            lalu mengunduhnya dengan satu ketukan — tanpa hambatan.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25 }}
            className="mt-10 flex flex-wrap gap-4"
          >
            <Link
              to="/g/arsa-demo"
              data-testid="landing-view-demo-button"
              className="group inline-flex items-center gap-2 bg-[#2A2523] text-[#FBF9F5] rounded-full px-7 py-3.5 text-sm tracking-wide hover:bg-[#C6A052] transition-colors"
            >
              Lihat Galeri Demo
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              to="/admin/login"
              data-testid="landing-manage-button"
              className="inline-flex items-center gap-2 border border-[#EAE4DC] rounded-full px-7 py-3.5 text-sm tracking-wide hover:border-[#C6A052] transition-colors"
            >
              Kelola Galeri
            </Link>
          </motion.div>
        </section>

        {demo && demo.photos?.length > 0 && (
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="pb-24"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              {demo.photos.slice(0, 4).map((p, i) => (
                <div
                  key={p.id}
                  className={`overflow-hidden rounded-lg ${i === 0 ? "row-span-2 col-span-2 md:col-span-1 md:row-span-1" : ""}`}
                >
                  <img
                    src={`${API}${p.file_url.replace("/api", "")}`}
                    alt=""
                    className="w-full h-full object-cover aspect-[3/4] hover:scale-105 transition-transform duration-700"
                  />
                </div>
              ))}
            </div>
          </motion.section>
        )}
      </main>
    </div>
  );
}
