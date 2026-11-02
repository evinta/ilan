import { useMemo, useState } from "react";
import { ArrowDown, ArrowRight, BadgeCheck, Compass, MapPin, Search, ShieldCheck, Sparkles, UsersRound } from "lucide-react";
import { Link } from "wouter";
import ProfileCard from "@/components/site/ProfileCard";
import { SiteFooter, SiteHeader } from "@/components/site/SiteShell";
import { trpc } from "@/lib/trpc";
import { usePageMeta } from "@/hooks/usePageMeta";

type FilterOption = { id: string; label: string; kind: "all" | "verified" | "featured" | "category" | "location"; entityId?: number };

export default function Home() {
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [saved, setSaved] = useState<string[]>([]);
  const query = trpc.listings.publicList.useQuery();
  const layoutQuery = trpc.site.publicLayout.useQuery();
  const profiles = query.data ?? [];
  const settings = layoutQuery.data?.settings;
  const filters = useMemo<FilterOption[]>(() => [
    { id: "all", label: "Tümü", kind: "all" },
    { id: "verified", label: "Onaylı", kind: "verified" },
    { id: "featured", label: "VIP", kind: "featured" },
    ...(layoutQuery.data?.categories ?? []).map((item) => ({ id: `category:${item.id}`, label: item.name, kind: "category" as const, entityId: item.id })),
    ...(layoutQuery.data?.locations ?? []).map((item) => ({ id: `location:${item.id}`, label: `${item.city} · ${item.district}`, kind: "location" as const, entityId: item.id })),
  ], [layoutQuery.data]);
  const active = filters.find((filter) => filter.id === activeFilter) ?? filters[0]!;
  const visible = useMemo(() => {
    const term = searchTerm.trim().toLocaleLowerCase("tr-TR");
    return profiles.filter((profile) => {
      const matchesFilter = active.kind === "all"
        || (active.kind === "verified" && profile.verified)
        || (active.kind === "featured" && profile.premium)
        || (active.kind === "category" && profile.categoryId === active.entityId)
        || (active.kind === "location" && profile.locationId === active.entityId);
      const text = `${profile.name} ${profile.location} ${profile.district} ${profile.tags.join(" ")} ${profile.categoryName ?? ""}`.toLocaleLowerCase("tr-TR");
      return matchesFilter && (!term || text.includes(term));
    });
  }, [profiles, active, searchTerm]);
  const toggleSaved = (slug: string) => setSaved((current) => current.includes(slug) ? current.filter((item) => item !== slug) : [...current, slug]);
  const chooseArea = (id: string) => { setActiveFilter(id); document.getElementById("profiles")?.scrollIntoView({ behavior: "smooth" }); };
  usePageMeta({
    title: settings?.homeTitle ?? "Antalya'dan seçkiler | VIP İlan",
    description: settings?.homeDescription ?? "Antalya'daki seçilmiş profilleri özenli ve güven odaklı bir vitrinde keşfet.",
    path: "/", siteName: settings?.siteName ?? "VIP İlan", image: settings?.defaultSocialImage,
  });

  return <div className="site-page"><SiteHeader /><main>
    <section className="hero-section"><div className="hero-photo" aria-hidden="true" /><div className="hero-overlay" /><div className="page-container hero-content"><div className="hero-copy"><div className="hero-eyebrow"><span className="eyebrow-line" /> {settings?.heroEyebrow ?? "ANTALYA'DAN SEÇKİLER"}</div><h1>{settings?.heroHeading ?? <>Şehrin ritminde,<br /><em>özenle</em> keşfet.</>}</h1><p>{settings?.heroBody ?? "Antalya'nın farklı noktalarından seçilmiş profilleri tek bir yerde incele. Açık bilgi, özenli sunum ve saygılı iletişim."}</p><div className="hero-actions"><a className="button button-gold" href="#profiles">Profilleri keşfet <ArrowRight size={17} /></a><span className="hero-proof"><ShieldCheck size={16} /> Güven odağında tasarlandı</span></div></div><div className="hero-side-note"><span className="hero-side-icon"><Compass size={21} /></span><span className="hero-side-kicker">ŞEHRİ KEŞFET</span><strong>{settings?.siteName ?? "Antalya"}<br />senin ritminde.</strong><span className="hero-side-bottom">{(layoutQuery.data?.locations ?? []).slice(0, 3).map((item) => item.district).join(" · ") || "Şehrini keşfet"}</span></div></div>
      <div className="page-container search-card-wrap"><form className="search-card" onSubmit={(event) => { event.preventDefault(); document.getElementById("profiles")?.scrollIntoView({ behavior: "smooth" }); }}><label className="search-field search-location"><span className="search-icon"><MapPin size={18} /></span><span className="search-label">BÖLGE</span><select aria-label="Kategori veya bölge seç" value={activeFilter} onChange={(event) => setActiveFilter(event.target.value)}>{filters.map((filter) => <option key={filter.id} value={filter.id}>{filter.label}</option>)}</select></label><span className="search-divider" /><label className="search-field search-query"><span className="search-icon"><Search size={18} /></span><span className="search-label">PROFİLDE ARA</span><input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="İsim veya anahtar kelime" /></label><button className="search-submit" type="submit"><Search size={17} /> <span>Profilleri bul</span></button></form></div>
    </section>
    <section className="trust-strip" id="verified"><div className="page-container trust-grid"><div className="trust-item"><span className="trust-icon"><BadgeCheck size={19} /></span><span><strong>Onaylı profil işaretleri</strong><small>Yalnızca doğrulanan ilanlara özel rozetler</small></span></div><div className="trust-item"><span className="trust-icon"><ShieldCheck size={19} /></span><span><strong>Topluluk ilkeleri</strong><small>Güvenli ve saygılı kullanım odağı</small></span></div><div className="trust-item"><span className="trust-icon"><UsersRound size={19} /></span><span><strong>Özenli profil sunumu</strong><small>Bilgiler kolayca taranabilir biçimde</small></span></div></div></section>
    <section className="section-block listings-section page-container" id="profiles"><div className="section-heading-row"><div><div className="section-kicker"><span className="eyebrow-line" /> ŞEHRİN SEÇKİSİ</div><h2>Öne çıkan <em>profiller</em></h2><p className="section-intro">Antalya'da farklı bölgelerden güncel ilanları keşfet.</p></div><Link href="/admin" className="text-link">İlanını yönet <ArrowRight size={16} /></Link></div>
      <div className="filter-row" role="group" aria-label="Profil filtreleri">{filters.map((filter) => <button key={filter.id} type="button" className={`filter-chip ${activeFilter === filter.id ? "active" : ""}`} onClick={() => setActiveFilter(filter.id)}>{filter.kind === "verified" && <BadgeCheck size={14} />}{filter.kind === "featured" && <Sparkles size={14} />}{filter.label}</button>)}<span className="result-count">{query.isLoading ? "Yükleniyor…" : `${visible.length} profil`}</span></div>
      {query.isLoading ? <div className="listings-state"><span className="admin-spinner" /> İlanlar yükleniyor…</div> : query.isError ? <div className="listings-state error"><ShieldCheck size={21} /><strong>İlanlar şu anda yüklenemiyor.</strong><span>Lütfen biraz sonra tekrar deneyin.</span><button type="button" onClick={() => void query.refetch()}>Yeniden dene</button></div> : visible.length ? <div className="profiles-grid">{visible.map((profile) => <ProfileCard key={profile.slug} profile={profile} saved={saved.includes(profile.slug)} onToggleSave={toggleSaved} />)}</div> : <div className="empty-results"><Search size={23} /><strong>{profiles.length ? "Aramana uygun profil bulunamadı." : "Henüz yayımlanmış ilan yok."}</strong><span>{profiles.length ? "Başka bir isim veya bölge deneyebilirsin." : "Yeni ilanlar eklendiğinde burada görüntülenecek."}</span>{profiles.length ? <button onClick={() => { setSearchTerm(""); setActiveFilter("all"); }}>Filtreleri temizle</button> : <Link className="empty-admin-link" href="/admin">Yönetici girişi <ArrowRight size={14} /></Link>}</div>}
      <div className="listings-footnote"><span className="footnote-mark">i</span> Yayımlanan ilanlar yönetim panelinden onaylanır. İçerik kuralları geçerlidir.</div>
    </section>
    <section className="featured-band" id="featured"><div className="page-container featured-band-inner"><div className="featured-copy"><span className="featured-icon"><Sparkles size={20} /></span><div><div className="section-kicker light-kicker">VIP İLAN DENEYİMİ</div><h2>İhtiyacın olan bilgi,<br /><em>tek bir bakışta.</em></h2></div></div><p>Profil detaylarında konum, tanıtım metni, galeri ve öne çıkan bilgileri düzenli bir akışta gör. Kontrol sende kalsın.</p><a className="button button-outline-light" href="#community">Yayın ilkelerini oku <ArrowRight size={16} /></a></div></section>
    <section className="section-block browse-section page-container"><div className="browse-heading"><div className="section-kicker"><span className="eyebrow-line" /> ŞEHRİ KEŞFET</div><h2>Bir bölgeyle <em>başla.</em></h2></div><div className="district-grid">{(layoutQuery.data?.locations ?? []).slice(0, 6).map((area, index) => <Link className="district-card" key={area.id} href={`/bolge/${area.citySlug}/${area.districtSlug}`}><span className="district-number">{String(index + 1).padStart(2, "0")}</span><span className="district-copy"><strong>{area.city} · {area.district}</strong><small>{area.description || `${area.district} bölgesindeki yayındaki profiller`}</small></span><span>›</span></Link>)}</div>{layoutQuery.data?.categories.length ? <div className="home-category-links"><span className="section-kicker">KATEGORİLER</span>{layoutQuery.data.categories.map((category) => <Link key={category.id} href={`/kategori/${category.slug}`}>{category.name} <ArrowRight size={14} /></Link>)}</div> : null}</section>
    <section className="community-note page-container"><div className="community-mark"><ShieldCheck size={25} /></div><div><span className="section-kicker">GÜVENLİ KULLANIM</span><h2>Saygı, açıklık ve <em>yetişkinlere özel.</em></h2><p>Platform 18 yaş ve üzeri ziyaretçilere yöneliktir. İlanların tümü yayın öncesinde gözden geçirilmeli ve gerekli izinlere sahip olmalıdır.</p></div><a href="#community" className="community-link">İlkeleri incele <ArrowRight size={16} /></a></section>
  </main><SiteFooter /><a href="#top" className="back-to-top" aria-label="Sayfanın başına dön" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}><ArrowDown size={17} /></a></div>;
}
