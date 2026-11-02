import { useState, type FormEvent } from "react";
import { Link } from "wouter";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import { toast } from "sonner";
import { BrandLogo } from "@/components/site/SiteShell";
import { trpc } from "@/lib/trpc";

export default function LocalAdminLogin() {
  const utils = trpc.useUtils();
  const login = trpc.auth.login.useMutation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await login.mutateAsync({ email, password });
      setPassword("");
      await utils.auth.me.invalidate();
      toast.success("Yönetici girişi başarılı.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Giriş yapılamadı.");
    }
  };

  return <div className="admin-gate"><div className="admin-gate-card">
    <BrandLogo />
    <span className="admin-kicker">YÖNETİCİ ALANI</span>
    <h1>Yönetim paneline giriş</h1>
    <p>Bu siteye tanımlı yönetici e-posta adresi ve şifresiyle giriş yapın.</p>
    <form className="admin-local-login-form" onSubmit={(event) => void submit(event)}>
      <label><span>E-posta adresi</span><input type="email" name="email" autoComplete="username" maxLength={320} required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
      <label><span>Şifre</span><input type="password" name="password" autoComplete="current-password" maxLength={256} required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
      <button type="submit" className="admin-primary-button" disabled={login.isPending}><LockKeyhole size={15} />{login.isPending ? "Giriş yapılıyor…" : "Giriş yap"}</button>
    </form>
    <Link href="/" className="admin-gate-back"><ArrowLeft size={14} /> Ana sayfa</Link>
  </div></div>;
}
