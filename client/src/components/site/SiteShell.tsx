import { useState } from "react";
import { ArrowUpRight, Menu, ShieldCheck, X } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";

type MenuItem = { id: number; label: string; href: string };
const fallbackHeader: MenuItem[] = [
  { id: -1, label: "Tümü", href: "/#profiles" },
  { id: -2, label: "Onaylı", href: "/#verified" },
  { id: -3, label: "VIP", href: "/#featured" },
];

function MenuLink({ item, onClick }: { item: MenuItem; onClick?: () => void }) {
  if (/^https?:\/\//i.test(item.href)) return <a href={item.href} target="_blank" rel="noreferrer" onClick={onClick}>{item.label}</a>;
  return <Link href={item.href} onClick={onClick}>{item.label}</Link>;
}

export function BrandLogo({ siteName = "VIP İlan" }: { siteName?: string }) {
  return <Link href="/" className="brand" aria-label={`${siteName} ana sayfa`}><span className="brand-emblem" aria-hidden="true"><svg viewBox="0 0 42 42" fill="none"><path d="M21 3.5 38.5 14v14L21 38.5 3.5 28V14L21 3.5Z" stroke="currentColor" strokeWidth="1.4" /><path d="m12.5 15 8.5 13 8.5-13M21 16v12" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /><circle cx="21" cy="10.5" r="1.5" fill="currentColor" /></svg></span><span className="brand-wordmark"><span>{siteName === "VIP İlan" ? <>VIP <strong>İLAN</strong></> : siteName}</span><small>{siteName === "VIP İlan" ? "ANTALYA SEÇKİSİ" : "ÖZENLİ İLAN VİTRİNİ"}</small></span></Link>;
}

export function SiteHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const layout = trpc.site.publicLayout.useQuery();
  const siteName = layout.data?.settings.siteName ?? "VIP İlan";
  const navItems = layout.data ? layout.data.header : fallbackHeader;
  return <><div className="notice-bar"><span className="notice-age">18+</span><span>Bu platform yalnızca yetişkinler içindir.</span><span className="notice-separator">·</span><span>Saygılı ve güvenli iletişim için yayın ilkelerine uyun.</span></div><header className="site-header"><div className="header-main page-container"><BrandLogo siteName={siteName} /><nav className={`main-nav ${mobileOpen ? "is-open" : ""}`} aria-label="Ana navigasyon">{navItems.map((item) => <MenuLink key={item.id} item={item} onClick={() => setMobileOpen(false)} />)}</nav><div className="header-actions"><Link href="/admin" className="header-cta">İlan yönetimi <ArrowUpRight size={15} strokeWidth={1.8} /></Link></div><button type="button" className="mobile-menu-button" aria-label={mobileOpen ? "Menüyü kapat" : "Menüyü aç"} aria-expanded={mobileOpen} onClick={() => setMobileOpen((open) => !open)}>{mobileOpen ? <X size={22} /> : <Menu size={22} />}</button></div></header></>;
}

export function SiteFooter() {
  const layout = trpc.site.publicLayout.useQuery();
  const siteName = layout.data?.settings.siteName ?? "VIP İlan";
  const footerItems = layout.data?.footer ?? [];
  return <footer className="site-footer" id="community"><div className="page-container footer-top"><div className="footer-brand-block"><BrandLogo siteName={siteName} /><p>Özenle hazırlanmış ilanları sakin, net ve güven odaklı bir vitrinde keşfedin.</p><div className="footer-demo-note"><ShieldCheck size={16} /> Yayındaki ilanlar yönetici tarafından kontrol edilir.</div></div><div className="footer-column"><h3>Site bağlantıları</h3>{footerItems.length ? footerItems.map((item) => <MenuLink key={item.id} item={item} />) : <span>Yönetim panelinden footer bağlantısı ekleyin.</span>}</div><div className="footer-column"><h3>Güvenli kullanım</h3><span>Yalnızca 18 yaş ve üzeri ziyaretçiler içindir.</span><Link href="/admin">Yönetim paneli</Link></div></div><div className="page-container footer-bottom"><span>© {new Date().getFullYear()} {siteName}</span><span className="footer-18">Yalnızca 18 yaş ve üzeri ziyaretçiler içindir.</span><span className="footer-made">Özenle tasarlandı <span aria-hidden="true">✦</span></span></div></footer>;
}
