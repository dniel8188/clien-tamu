import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { Camera } from "lucide-react";
import api, { apiErr } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", { email, password });
      login(data.token, data.user);
      toast.success("Selamat datang kembali");
      navigate("/admin/dashboard");
    } catch (err) {
      toast.error(apiErr(err.response?.data?.detail) || "Login gagal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBF9F5] flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <Link to="/" className="flex items-center justify-center gap-2 mb-10">
          <Camera className="w-5 h-5 text-[#C6A052]" />
          <span className="font-serif text-2xl text-[#2A2523]">Arsa Gallery</span>
        </Link>
        <div className="bg-white rounded-2xl border border-[#EAE4DC] p-8 shadow-sm">
          <h1 className="font-serif text-3xl text-[#2A2523] mb-1">Masuk Admin</h1>
          <p className="text-sm text-[#756B64] mb-7">
            Kelola galeri, foto, dan tampilan klien Anda.
          </p>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label htmlFor="email" className="text-[#2A2523]">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                data-testid="admin-login-email-input"
                className="mt-1.5"
                placeholder="anda@email.com"
              />
            </div>
            <div>
              <Label htmlFor="password" className="text-[#2A2523]">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                data-testid="admin-login-password-input"
                className="mt-1.5"
                placeholder="••••••••"
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              data-testid="admin-login-submit-button"
              className="w-full bg-[#2A2523] hover:bg-[#C6A052] text-white rounded-full h-11"
            >
              {loading ? "Memproses…" : "Masuk"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
