import React, { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X, ChevronLeft, ChevronRight, Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { downloadPhoto } from "@/lib/api";
import PhotoImage from "@/components/PhotoImage";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function PublicGallery() {
  const { slug } = useParams();
  const [gallery, setGallery] = useState(null);
  const [status, setStatus] = useState("loading");
  const [lightbox, setLightbox] = useState(null); // index or null
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

  const handleDownload = useCallback(
    async (photo) => {
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
    },
    []
  );

  if (status === "loading")
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FBF9F5] text-[#756B64]">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );

  if (status === "notfound")
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FBF9F5] text-[#2A2523] gap-4">
        <p className="font-serif text-3xl">Galeri tidak ditemukan</p>
        <Link to="/" className="text-sm text-[#C6A052] underline">Kembali ke beranda</Link>
      </div>
    );

  const { photos = [], layout, primary_color, background } = gallery;
  const downloadOn = gallery.download_enabled;

  const DownloadBtn = ({ photo, testid, floating }) =>
    downloadOn ? (
      <button
        data-testid={testid}
        onClick={(e) => {
          e.stopPropagation();
          handleDownload(photo);
        }}
        disabled={busyId === photo.id}
        style={{ backgroundColor: floating ? undefined : primary_color }}
        className={
          floating
            ? "flex items-center gap-2 bg-white/90 backdrop-blur text-[#2A2523] rounded-full px-4 py-2 text-sm font-medium shadow-lg hover:bg-white transition-colors"
            : "opacity-0 group-hover:opacity-100 absolute bottom-3 right-3 flex items-center gap-1.5 text-white rounded-full px-3.5 py-2 text-xs font-medium shadow-lg transition-opacity"
        }
      >
        {busyId === photo.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        Unduh
      </button>
    ) : null;

  return (
    <div style={{ backgroundColor: background || "#FBF9F5" }} className="min-h-screen">
      {/* header */}
      <header className="text-center pt-16 sm:pt-24 pb-10 px-6">
        {gallery.logo_url ? (
          <img src={gallery.logo_url} alt="logo" className="h-16 mx-auto mb-6 object-contain" />
        ) : (
          <div className="flex items-center justify-center gap-2 mb-5">
            <span style={{ color: primary_color }} className="text-xs tracking-[0.35em] uppercase">
              {gallery.event_date || "Wedding Gallery"}
            </span>
          </div>
        )}
        <h1
          style={{ fontFamily: `'${gallery.font}', serif`, color: "#2A2523" }}
          className="text-4xl sm:text-5xl lg:text-6xl font-light tracking-tight"
          data-testid="client-gallery-title"
        >
          {gallery.title}
        </h1>
        {gallery.description && (
          <p className="mt-5 max-w-xl mx-auto text-[#756B64] leading-relaxed text-sm sm:text-base">
            {gallery.description}
          </p>
        )}
        <div style={{ backgroundColor: primary_color }} className="w-16 h-px mx-auto mt-8" />
      </header>

      {/* body layouts */}
      <main className="px-4 sm:px-8 max-w-6xl mx-auto pb-24">
        {photos.length === 0 && (
          <p className="text-center text-[#756B64] py-20">Belum ada foto di galeri ini.</p>
        )}

        {layout === "grid" && (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {photos.map((p, i) => (
              <div key={p.id} className="group relative overflow-hidden rounded-lg cursor-pointer">
                <PhotoImage
                  photo={p}
                  onClick={() => setLightbox(i)}
                  className="w-full h-full object-cover aspect-square hover:scale-[1.03] transition-transform duration-500"
                />
                <DownloadBtn photo={p} testid={`photo-card-download-button-${p.id}`} />
              </div>
            ))}
          </div>
        )}

        {layout === "masonry" && (
          <div className="masonry">
            {photos.map((p, i) => (
              <div key={p.id} className="group relative overflow-hidden rounded-lg cursor-pointer">
                <PhotoImage
                  photo={p}
                  onClick={() => setLightbox(i)}
                  className="w-full object-cover hover:scale-[1.03] transition-transform duration-500"
                />
                <DownloadBtn photo={p} testid={`photo-card-download-button-${p.id}`} />
              </div>
            ))}
          </div>
        )}

        {layout === "slideshow" && (
          <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory no-scrollbar pb-4">
            {photos.map((p, i) => (
              <div
                key={p.id}
                className="group relative flex-none w-[85%] sm:w-[60%] lg:w-[45%] snap-center overflow-hidden rounded-xl cursor-pointer"
              >
                <PhotoImage
                  photo={p}
                  onClick={() => setLightbox(i)}
                  className="w-full h-[60vh] object-cover"
                />
                <DownloadBtn photo={p} testid={`photo-card-download-button-${p.id}`} />
              </div>
            ))}
          </div>
        )}

        {layout === "fullscreen" && (
          <div className="space-y-6 max-w-4xl mx-auto">
            {photos.map((p, i) => (
              <div key={p.id} className="group relative overflow-hidden rounded-xl cursor-pointer">
                <PhotoImage
                  photo={p}
                  onClick={() => setLightbox(i)}
                  className="w-full max-h-[90vh] object-cover"
                />
                {p.caption && (
                  <p className="text-center text-[#756B64] text-sm mt-2 font-serif italic">{p.caption}</p>
                )}
                <DownloadBtn photo={p} testid={`photo-card-download-button-${p.id}`} />
              </div>
            ))}
          </div>
        )}
      </main>

      {/* lightbox */}
      <AnimatePresence>
        {lightbox !== null && photos[lightbox] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#121110]/95 flex items-center justify-center"
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
                src={`${API}${photos[lightbox].file_url.replace("/api", "")}`}
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

      <footer className="text-center pb-10 text-xs text-[#756B64]">
        <Link to="/" className="inline-flex items-center gap-1.5 hover:text-[#2A2523] transition-colors">
          <Camera className="w-3.5 h-3.5" /> Arsa Gallery
        </Link>
      </footer>
    </div>
  );
}
