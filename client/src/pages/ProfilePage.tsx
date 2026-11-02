import { useState } from "react";
import { useRoute, Link } from "wouter";
import { ArrowLeft, ArrowRight, BadgeCheck, Check, ChevronLeft, ChevronRight, Clock3, Heart, Languages, MapPin, MessageCircle, Share2, ShieldCheck, Sparkles, X } from "lucide-react";
import ProfileCard from "@/components/site/ProfileCard";
import { SiteFooter, SiteHeader } from "@/components/site/SiteShell";
import { trpc } from "@/lib/trpc";
import { usePageMeta } from "@/hooks/usePageMeta";

export default function ProfilePage() {
  const [, params] = useRoute("/profil/:slug");
  const slug = params?.slug ?? "";
  const profileQuery = trpc.listings.publicDetail.useQuery({ slug }, { enabled: Boolean(slug) });
  const similarQuery = trpc.listings.publicList.useQuery();
  const layoutQuery = trpc.site.publicLayout.useQuery();
  const revealContact = trpc.listings.publicContact.useMutation();
  const profile = profileQuery.data;
  const siteName = layoutQuery.data?.settings.siteName ?? "VIP İlan";
  const [activePhoto, setActivePhoto] = useState(0);
  const [contact, setContact] = useState<string | null>(null);
  const [contactOpen, setContactOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  usePageMeta({ title: profile?.seoTitle || (profile ? `${profile.name}, ${profile.age} | ${profile.district} | ${siteName}` : `Profil | ${siteName}`), description: profile?.seoDescription || profile?.summary || layoutQuery.data?.settings.defaultSeoDescription || "Yayındaki profilleri keşfedin.", path: `/profil/${slug}`, siteName, image: profile?.images[0], noIndex: !profile?.allowIndexing, type: "article" });
  const photos = profile?.images.length ? profile.images : profile?.image ? [profile.image] : [];
  const similar = (similarQuery.data ?? []).filter((item) => item.slug !== slug).slice(0, 3);
  const move = (direction: number) => setActivePhoto((index) => (index + direction + photos.length) % photos.length);
  const openContact = async () => {
    setContactOpen(true);
    if (!profile?.contactVisible) return;
    try { const result = await revealContact.mutateAsync({ slug }); setContact(result.phone); }
    catch { setContact(null); }
  };
  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: `${profile?.name ?? "Profil"} · VIP İlan`, url: window.location.href });
      else if (navigator.clipboard) { await navigator.clipboard.writeText(window.location.href); setCopied(true); window.setTimeout(() => setCopied(false), 2200); }
    } catch { /* Share-sheet cancellation is expected. */ }
  };

  if (profileQuery.isLoading) return <div className="profile-loading"><span className="admin-spinner" /> Profil yükleniyor…</div>;
  if (profileQuery.isError) return <div className="profile-load-error"><ShieldCheck size={25} /><h1>{profileQuery.error.data?.code === "NOT_FOUND" ? "İlan bulunamadı" : "Profil şu anda yüklenemiyor"}</h1><p>{profileQuery.error.data?.code === "NOT_FOUND" ? "İlan yayında değil veya artık mevcut değil." : "Bağlantınızı kontrol edip tekrar deneyin."}</p><Link href="/" className="button button-gold"><ArrowLeft size={15} /> Ana sayfaya dön</Link></div>;
  if (!profile) return null;

  return <div className="site-page"><SiteHeader /><main className="profile-page-main"><div className="page-container">
    <div className="breadcrumbs"><Link href="/">Ana sayfa</Link><ChevronRight size={14} /><span>Profil</span><ChevronRight size={14} /><strong>{profile.name}</strong></div><Link href="/" className="back-link"><ArrowLeft size={15} /> İlanlara dön</Link>
    <section className="profile-layout"><div className="profile-gallery-column"><div className="profile-gallery-main">{photos[activePhoto] && <img src={photos[activePhoto]} alt={`${profile.name} profil galerisi, görsel ${activePhoto + 1}`} />}<div className="gallery-shade" /><div className="gallery-topline"><span className="gallery-count"><i className="camera-dot" /> {activePhoto + 1} / {photos.length} FOTOĞRAF</span><span className="gallery-demo">YAYINDA</span></div>{photos.length > 1 && <><button className="gallery-arrow gallery-prev" onClick={() => move(-1)} aria-label="Önceki fotoğraf"><ChevronLeft size={21} /></button><button className="gallery-arrow gallery-next" onClick={() => move(1)} aria-label="Sonraki fotoğraf"><ChevronRight size={21} /></button></>}<div className="gallery-caption"><span className="gallery-name">{profile.name}</span><span>{profile.location}</span></div></div>
      {photos.length > 1 && <div className="gallery-thumbnails">{photos.map((photo, i) => <button key={`${photo}-${i}`} className={`gallery-thumb ${i === activePhoto ? "is-active" : ""}`} onClick={() => setActivePhoto(i)} aria-label={`Fotoğraf ${i + 1}`}><img src={photo} alt="" /></button>)}<span className="gallery-caption-small">Profil görselleri ilan sahibi/yönetici tarafından eklenmiştir.</span></div>}</div>
      <div className="profile-summary-column"><div className="profile-detail-heading"><div className="profile-title-stack"><span className="profile-eyebrow"><i className="online-dot" /> {profile.activity.toLocaleUpperCase("tr-TR")}</span><h1>{profile.name}<span>, {profile.age}</span></h1><div className="profile-location"><MapPin size={16} /> {profile.location} <i className="location-dot">·</i> <span>{profile.district}</span></div></div><div className="profile-head-controls"><button className={`round-control ${saved ? "is-saved" : ""}`} aria-label={saved ? "Kaydı kaldır" : "Profili kaydet"} aria-pressed={saved} onClick={() => setSaved((value) => !value)}><Heart size={18} fill={saved ? "currentColor" : "none"} /></button><button className="round-control" aria-label="Profili paylaş" onClick={() => void share()}><Share2 size={17} /></button></div></div>
        <div className="profile-badges">{profile.verified && <span className="verified-badge"><BadgeCheck size={16} fill="currentColor" /> Onaylı profil</span>}{profile.premium && <span className="premium-badge"><Sparkles size={14} /> Öne çıkan</span>}</div><p className="profile-summary-text">{profile.summary}</p>
        <div className="profile-stats-row"><div><span>YAŞ</span><strong>{profile.age}</strong></div><div><span>BOY</span><strong>{profile.height}</strong></div><div><span>BEĞENİ</span><strong><Heart size={14} /> {profile.likes}</strong></div></div>
        <div className="profile-contact-actions"><button className="button button-primary contact-button" onClick={() => void openContact()} disabled={!profile.contactVisible}><MessageCircle size={18} /> {profile.contactVisible ? "İletişim bilgilerini gör" : "İletişim bilgisi yok"}</button><span className="contact-subline"><ShieldCheck size={14} /> İletişim bilgisi ilanın görünürlük ayarına bağlıdır</span></div>{copied && <div className="copy-feedback"><Check size={14} /> Profil bağlantısı kopyalandı</div>}
        <div className="profile-quick-info"><div className="quick-info-row"><span><Clock3 size={16} /> İlan durumu</span><strong>Yayında</strong></div><div className="quick-info-row"><span><MapPin size={16} /> Bölge</span><strong>{profile.district}, {profile.city ?? "Antalya"}</strong></div>{profile.categoryId && profile.categorySlug && <div className="quick-info-row"><span> Kategori</span><strong><Link href={`/kategori/${profile.categorySlug}`}>{profile.categoryName ?? "Kategoriyi görüntüle"}</Link></strong></div>}{profile.citySlug && profile.districtSlug && <div className="quick-info-row"><span>Semt sayfası</span><strong><Link href={`/bolge/${profile.citySlug}/${profile.districtSlug}`}>{profile.district}</Link></strong></div>}<div className="quick-info-row"><span><Languages size={16} /> Diller</span><strong>{profile.languages.join(" · ") || "Belirtilmedi"}</strong></div></div>
      </div></section>
    <section className="profile-content-grid"><div className="profile-about-card"><div className="content-section-heading"><span className="section-kicker">PROFİL TANITIMI</span><h2>Merhaba, ben <em>{profile.name}.</em></h2></div><p>{profile.about}</p><div className="profile-tags-heading">ÖNE ÇIKAN ÖZELLİKLER</div><div className="profile-feature-tags">{profile.tags.map((tag) => <span key={tag}><Check size={13} /> {tag}</span>)}</div></div><aside className="profile-guidelines-card"><span className="guidelines-icon"><ShieldCheck size={21} /></span><span className="section-kicker">GÜVENLİ KULLANIM</span><h3>Bilgiye bak,<br /><em>kararını kendin ver.</em></h3><p>İlanlar yayın öncesinde yönetici tarafından gözden geçirilir. Uygunsuz veya izinsiz içerikleri bildirin.</p><a href="#community">Topluluk ilkeleri <ArrowRight size={15} /></a></aside></section>
    <section className="related-section"><div className="section-heading-row related-heading"><div><div className="section-kicker"><span className="eyebrow-line" /> SANA GÖRE</div><h2>Benzer <em>profiller</em></h2><p className="section-intro">Antalya'dan diğer yayınlanmış profillere göz at.</p></div><Link href="/#profiles" className="text-link">Tüm ilanları gör <ArrowRight size={16} /></Link></div>{similar.length ? <div className="profiles-grid related-grid">{similar.map((item) => <ProfileCard key={item.slug} profile={item} />)}</div> : <div className="empty-results"><strong>Şimdilik benzer ilan yok.</strong></div>}</section>
  </div></main><SiteFooter />
    {contactOpen && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setContactOpen(false); }}><section className="contact-modal" role="dialog" aria-modal="true" aria-labelledby="contact-modal-title"><button className="modal-close" onClick={() => setContactOpen(false)} aria-label="Kapat"><X size={19} /></button><span className="modal-icon"><MessageCircle size={22} /></span><span className="section-kicker">İLETİŞİM</span><h2 id="contact-modal-title">{profile.name} ile iletişim</h2>{revealContact.isPending ? <p>İletişim bilgisi yükleniyor…</p> : contact ? <><p>Yayın sahibinin görünür kıldığı numara:</p><strong className="revealed-phone">{contact}</strong><div className="contact-modal-actions"><a className="button button-primary" href={`https://wa.me/${contact.replace(/\D/g, "")}`} target="_blank" rel="noreferrer"><MessageCircle size={16} /> WhatsApp</a><a className="button contact-call-button" href={`tel:${contact.replace(/\s/g, "")}`}>Ara</a></div></> : <p>Bu ilanda herkese açık bir iletişim numarası bulunmuyor.</p>}<button type="button" className="button button-outline-modal" onClick={() => setContactOpen(false)}>Kapat</button></section></div>}
  </div>;
}
