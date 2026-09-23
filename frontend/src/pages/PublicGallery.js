import React, { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X, ChevronLeft, ChevronRight, ChevronDown, Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { downloadPhoto, fileUrl, isDarkColor } from "@/lib/api";
import PhotoImage from "@/components/PhotoImage";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function PublicGallery() {
  const { slug } = useParams();
  const [gallery, setGallery] = useState(null);
  const [status, setStatus] = useState("loading");
  const [lightbox, setLightbox] = useState(null);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    axios
      .get(`${API}/public/galleries/${slug}`)
      .then((r) => {
        setGallery(r.data);
        setStatus("ok");
      })
      .catch(() => setStatus("notfound"));
  }, [slug]);

  const handleDownload = useCallback(async (photo) => {
    setBusyId(photo.id);
    try {
      await downloadPhoto(photo);
      toast.success("Foto berhasil diunduh");
    } catch (err) {
      if (err.response?.status === 403) toast.error("Download dinonaktifkan untuk galeri ini");
      else toast.error("Gagal mengunduh foto");
    } finally {
      setBusyId(null);
    }
  }, []);

  const scrollToPhotos = () => {
    document.getElementById("memories")?.scrollIntoView({ behavior: "smooth" });
  };

  if (status === "loading")
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1E060C] text-[#D4AF37]">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );

  if (status === "notfound")
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#1E060C] text-white gap-4">
        <p className="font-serif text-3xl">Galeri tidak ditemukan</p>
        <Link to="/" className="text-sm text-[#D4AF37] underline">Kembali ke beranda</Link>
      </div>
    );

  const { photos = [], primary_color, background } = gallery;
  const layout = gallery.layout;
  const downloadOn = gallery.download_enabled;
  const dark = isDarkColor(background);
  const textColor = dark ? "#F3E9DB" : "#2A2523";
  const subColor = dark ? "rgba(243,233,219,0.65)" : "#756B64";
  const hero = photos[0];
  const gold = primary_color || "#D4AF37";

  const DownloadBtn = ({ photo, testid, floating }) =>
    downloadOn ? (
      <button
        data-testid={testid}
        onClick={(e) => {
          e.stopPropagation();
          handleDownload(photo);
        }}
        disabled={busyId === photo.id}
        style={{ backgroundColor: floating ? undefined : gold }}
        className={
          floating
            ? "flex items-center gap-2 text-[#1E060C] rounded-full px-5 py-2.5 text-sm font-semibold shadow-lg transition-transform hover:scale-105"
            : "opacity-0 group-hover:opacity-100 absolute bottom-3 right-3 flex items-center gap-1.5 text-[#1E060C] rounded-full px-3.5 py-2 text-xs font-semibold shadow-lg transition-opacity"
        }
      >
        {busyId === photo.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        Unduh
      </button>
    ) : null;

  const Tile = ({ photo, index, extra = "", imgClass }) => (
    <div
      className={`group relative overflow-hidden rounded-md cursor-pointer ${extra}`}
      onClick={() => setLightbox(index)}
      data-testid={`photo-card-open-${photo.id}`}
    >
      <PhotoImage photo={photo} className={imgClass} />
      <DownloadBtn photo={photo} testid={`photo-card-download-button-${photo.id}`} />
    </div>
  );

  return (
    <div style={{ backgroundColor: background }} className="min-h-screen">
      {/* HERO */}
      <section className="relative h-[100svh] min-h-[560px] w-full overflow-hidden">
        {hero && (
          <img
            src={fileUrl(hero)}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(30,6,12,0.55) 0%, rgba(30,6,12,0.35) 42%, rgba(30,6,12,0.9) 100%)",
          }}
        />
        <div className="relative z-10 h-full flex flex-col items-center justify-center text-center text-white px-6">
          {gallery.logo_url ? (
            <img src={gallery.logo_url} alt="logo" className="h-14 mb-8 object-contain" />
          ) : null}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="text-[11px] tracking-[0.45em] uppercase"
            style={{ color: gold }}
          >
            Moment Album
          </motion.p>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="mt-3 text-sm tracking-[0.25em] text-white/80"
          >
            {gallery.event_date}
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.25 }}
            style={{ fontFamily: `'${gallery.font}', serif` }}
            className="mt-4 text-5xl sm:text-6xl lg:text-7xl font-light tracking-tight"
            data-testid="client-gallery-title"
          >
            {gallery.title}
          </motion.h1>
          {gallery.description && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="mt-5 max-w-md text-sm sm:text-base text-white/75 leading-relaxed font-serif italic"
            >
              {gallery.description}
            </motion.p>
          )}
        </div>
        <button
          onClick={scrollToPhotos}
          data-testid="scroll-to-memories-button"
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 text-white/80 hover:text-white transition-colors"
        >
          <span className="text-[10px] tracking-[0.35em] uppercase">Scroll to Memories</span>
          <motion.span animate={{ y: [0, 7, 0] }} transition={{ repeat: Infinity, duration: 1.6 }}>
            <ChevronDown className="w-5 h-5" style={{ color: gold }} />
          </motion.span>
        </button>
      </section>

      {/* TAB / COUNT */}
      <div id="memories" className="pt-14 pb-8 flex justify-center">
        <div
          className="inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-medium shadow-sm"
          style={{ backgroundColor: gold, color: "#1E060C" }}
          data-testid="gallery-photo-count"
        >
          Semua Foto
          <span className="opacity-70">{photos.length}</span>
        </div>
      </div>

      {/* GRID */}
      <main className="px-3 sm:px-6 max-w-5xl mx-auto pb-24">
        {photos.length === 0 && (
          <p className="text-center py-16" style={{ color: subColor }}>Belum ada foto di galeri ini.</p>
        )}

        {layout === "masonry" && (
          <div className="masonry">
            {photos.map((p, i) => (
              <Tile key={p.id} photo={p} index={i} imgClass="w-full object-cover hover:scale-[1.03] transition-transform duration-500" />
            ))}
          </div>
        )}

        {layout === "slideshow" && (
          <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory no-scrollbar pb-4">
            {photos.map((p, i) => (
              <Tile key={p.id} photo={p} index={i} extra="flex-none w-[80%] sm:w-[55%] snap-center" imgClass="w-full h-[65vh] object-cover" />
            ))}
          </div>
        )}

        {layout === "fullscreen" && (
          <div className="space-y-4 max-w-3xl mx-auto">
            {photos.map((p, i) => (
              <Tile key={p.id} photo={p} index={i} imgClass="w-full max-h-[90vh] object-cover" />
            ))}
          </div>
        )}

        {(layout === "grid" || !["masonry", "slideshow", "fullscreen"].includes(layout)) && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
            {photos.map((p, i) => (
              <Tile key={p.id} photo={p} index={i} imgClass="w-full h-full object-cover aspect-square hover:scale-[1.04] transition-transform duration-500" />
            ))}
          </div>
        )}
      </main>

      {/* LIGHTBOX */}
      <AnimatePresence>
        {lightbox !== null && photos[lightbox] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#120409]/97 flex items-center justify-center"
            onClick={() => setLightbox(null)}
            data-testid="lightbox-overlay"
          >
            <button
              className="absolute top-5 right-5 text-white/80 hover:text-white z-10"
              onClick={() => setLightbox(null)}
              data-testid="lightbox-close-button"
            >
              <X className="w-7 h-7" />
            </button>
            {lightbox > 0 && (
              <button
                className="absolute left-3 sm:left-6 text-white/70 hover:text-white z-10"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightbox(lightbox - 1);
                }}
                data-testid="lightbox-prev-button"
              >
                <ChevronLeft className="w-9 h-9" />
              </button>
            )}
            {lightbox < photos.length - 1 && (
              <button
                className="absolute right-3 sm:right-6 text-white/70 hover:text-white z-10"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightbox(lightbox + 1);
                }}
                data-testid="lightbox-next-button"
              >
                <ChevronRight className="w-9 h-9" />
              </button>
            )}
            <div className="max-w-[90vw] max-h-[85vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
              <img
                src={fileUrl(photos[lightbox])}
                alt=""
                className="max-w-[90vw] max-h-[75vh] object-contain rounded"
              />
              <div className="mt-4 flex items-center gap-4">
                {photos[lightbox].caption && (
                  <span className="text-white/70 font-serif italic text-sm">{photos[lightbox].caption}</span>
                )}
                <DownloadBtn photo={photos[lightbox]} testid="lightbox-download-button" floating />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="text-center pb-10" style={{ color: subColor }}>
        <Link to="/" className="inline-flex items-center gap-1.5 hover:opacity-80 transition-opacity text-xs">
          <Camera className="w-3.5 h-3.5" style={{ color: gold }} /> Arsa Gallery
        </Link>
      </footer>
    </div>
  );
}
