import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft, Save, Upload, Trash2, GripVertical, Loader2, ExternalLink,
  Download, Eye, Music2,
} from "lucide-react";
import api, { apiErr, fileUrl, thumbUrl, isDarkColor } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const LAYOUTS = ["grid", "masonry", "slideshow", "fullscreen"];
const FONTS = ["Cormorant Garamond", "Playfair Display", "Plus Jakarta Sans"];

export default function GalleryEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [g, setG] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragIndex, setDragIndex] = useState(null);
  const fileRef = useRef();

  const load = () => {
    api
      .get(`/galleries/id/${id}`)
      .then((r) => {
        setG(r.data);
        setPhotos(r.data.photos || []);
      })
      .catch((e) => {
        toast.error(apiErr(e.response?.data?.detail));
        navigate("/admin/dashboard");
      });
  };

  useEffect(load, [id]);

  const setField = (k, v) => setG((prev) => ({ ...prev, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await api.put(`/galleries/${id}`, {
        title: g.title, slug: g.slug, description: g.description, event_date: g.event_date,
        logo_url: g.logo_url, primary_color: g.primary_color, background: g.background,
        font: g.font, layout: g.layout, download_enabled: g.download_enabled,
        music_url: g.music_url, music_enabled: g.music_enabled,
      });
      setG((prev) => ({ ...prev, ...data }));
      toast.success("Perubahan disimpan & langsung live");
    } catch (err) {
      toast.error(apiErr(err.response?.data?.detail));
    } finally {
      setSaving(false);
    }
  };

  const upload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    const form = new FormData();
    files.forEach((f) => form.append("files", f));
    try {
      const { data } = await api.post(`/galleries/${id}/photos`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setPhotos((prev) => [...prev, ...data]);
      toast.success(`${data.length} foto diunggah`);
    } catch (err) {
      toast.error(apiErr(err.response?.data?.detail));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const removePhoto = async (pid) => {
    const prev = photos;
    setPhotos((p) => p.filter((x) => x.id !== pid));
    try {
      await api.delete(`/photos/${pid}`);
      toast.success("Foto dihapus");
    } catch (err) {
      setPhotos(prev);
      toast.error(apiErr(err.response?.data?.detail));
    }
  };

  const onDrop = async (index) => {
    if (dragIndex === null || dragIndex === index) return;
    const reordered = [...photos];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(index, 0, moved);
    setPhotos(reordered);
    setDragIndex(null);
    try {
      await api.put(`/galleries/${id}/photos/reorder`, { photo_ids: reordered.map((p) => p.id) });
    } catch (err) {
      toast.error("Gagal menyimpan urutan");
    }
  };

  if (!g)
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FBF9F5] text-[#756B64]">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );

  return (
    <div className="min-h-screen bg-[#FBF9F5]">
      <header className="flex items-center justify-between px-6 py-4 border-b border-[#EAE4DC] bg-white sticky top-0 z-30">
        <Link to="/admin/dashboard" className="flex items-center gap-2 text-[#756B64] hover:text-[#2A2523]">
          <ArrowLeft className="w-4 h-4" /> Kembali
        </Link>
        <div className="flex items-center gap-3">
          <a href={`/g/${g.slug}`} target="_blank" rel="noreferrer">
            <Button variant="outline" className="rounded-full border-[#EAE4DC]" data-testid="editor-open-live-button">
              <ExternalLink className="w-4 h-4 mr-2" /> Buka Live
            </Button>
          </a>
          <Button
            onClick={save}
            disabled={saving}
            data-testid="admin-gallery-editor-save-button"
            className="bg-[#2A2523] hover:bg-[#C6A052] text-white rounded-full"
          >
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Simpan
          </Button>
        </div>
      </header>

      <div className="grid lg:grid-cols-[420px_1fr]">
        {/* editor panel */}
        <aside className="p-6 border-r border-[#EAE4DC] bg-white lg:h-[calc(100vh-65px)] lg:overflow-y-auto">
          <Tabs defaultValue="photos">
            <TabsList className="grid grid-cols-2 w-full bg-[#F1ECE4]">
              <TabsTrigger value="photos" data-testid="tab-photos">Foto</TabsTrigger>
              <TabsTrigger value="branding" data-testid="tab-branding">Tampilan</TabsTrigger>
            </TabsList>

            <TabsContent value="photos" className="pt-5 space-y-4">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                onChange={upload}
                className="hidden"
                data-testid="admin-photo-upload-input"
              />
              <Button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                data-testid="admin-photo-upload-button"
                className="w-full bg-[#2A2523] hover:bg-[#C6A052] text-white rounded-full"
              >
                {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                Unggah Foto
              </Button>
              <p className="text-xs text-[#756B64]">Seret kartu untuk mengubah urutan.</p>
              <div className="space-y-2">
                {photos.map((p, i) => (
                  <div
                    key={p.id}
                    draggable
                    onDragStart={() => setDragIndex(i)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => onDrop(i)}
                    data-testid={`photo-row-${p.id}`}
                    className="flex items-center gap-3 bg-[#FBF9F5] border border-[#EAE4DC] rounded-lg p-2 cursor-move"
                  >
                    <GripVertical className="w-4 h-4 text-[#756B64] shrink-0" />
                    <img src={thumbUrl(p)} alt="" className="w-12 h-12 object-cover rounded" />
                    <span className="text-xs text-[#756B64] flex-1 truncate">{p.download_name}</span>
                    <button
                      onClick={() => removePhoto(p.id)}
                      data-testid={`remove-photo-${p.id}`}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {photos.length === 0 && (
                  <p className="text-center text-sm text-[#756B64] py-8">Belum ada foto.</p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="branding" className="pt-5 space-y-5">
              <div>
                <Label className="text-[#2A2523]">Judul</Label>
                <Input value={g.title} onChange={(e) => setField("title", e.target.value)} data-testid="branding-title-input" className="mt-1.5 bg-[#FBF9F5]" />
              </div>
              <div>
                <Label className="text-[#2A2523]">Slug URL</Label>
                <Input value={g.slug} onChange={(e) => setField("slug", e.target.value)} data-testid="branding-slug-input" className="mt-1.5 bg-[#FBF9F5]" />
                <p className="text-xs text-[#756B64] mt-1">/g/{g.slug}</p>
              </div>
              <div>
                <Label className="text-[#2A2523]">Tanggal Acara</Label>
                <Input value={g.event_date || ""} onChange={(e) => setField("event_date", e.target.value)} data-testid="branding-date-input" className="mt-1.5 bg-[#FBF9F5]" />
              </div>
              <div>
                <Label className="text-[#2A2523]">Deskripsi</Label>
                <Textarea value={g.description || ""} onChange={(e) => setField("description", e.target.value)} data-testid="branding-desc-input" className="mt-1.5 bg-[#FBF9F5]" />
              </div>
              <div>
                <Label className="text-[#2A2523]">URL Logo (opsional)</Label>
                <Input value={g.logo_url || ""} onChange={(e) => setField("logo_url", e.target.value)} placeholder="https://…" data-testid="branding-logo-input" className="mt-1.5 bg-[#FBF9F5]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[#2A2523]">Warna Aksen</Label>
                  <div className="flex items-center gap-2 mt-1.5">
                    <input type="color" value={g.primary_color} onChange={(e) => setField("primary_color", e.target.value)} data-testid="admin-branding-color-picker" className="w-10 h-10 rounded border border-[#EAE4DC] cursor-pointer" />
                    <Input value={g.primary_color} onChange={(e) => setField("primary_color", e.target.value)} className="bg-[#FBF9F5]" />
                  </div>
                </div>
                <div>
                  <Label className="text-[#2A2523]">Latar</Label>
                  <div className="flex items-center gap-2 mt-1.5">
                    <input type="color" value={g.background} onChange={(e) => setField("background", e.target.value)} data-testid="admin-branding-bg-picker" className="w-10 h-10 rounded border border-[#EAE4DC] cursor-pointer" />
                    <Input value={g.background} onChange={(e) => setField("background", e.target.value)} className="bg-[#FBF9F5]" />
                  </div>
                </div>
              </div>
              <div>
                <Label className="text-[#2A2523]">Font Judul</Label>
                <Select value={g.font} onValueChange={(v) => setField("font", v)}>
                  <SelectTrigger data-testid="branding-font-select" className="mt-1.5 bg-[#FBF9F5]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FONTS.map((f) => (
                      <SelectItem key={f} value={f} data-testid={`font-option-${f}`}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[#2A2523]">Layout Galeri</Label>
                <div className="grid grid-cols-2 gap-2 mt-1.5">
                  {LAYOUTS.map((l) => (
                    <button
                      key={l}
                      onClick={() => setField("layout", l)}
                      data-testid={`layout-toggle-${l}`}
                      className={`text-sm capitalize rounded-lg py-2.5 border transition-colors ${
                        g.layout === l
                          ? "bg-[#2A2523] text-white border-[#2A2523]"
                          : "bg-[#FBF9F5] text-[#756B64] border-[#EAE4DC] hover:border-[#C6A052]"
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between bg-[#FBF9F5] border border-[#EAE4DC] rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4 text-[#756B64]" />
                  <span className="text-sm text-[#2A2523]">Tombol Unduh</span>
                </div>
                <Switch
                  checked={g.download_enabled}
                  onCheckedChange={(v) => setField("download_enabled", v)}
                  data-testid="admin-download-toggle-switch"
                />
              </div>
              <div>
                <Label className="text-[#2A2523]">URL Musik Latar (opsional)</Label>
                <Input
                  value={g.music_url || ""}
                  onChange={(e) => setField("music_url", e.target.value)}
                  placeholder="https://…/lagu.mp3"
                  data-testid="branding-music-input"
                  className="mt-1.5 bg-[#FBF9F5]"
                />
                <p className="text-xs text-[#756B64] mt-1">Tempel tautan file MP3. Tamu bisa memutar/menjeda.</p>
              </div>
              <div className="flex items-center justify-between bg-[#FBF9F5] border border-[#EAE4DC] rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <Music2 className="w-4 h-4 text-[#756B64]" />
                  <span className="text-sm text-[#2A2523]">Musik Latar</span>
                </div>
                <Switch
                  checked={!!g.music_enabled}
                  onCheckedChange={(v) => setField("music_enabled", v)}
                  data-testid="admin-music-toggle-switch"
                />
              </div>
            </TabsContent>
          </Tabs>
        </aside>

        {/* live preview */}
        <section className="lg:h-[calc(100vh-65px)] lg:overflow-y-auto" style={{ backgroundColor: g.background }}>
          <div className="sticky top-0 z-10 flex items-center gap-2 px-5 py-2.5 bg-black/5 backdrop-blur text-xs text-[#756B64]">
            <Eye className="w-3.5 h-3.5" /> Pratinjau Langsung — {g.layout}
          </div>
          <div className="text-center px-6 py-16 relative overflow-hidden" style={{ minHeight: 280 }}>
            {photos[0] && (
              <img src={fileUrl(photos[0])} alt="" className="absolute inset-0 w-full h-full object-cover" />
            )}
            <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(30,6,12,0.5), rgba(30,6,12,0.85))" }} />
            <div className="relative z-10 text-white">
              {g.logo_url ? (
                <img src={g.logo_url} alt="logo" className="h-12 mx-auto mb-4 object-contain" />
              ) : null}
              <span style={{ color: g.primary_color }} className="text-[10px] tracking-[0.4em] uppercase">Moment Album</span>
              <p className="mt-2 text-xs tracking-[0.25em] text-white/80">{g.event_date}</p>
              <h1 style={{ fontFamily: `'${g.font}', serif` }} className="text-4xl sm:text-5xl font-light tracking-tight mt-3">
                {g.title}
              </h1>
              {g.description && <p className="mt-3 max-w-md mx-auto text-white/75 text-sm font-serif italic">{g.description}</p>}
            </div>
          </div>

          <div className="pt-8 pb-4 flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-xs font-medium" style={{ backgroundColor: g.primary_color, color: "#1E060C" }}>
              Semua Foto <span className="opacity-70">{photos.length}</span>
            </span>
          </div>

          <div className="px-4 sm:px-6 pb-16 max-w-4xl mx-auto">
            {photos.length === 0 ? (
              <p className="text-center py-16" style={{ color: isDarkColor(g.background) ? "rgba(243,233,219,0.6)" : "#756B64" }}>Unggah foto untuk melihat pratinjau.</p>
            ) : g.layout === "masonry" ? (
              <div className="masonry">
                {photos.map((p) => (
                  <div key={p.id} className="relative group overflow-hidden rounded-lg">
                    <img src={thumbUrl(p)} alt="" className="w-full object-cover" />
                    {g.download_enabled && (
                      <span style={{ backgroundColor: g.primary_color }} className="absolute bottom-2 right-2 text-white rounded-full p-1.5">
                        <Download className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : g.layout === "fullscreen" ? (
              <div className="space-y-4">
                {photos.map((p) => (
                  <img key={p.id} src={thumbUrl(p)} alt="" className="w-full rounded-lg object-cover" />
                ))}
              </div>
            ) : g.layout === "slideshow" ? (
              <div className="flex gap-3 overflow-x-auto no-scrollbar pb-3">
                {photos.map((p) => (
                  <img key={p.id} src={thumbUrl(p)} alt="" className="flex-none w-3/4 h-72 object-cover rounded-lg" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {photos.map((p) => (
                  <div key={p.id} className="relative group overflow-hidden rounded-lg">
                    <img src={thumbUrl(p)} alt="" className="w-full aspect-square object-cover" />
                    {g.download_enabled && (
                      <span style={{ backgroundColor: g.primary_color }} className="absolute bottom-2 right-2 text-white rounded-full p-1.5">
                        <Download className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
