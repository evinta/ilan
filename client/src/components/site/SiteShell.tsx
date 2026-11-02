import { useState } from "react";
import { ArrowUpRight, Menu, ShieldCheck, X } from "lucide-react";
import { Link } from "wouter";

const navItems = [
  { label: "Tümü", href: "/#profiles" },
  { label: "Onaylı", href: "/#verified" },
  { label: "VIP", href: "/#featured" },
  { label: "Merkez", href: "/#profiles" },
  { label: "Lara", href: "/#profiles" },
  { label: "Konyaaltı", href: "/#profiles" },
];
export function BrandLogo() {
  return <Link href="/" className="brand" aria-label="VIP İlan ana sayfa"><span className="brand-emblem" aria-hidden="true"><svg viewBox="0 0 42 42" fill="none"><path d="M21 3.5 38.5 14v14L21 38.5 3.5 28V14L21 3.5Z" stroke="currentColor" strokeWidth="1.4" /><path d="m12.5 15 8.5 13 8.5-13M21 16v12" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /><circle cx="21" cy="10.5" r="1.5" fill="currentColor" /></svg></span><span className="brand-wordmark"><span>VIP <strong>İLAN</strong></span><small>ANTALYA SEÇKİSİ</small></span></Link>;
}
export function SiteHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  return <><div className="notice-bar"><span className="notice-age">18+</span><span>Bu platform yalnızca yetişkinler içindir.</span><span className="notice-separator">·</span><span>Saygılı ve güvenli iletişim için topluluk ilkelerini inceleyin.</span></div><header className="site-header"><div className="header-main page-container"><BrandLogo /><nav className={`main-nav ${mobileOpen ? "is-open" : ""}`} aria-label="Ana navigasyon">{navItems.map((item) => <Link key={item.label} href={item.href} onClick={() => setMobileOpen(false)}>{item.label}</Link>)}</nav><div className="header-actions"><Link href="/#community" className="header-link">Yayın ilkeleri</Link><Link href="/admin" className="header-cta">İlan yönetimi <ArrowUpRight size={15} strokeWidth={1.8} /></Link></div><button type="button" className="mobile-menu-button" aria-label={mobileOpen ? "Menüyü kapat" : "Menüyü aç"} aria-expanded={mobileOpen} onClick={() => setMobileOpen((open) => !open)}>{mobileOpen ? <X size={22} /> : <Menu size={22} />}</button></div></header></>;
}
export function SiteFooter() {
  return <footer className="site-footer" id="community"><div className="page-container footer-top"><div className="footer-brand-block"><BrandLogo /><p>Antalya'da özenle hazırlanmış profilleri keşfetmek için sakin, net ve güven odaklı bir vitrin.</p><div className="footer-demo-note"><ShieldCheck size={16} /> Yayındaki ilanlar yönetici tarafından kontrol edilir.</div></div><div className="footer-column"><h3>Keşfet</h3><Link href="/#profiles">Tüm profiller</Link><Link href="/#verified">Onaylı profiller</Link><Link href="/#featured">Öne çıkanlar</Link></div><div className="footer-column"><h3>Bölgeler</h3><Link href="/#profiles">Antalya Merkez</Link><Link href="/#profiles">Lara</Link><Link href="/#profiles">Konyaaltı</Link></div><div className="footer-column"><h3>Güvenli kullanım</h3><a href="#community">Yayın ilkeleri</a><a href="#community">Gizlilik yaklaşımı</a><a href="#community">İlanı bildir</a><Link href="/admin">Yönetim paneli</Link></div></div><div className="page-container footer-bottom"><span>© 2026 VIP İlan · Antalya</span><span className="footer-18">Yalnızca 18 yaş ve üzeri ziyaretçiler içindir.</span><span className="footer-made">Özenle tasarlandı <span aria-hidden="true">✦</span></span></div></footer>;
}
