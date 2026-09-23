import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Camera, Plus, LogOut, Pencil, Trash2, ExternalLink, Copy, Images } from "lucide-react";
import api, { apiErr } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function AdminDashboard() {
  const [galleries, setGalleries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const load = () => {
    api
      .get("/galleries")
      .then((r) => setGalleries(r.data))
      .catch((e) => toast.error(apiErr(e.response?.data?.detail)))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const createGallery = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const { data } = await api.post("/galleries", { title, description, event_date: eventDate });
      toast.success("Galeri dibuat");
      setOpen(false);
      setTitle("");
      setDescription("");
      setEventDate("");
      navigate(`/admin/gallery/${data.id}/edit`);
    } catch (err) {
      toast.error(apiErr(err.response?.data?.detail));
    } finally {
      setCreating(false);
    }
  };

  const doDelete = async () => {
    try {
      await api.delete(`/galleries/${deleteTarget.id}`);
      toast.success("Galeri dihapus");
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(apiErr(err.response?.data?.detail));
    }
  };

  const copyLink = (slug) => {
    navigator.clipboard.writeText(`${window.location.origin}/g/${slug}`);
    toast.success("Tautan galeri disalin");
  };

  return (
    <div className="min-h-screen bg-[#FBF9F5]">
      <header className="flex items-center justify-between px-6 sm:px-10 py-5 border-b border-[#EAE4DC] bg-white">
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5 text-[#C6A052]" />
          <span className="font-serif text-2xl text-[#2A2523]">Arsa Admin</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden sm:block text-sm text-[#756B64]">{user?.email}</span>
          <Button
            variant="ghost"
            onClick={() => {
              logout();
              navigate("/admin/login");
            }}
            data-testid="admin-logout-button"
            className="text-[#756B64] hover:text-[#2A2523]"
          >
            <LogOut className="w-4 h-4 mr-2" /> Keluar
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 sm:px-10 py-10">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h1 className="font-serif text-4xl text-[#2A2523]">Galeri Klien</h1>
            <p className="text-[#756B64] text-sm mt-1">Kelola semua galeri pernikahan Anda.</p>
          </div>
          <Button
            onClick={() => setOpen(true)}
            data-testid="admin-create-gallery-button"
            className="bg-[#2A2523] hover:bg-[#C6A052] text-white rounded-full"
          >
            <Plus className="w-4 h-4 mr-2" /> Galeri Baru
          </Button>
        </div>

        {loading ? (
          <p className="text-[#756B64]">Memuat…</p>
        ) : galleries.length === 0 ? (
          <div className="border border-dashed border-[#EAE4DC] rounded-2xl py-20 text-center">
            <Images className="w-10 h-10 mx-auto text-[#C6A052] mb-4" />
            <p className="text-[#756B64]">Belum ada galeri. Buat galeri klien pertama Anda.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {galleries.map((g) => (
              <div
                key={g.id}
                data-testid={`gallery-card-${g.id}`}
                className="bg-white rounded-2xl border border-[#EAE4DC] p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-serif text-2xl text-[#2A2523] leading-tight">{g.title}</h3>
                    <p className="text-xs text-[#756B64] mt-1">/g/{g.slug}</p>
                  </div>
                  <span
                    className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-full"
                    style={{ backgroundColor: g.primary_color + "22", color: g.primary_color }}
                  >
                    {g.layout}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-4 text-xs text-[#756B64]">
                  <span>{g.photo_count} foto</span>
                  <span>{g.download_enabled ? "Unduh: aktif" : "Unduh: nonaktif"}</span>
                </div>
                <div className="flex items-center gap-2 mt-5">
                  <Button
                    size="sm"
                    onClick={() => navigate(`/admin/gallery/${g.id}/edit`)}
                    data-testid={`edit-gallery-${g.id}`}
                    className="bg-[#2A2523] hover:bg-[#C6A052] text-white rounded-full flex-1"
                  >
                    <Pencil className="w-3.5 h-3.5 mr-1.5" /> Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyLink(g.slug)}
                    data-testid={`copy-link-${g.id}`}
                    className="rounded-full border-[#EAE4DC]"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                  <a href={`/g/${g.slug}`} target="_blank" rel="noreferrer">
                    <Button size="sm" variant="outline" className="rounded-full border-[#EAE4DC]">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Button>
                  </a>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setDeleteTarget(g)}
                    data-testid={`delete-gallery-${g.id}`}
                    className="rounded-full border-[#EAE4DC] text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-[#FBF9F5]">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl text-[#2A2523]">Galeri Klien Baru</DialogTitle>
          </DialogHeader>
          <form onSubmit={createGallery} className="space-y-4 pt-2">
            <div>
              <Label className="text-[#2A2523]">Judul Galeri</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="mis. Dniel & Sarah"
                data-testid="new-gallery-title-input"
                className="mt-1.5 bg-white"
              />
            </div>
            <div>
              <Label className="text-[#2A2523]">Tanggal Acara</Label>
              <Input
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                placeholder="mis. 12 Juni 2026"
                data-testid="new-gallery-date-input"
                className="mt-1.5 bg-white"
              />
            </div>
            <div>
              <Label className="text-[#2A2523]">Deskripsi</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Pesan singkat untuk tamu…"
                data-testid="new-gallery-desc-input"
                className="mt-1.5 bg-white"
              />
            </div>
            <DialogFooter>
              <Button
                type="submit"
                disabled={creating}
                data-testid="new-gallery-submit-button"
                className="bg-[#2A2523] hover:bg-[#C6A052] text-white rounded-full"
              >
                {creating ? "Membuat…" : "Buat & Edit"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-[#FBF9F5]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif text-2xl">Hapus galeri?</AlertDialogTitle>
            <AlertDialogDescription>
              Galeri "{deleteTarget?.title}" dan semua fotonya akan dihapus. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={doDelete}
              data-testid="confirm-delete-gallery-button"
              className="bg-red-600 hover:bg-red-700 rounded-full"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
