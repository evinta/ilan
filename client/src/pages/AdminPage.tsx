import { useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import { ArrowLeft, BadgeCheck, Check, CircleAlert, Clock3, Eye, FilePlus2, ImagePlus, LayoutDashboard, LogOut, MapPin, Pencil, Plus, Search, Settings2, ShieldCheck, Trash2, Upload, UsersRound, X } from "lucide-react";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import type { AdminListing } from "@/data/profiles";
import { BrandLogo } from "@/components/site/SiteShell";
import LocalAdminLogin from "@/components/admin/LocalAdminLogin";
import ContentManagerPanel from "@/components/admin/ContentManagerPanel";
import { usePageMeta } from "@/hooks/usePageMeta";
import "./AdminPage.css";

type GalleryItem = { id: string; key?: string; file?: File; previewUrl: string };
type FormState = {
  name: string; age: string; district: string; location: string; summary: string; about: string; height: string;
  languagesText: string; tagsText: string; gallery: GalleryItem[]; contactPhone: string; contactVisible: boolean;
  categoryId: number | null; locationId: number | null; seoTitle: string; seoDescription: string; allowIndexing: boolean;
  isVerified: boolean; isFeatured: boolean; adultConfirmed: boolean; imageRightsConfirmed: boolean; status: "draft" | "published";
};
const emptyForm: FormState = { name: "", age: "18", district: "", location: "", summary: "", about: "", height: "", languagesText: "Türkçe", tagsText: "", gallery: [], contactPhone: "", contactVisible: false, categoryId: null, locationId: null, seoTitle: "", seoDescription: "", allowIndexing: true, isVerified: false, isFeatured: false, adultConfirmed: false, imageRightsConfirmed: false, status: "draft" };
const splitList = (value: string) => value.split(",").map((part) => part.trim()).filter(Boolean).slice(0, 20);
function toForm(item?: AdminListing | null): FormState {
  if (!item) return { ...emptyForm };
  return { name: item.name, age: String(item.age), district: item.district, location: item.location, summary: item.summary, about: item.about, height: item.height, languagesText: item.languages.join(", "), tagsText: item.tags.join(", "), gallery: item.imageKeys.map((key, index) => ({ id: key, key, previewUrl: item.imageUrls[index] ?? "" })), contactPhone: item.contactPhone ?? "", contactVisible: item.contactVisible, categoryId: item.categoryId, locationId: item.locationId, seoTitle: item.seoTitle ?? "", seoDescription: item.seoDescription ?? "", allowIndexing: item.allowIndexing, isVerified: item.isVerified, isFeatured: item.isFeatured, adultConfirmed: item.adultConfirmed, imageRightsConfirmed: item.imageRightsConfirmed, status: item.status === "published" ? "published" : "draft" };
}
function statusLabel(status: AdminListing["status"]) { return status === "published" ? "Yayında" : status === "archived" ? "Arşiv" : "Taslak"; }

export default function AdminPage() {
  const utils = trpc.useUtils();
  const auth = trpc.auth.me.useQuery();
  const user = auth.data;
  const isAdmin = user?.role === "admin";
  usePageMeta({ title: "Yönetim paneli | VIP İlan", description: "VIP İlan site, SEO ve ilan yönetim paneli.", path: "/admin", noIndex: true });
  const query = trpc.listings.adminList.useQuery(undefined, { enabled: isAdmin });
  const listingOptions = trpc.site.adminListingOptions.useQuery(undefined, { enabled: isAdmin });
  const create = trpc.listings.create.useMutation();
  const update = trpc.listings.update.useMutation();
  const archiveListing = trpc.listings.archive.useMutation();
  const uploadImage = trpc.listings.uploadListingImage.useMutation();
  const logout = trpc.auth.logout.useMutation({ onSuccess: async () => { await utils.auth.me.invalidate(); } });
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<AdminListing | null>(null);
  const [creating, setCreating] = useState(false);
  const [adminSection, setAdminSection] = useState<"listings" | "site">("listings");
  const [form, setForm] = useState<FormState>({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const rows = query.data ?? [];
  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("tr-TR");
    return rows.filter((item) => !term || `${item.name} ${item.location} ${item.district} ${item.slug}`.toLocaleLowerCase("tr-TR").includes(term));
  }, [rows, search]);
  const metrics = useMemo(() => ({ total: rows.filter((item) => item.status !== "archived").length, published: rows.filter((item) => item.status === "published").length, drafts: rows.filter((item) => item.status === "draft").length, archived: rows.filter((item) => item.status === "archived").length }), [rows]);
  const patch = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((old) => ({ ...old, [key]: value }));
  const releaseGallery = (gallery: GalleryItem[]) => gallery.forEach((image) => { if (image.file) URL.revokeObjectURL(image.previewUrl); });
  const closeEditor = () => { releaseGallery(form.gallery); setCreating(false); setEditing(null); setForm({ ...emptyForm }); };
  const beginCreate = () => { releaseGallery(form.gallery); setAdminSection("listings"); setEditing(null); setCreating(true); setForm({ ...emptyForm }); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const beginEdit = (item: AdminListing) => { releaseGallery(form.gallery); setAdminSection("listings"); setEditing(item); setCreating(false); setForm(toForm(item)); window.scrollTo({ top: 0, behavior: "smooth" }); };

  const handleLogin = () => { try { startLogin(); } catch { toast.error("Manus girişi başlatılamadı. Sayfayı yenileyip tekrar deneyin."); } };
  const copyOpenId = async () => {
    if (!user?.openId) return;
    try { await navigator.clipboard.writeText(user.openId); toast.success("Hesap kimliği kopyalandı."); }
    catch { toast.error("Kopyalanamadı; kimliği seçerek kopyalayın."); }
  };
  const uploadFiles = (files: FileList | null) => {
    if (!files?.length) return;
    const selected = Array.from(files);
    const remaining = 12 - form.gallery.length;
    if (selected.length > remaining) { toast.error(`Bu ilana ${remaining} fotoğraf daha ekleyebilirsiniz; seçim depoya yüklenmedi.`); if (fileInput.current) fileInput.current.value = ""; return; }
    const invalid = selected.find((file) => !["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024);
    if (invalid) { toast.error(`${invalid.name}: yalnızca 5 MB'a kadar JPG, PNG veya WebP seçin.`); if (fileInput.current) fileInput.current.value = ""; return; }
    const pending = selected.map((file) => ({ id: crypto.randomUUID(), file, previewUrl: URL.createObjectURL(file) }));
    setForm((old) => ({ ...old, gallery: [...old.gallery, ...pending] }));
    toast.success("Fotoğraflar yerel taslağa eklendi; kaydetmeden storage'a gönderilmez.");
    if (fileInput.current) fileInput.current.value = "";
  };
  const saveListing = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const age = Number(form.age);
    if (!Number.isInteger(age) || age < 18 || age > 99) { toast.error("Yaş 18–99 arasında olmalıdır."); return; }
    if (!form.locationId) { toast.error("İlanı yayımlamadan veya kaydetmeden önce yönetimde tanımlı bir şehir/semt seçin."); return; }
    if (form.status === "published" && (!form.adultConfirmed || !form.imageRightsConfirmed || form.gallery.length === 0)) { toast.error("Yayın için 18+ beyanı, görsel kullanım izni ve en az bir fotoğraf gereklidir."); return; }
    if (form.contactVisible && !form.contactPhone.trim()) { toast.error("İletişim bilgisini göstermek için telefon numarası girin."); return; }
    const existingKeys = form.gallery.flatMap((image) => image.key ? [image.key] : []);
    const draftData = { name: form.name.trim(), age, district: form.district.trim(), location: form.location.trim(), summary: form.summary.trim(), about: form.about.trim(), height: form.height.trim() || "Belirtilmedi", languages: splitList(form.languagesText).slice(0, 12), tags: splitList(form.tagsText), imageKeys: existingKeys, categoryId: form.categoryId, locationId: form.locationId, seoTitle: form.seoTitle.trim() || null, seoDescription: form.seoDescription.trim() || null, allowIndexing: form.allowIndexing, contactPhone: form.contactPhone.trim() || null, contactVisible: form.contactVisible, isVerified: form.isVerified, isFeatured: form.isFeatured, adultConfirmed: form.adultConfirmed, imageRightsConfirmed: form.imageRightsConfirmed, status: "draft" as const };
    setSaving(true);
    let savedListing: AdminListing | null = editing;
    try {
      if (savedListing) await update.mutateAsync({ id: savedListing.id, data: draftData });
      else { savedListing = await create.mutateAsync(draftData); setEditing(savedListing); setCreating(false); }
      setUploading(form.gallery.some((image) => Boolean(image.file)));
      const uploadedKeys = new Map<string, string>();
      for (const image of form.gallery) {
        if (image.key || !image.file || !savedListing) continue;
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Dosya okunamadı"));
          reader.onerror = () => reject(new Error("Dosya okunamadı"));
          reader.readAsDataURL(image.file!);
        });
        const dataBase64 = dataUrl.split(",")[1];
        if (!dataBase64) throw new Error("Görsel verisi okunamadı.");
        const result = await uploadImage.mutateAsync({ listingId: savedListing.id, fileName: image.file.name, mimeType: image.file.type as "image/jpeg" | "image/png" | "image/webp", dataBase64 });
        uploadedKeys.set(image.id, result.key);
        URL.revokeObjectURL(image.previewUrl);
        setForm((old) => ({ ...old, gallery: old.gallery.map((item) => item.id === image.id ? { id: image.id, key: result.key, previewUrl: result.url } : item) }));
      }
      const imageKeys = form.gallery.map((image) => image.key ?? uploadedKeys.get(image.id)).filter((key): key is string => Boolean(key));
      const data = { ...draftData, imageKeys, status: form.status };
      if (!savedListing) throw new Error("İlan kaydı oluşturulamadı.");
      await update.mutateAsync({ id: savedListing.id, data });
      await Promise.all([utils.listings.adminList.invalidate(), utils.listings.publicList.invalidate()]);
      await utils.listings.publicDetail.invalidate({ slug: savedListing.slug });
      toast.success(data.status === "published" ? "İlan yayımlandı." : "İlan taslak olarak kaydedildi.");
      closeEditor();
    } catch (error) {
      if (savedListing) { setEditing(savedListing); setCreating(false); await utils.listings.adminList.invalidate(); }
      toast.error(error instanceof Error ? `${error.message} Yüklenen fotoğraflar varsa taslak ilanda korunur.` : "İlan kaydedilemedi.");
    } finally { setUploading(false); setSaving(false); }
  };
  const doArchive = async (item: AdminListing) => {
    if (!window.confirm(`“${item.name}” ilanı arşive alınsın mı? Public sayfalardan kalkar; kayıt arşivde kalır.`)) return;
    try {
      await archiveListing.mutateAsync({ id: item.id });
      await Promise.all([utils.listings.adminList.invalidate(), utils.listings.publicList.invalidate(), utils.listings.publicDetail.invalidate({ slug: item.slug })]);
      toast.success("İlan arşivlendi ve public görünümden kaldırıldı.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "İlan arşivlenemedi."); }
  };

  if (auth.isLoading) return <div className="admin-gate"><div className="admin-gate-card"><BrandLogo /><p>Hesap durumu kontrol ediliyor…</p></div></div>;
  if (auth.isError) return <div className="admin-gate"><div className="admin-gate-card"><BrandLogo /><CircleAlert size={28} /><h1>Bağlantı kurulamadı</h1><p>Kimlik doğrulama servisine ulaşılamadı. Sayfayı yenileyip tekrar deneyin.</p><button className="admin-primary-button" onClick={() => void auth.refetch()}>Tekrar dene</button><Link href="/" className="admin-gate-back"><ArrowLeft size={14} /> Ana sayfa</Link></div></div>;
  if (!user && window.__MANUS_CONFIG__?.authProvider === "local") return <LocalAdminLogin />;
  if (!user) return <div className="admin-gate"><div className="admin-gate-card"><BrandLogo /><span className="admin-kicker">YÖNETİCİ ALANI</span><h1>Yönetim paneline giriş</h1><p>İlanları yönetmek için yetkili Manus hesabınızla oturum açın. Ziyaretçi hesabıyla ilan yönetilemez.</p><button className="admin-primary-button" onClick={handleLogin}>Manus ile giriş yap</button><Link href="/" className="admin-gate-back"><ArrowLeft size={14} /> Ana sayfa</Link></div></div>;
  if (!isAdmin) return <div className="admin-gate"><div className="admin-gate-card admin-access-card"><BrandLogo /><span className="admin-kicker">YÖNETİCİ YETKİSİ GEREKLİ</span><h1>Bu hesap yönetici değil</h1><p>Oturum açıldı ancak bu hesapta ilan yönetme izni yok. Proje sahibinin aşağıdaki hesap kimliğini WebDev gizli ayarına <code>OWNER_OPEN_ID</code> adıyla eklemesi gerekir. Değer kod içine yazılmaz.</p><div className="open-id-box"><code>{user.openId}</code><button onClick={() => void copyOpenId()}>Kopyala</button></div><div className="admin-setup-note"><ShieldCheck size={17} /><span>Kimliği ayarladıktan sonra çıkış yapıp yeniden giriş yapın. Rol server tarafında kontrol edilir.</span></div><button className="admin-secondary-button" onClick={() => logout.mutate()}>Çıkış yap</button><Link href="/" className="admin-gate-back"><ArrowLeft size={14} /> Ana sayfa</Link></div></div>;

  return <div className="admin-app">
    <aside className="admin-sidebar"><div className="admin-sidebar-brand"><BrandLogo /></div><div className="admin-sidebar-label">YÖNETİM</div><a href="#dashboard" onClick={() => setAdminSection("listings")} className={`admin-side-link ${adminSection === "listings" ? "is-active" : ""}`}><LayoutDashboard size={17} /> Genel bakış</a><a href="#dashboard" onClick={() => setAdminSection("listings")} className="admin-side-link"><UsersRound size={17} /> İlanlar <span>{metrics.total}</span></a><a href="#dashboard" onClick={() => setAdminSection("site")} className={`admin-side-link ${adminSection === "site" ? "is-active" : ""}`}><Settings2 size={17} /> Site içeriği ve SEO</a><div className="admin-sidebar-bottom"><div className="admin-user-card"><span className="admin-avatar">{user.name?.slice(0, 1).toLocaleUpperCase("tr-TR") || "Y"}</span><span><strong>{user.name || "Yönetici"}</strong><small>Yönetici hesabı</small></span><button aria-label="Çıkış yap" onClick={() => logout.mutate()}><LogOut size={16} /></button></div><Link href="/" className="admin-view-site"><Eye size={15} /> Siteyi görüntüle</Link></div></aside>
    <main className="admin-main" id="dashboard">
      <header className="admin-topbar"><div><span className="admin-breadcrumb">VIP İlan <span>/</span> Yönetim</span><h1>{adminSection === "site" ? "Site içeriği ve SEO" : "Genel bakış"}</h1></div><div className="admin-top-actions"><span className="admin-top-user"><i className="admin-online-dot" /> Güvenli oturum</span>{adminSection === "listings" && <button className="admin-new-button" onClick={beginCreate}><Plus size={16} /> Yeni ilan</button>}</div></header>
      <div className="admin-content">
        {adminSection === "site" ? <ContentManagerPanel /> : <>
        <section className="admin-welcome"><div><span className="admin-kicker">İLAN YÖNETİMİ</span><h2>Hoş geldin{user.name ? `, ${user.name.split(" ")[0]}` : ""}.</h2><p>İlan oluştur, gözden geçir ve yayına al. Yayındaki ilanlar herkese açık vitrinde görünür.</p></div><div className="admin-welcome-mark"><LayoutDashboard size={24} /></div></section>
        <section className="admin-metrics-grid"><div className="admin-metric"><span className="metric-icon metric-plum"><UsersRound size={18} /></span><span className="metric-label">TOPLAM İLAN</span><strong>{metrics.total}</strong><small>Arşiv hariç</small></div><div className="admin-metric"><span className="metric-icon metric-green"><Eye size={18} /></span><span className="metric-label">YAYINDA</span><strong>{metrics.published}</strong><small>Herkese açık</small></div><div className="admin-metric"><span className="metric-icon metric-amber"><FilePlus2 size={18} /></span><span className="metric-label">TASLAK</span><strong>{metrics.drafts}</strong><small>Henüz yayında değil</small></div><div className="admin-metric"><span className="metric-icon metric-grey"><Trash2 size={17} /></span><span className="metric-label">ARŞİV</span><strong>{metrics.archived}</strong><small>Public sayfalarda gizli</small></div></section>

        {(creating || editing) && <section className="admin-editor" id="listing-editor"><div className="admin-editor-heading"><div><span className="admin-kicker">{editing ? `İLAN #${editing.id}` : "YENİ KAYIT"}</span><h2>{editing ? `${editing.name} ilanını düzenle` : "Yeni ilan oluştur"}</h2></div><button className="admin-close-editor" onClick={closeEditor} aria-label="Düzenleyiciyi kapat"><X size={18} /></button></div>
          <form className="admin-form" onSubmit={saveListing}>
            <div className="admin-form-section"><div className="admin-form-section-title"><span>01</span><div><strong>Temel bilgiler</strong><small>İlan kartında ve profil sayfasında görünür.</small></div></div><div className="admin-form-grid">
              <label className="admin-field"><span>Profil adı <b>*</b></span><input required maxLength={120} value={form.name} onChange={(e) => patch("name", e.target.value)} placeholder="Örn. Vika" /></label>
              <label className="admin-field"><span>Yaş <b>*</b></span><input required type="number" min={18} max={99} value={form.age} onChange={(e) => patch("age", e.target.value)} /></label>
              <label className="admin-field"><span>Şehir / semt <b>*</b></span><select required value={form.locationId ?? ""} onChange={(e) => { const selected = listingOptions.data?.locations.find((item) => item.id === Number(e.target.value)); setForm((old) => ({ ...old, locationId: selected?.id ?? null, district: selected?.district ?? "", location: selected ? `${selected.city}, ${selected.district}` : "" })); }}><option value="">Önce içerik yönetiminden bölge ekleyin</option>{listingOptions.data?.locations.map((item) => <option key={item.id} value={item.id}>{item.city} · {item.district}</option>)}</select>{listingOptions.isError && <small>Bölgeler yüklenemedi. Sayfayı yenileyin.</small>}</label>
              <label className="admin-field"><span>Kategori</span><select value={form.categoryId ?? ""} onChange={(e) => patch("categoryId", e.target.value ? Number(e.target.value) : null)}><option value="">Kategori seçilmedi</option>{listingOptions.data?.categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
              <label className="admin-field admin-field-wide"><span>Konum gösterimi</span><input readOnly value={form.location} placeholder="Önce şehir/semt seçin" /></label>
              <label className="admin-field admin-field-wide"><span>Kısa tanıtım <b>*</b><small>{form.summary.length}/420</small></span><textarea required maxLength={420} rows={2} value={form.summary} onChange={(e) => patch("summary", e.target.value)} placeholder="Kartta görünecek kısa açıklama" /></label>
              <label className="admin-field admin-field-wide"><span>Profil açıklaması <b>*</b></span><textarea required maxLength={8000} rows={5} value={form.about} onChange={(e) => patch("about", e.target.value)} placeholder="Profil sayfasındaki açıklama" /></label>
              <label className="admin-field"><span>Boy bilgisi</span><input maxLength={32} value={form.height} onChange={(e) => patch("height", e.target.value)} placeholder="1,70 m" /></label>
              <label className="admin-field"><span>Diller <small>Virgülle ayırın</small></span><input value={form.languagesText} onChange={(e) => patch("languagesText", e.target.value)} placeholder="Türkçe, English" /></label>
              <label className="admin-field admin-field-wide"><span>Özellik etiketleri <small>Virgülle ayırın</small></span><input value={form.tagsText} onChange={(e) => patch("tagsText", e.target.value)} placeholder="VIP, Lara, Onaylı profil" /></label>
            </div></div>

            <div className="admin-form-section"><div className="admin-form-section-title"><span>02</span><div><strong>Arama görünümü (SEO)</strong><small>İlanın arama sonucu başlığı, açıklaması ve indeks tercihi.</small></div></div><div className="admin-form-grid">
              <label className="admin-field admin-field-wide"><span>SEO title <small>{form.seoTitle.length}/180</small></span><input maxLength={180} value={form.seoTitle} onChange={(e) => patch("seoTitle", e.target.value)} placeholder="Boş bırakılırsa ilan adı ve konum kullanılır" /></label>
              <label className="admin-field admin-field-wide"><span>Meta description <small>{form.seoDescription.length}/320</small></span><textarea maxLength={320} rows={3} value={form.seoDescription} onChange={(e) => patch("seoDescription", e.target.value)} placeholder="Boş bırakılırsa kısa profil tanıtımı kullanılır" /></label>
              <label className="admin-check-row"><input type="checkbox" checked={form.allowIndexing} onChange={(e) => patch("allowIndexing", e.target.checked)} /><span><strong>Arama motorları bu ilanı indeksleyebilir</strong><small>Kapalı olduğunda public ilanda noindex kullanılır ve sitemap'ten çıkarılır.</small></span></label>
            </div></div>

            <div className="admin-form-section"><div className="admin-form-section-title"><span>03</span><div><strong>Fotoğraf galerisi</strong><small>JPG, PNG veya WebP · en fazla 5 MB/fotoğraf · en çok 12 görsel.</small></div></div><input ref={fileInput} className="admin-hidden-input" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(e) => uploadFiles(e.target.files)} />
              <button type="button" className="admin-upload-zone" onClick={() => fileInput.current?.click()} disabled={saving || form.gallery.length >= 12}><span className="upload-zone-icon">{uploading ? <span className="admin-spinner" /> : <ImagePlus size={22} />}</span><span><strong>{uploading ? "Taslak fotoğraflar kaydediliyor…" : "Fotoğraf seç veya buraya tıkla"}</strong><small>Seçtikleriniz önce yerel taslakta kalır; kaydet sırasında sunucu doğrular ve storage'a bağlar.</small></span><span className="upload-zone-action"><Upload size={15} /> Ekle</span></button>
              {form.gallery.length ? <div className="admin-image-list">{form.gallery.map((image, i) => <div className="admin-image-item" key={image.id}><img src={image.previewUrl} alt={`Fotoğraf ${i + 1}`} /><div><strong>Fotoğraf {i + 1}</strong><small>{image.file ? "Kaydedince yüklenecek" : i === 0 ? "Kapak görseli" : "Galeri görseli"}</small></div><div className="admin-image-actions"><button type="button" disabled={saving || i === 0} onClick={() => setForm((old) => { const next = [...old.gallery]; [next[i - 1], next[i]] = [next[i], next[i - 1]]; return { ...old, gallery: next }; })} aria-label="Önce taşı">↑</button><button type="button" disabled={saving || i === form.gallery.length - 1} onClick={() => setForm((old) => { const next = [...old.gallery]; [next[i + 1], next[i]] = [next[i], next[i + 1]]; return { ...old, gallery: next }; })} aria-label="Sonra taşı">↓</button><button type="button" disabled={saving} className="remove-image-button" onClick={() => { const image = form.gallery[i]; if (image.file) URL.revokeObjectURL(image.previewUrl); patch("gallery", form.gallery.filter((_, j) => i !== j)); }} aria-label="Fotoğrafı kaldır"><X size={14} /></button></div></div>)}</div> : <div className="admin-empty-gallery"><ImagePlus size={19} /> Taslak fotoğrafsız kaydedilebilir; yayına almak için en az bir fotoğraf ekleyin.</div>}
            </div>

            <div className="admin-form-section"><div className="admin-form-section-title"><span>04</span><div><strong>İletişim ve görünürlük</strong><small>Telefon yalnızca izin verildiğinde yayındaki profilde iletişim düğmesi üzerinden sunulur.</small></div></div><div className="admin-form-grid">
              <label className="admin-field"><span>Telefon numarası</span><input type="tel" maxLength={40} value={form.contactPhone} onChange={(e) => patch("contactPhone", e.target.value)} placeholder="+90 …" /></label>
              <div className="admin-option-list"><label className="admin-check-row"><input type="checkbox" checked={form.contactVisible} onChange={(e) => patch("contactVisible", e.target.checked)} /><span><strong>İletişim bilgisini göster</strong><small>Numara public iletişim akışında açılır.</small></span></label><label className="admin-check-row"><input type="checkbox" checked={form.isVerified} onChange={(e) => patch("isVerified", e.target.checked)} /><span><strong>Onaylı rozetini göster</strong><small>Yalnızca doğrulama tamamlandıysa seçin.</small></span></label><label className="admin-check-row"><input type="checkbox" checked={form.isFeatured} onChange={(e) => patch("isFeatured", e.target.checked)} /><span><strong>Öne çıkarılan ilan</strong><small>Ana sayfa sıralamasında öncelik verir.</small></span></label></div>
            </div></div>

            <div className="admin-compliance-box"><div className="admin-compliance-heading"><ShieldCheck size={19} /><div><strong>Yayın öncesi zorunlu beyanlar</strong><small>Yayımlama için her iki beyan da gereklidir.</small></div></div><label className="admin-check-row compliance-row"><input type="checkbox" checked={form.adultConfirmed} onChange={(e) => patch("adultConfirmed", e.target.checked)} /><span><strong>Bu ilan yalnızca 18 yaş ve üzeri, rızası bulunan yetişkinler hakkındadır.</strong><small>Reşit olmayanlara ait içerik veya şüpheli kayıt yayımlanamaz.</small></span></label><label className="admin-check-row compliance-row"><input type="checkbox" checked={form.imageRightsConfirmed} onChange={(e) => patch("imageRightsConfirmed", e.target.checked)} /><span><strong>İlan ve görseller için gerekli izin ve yayın hakkı mevcut.</strong><small>Görseller kişinin izni ve geçerli kullanım hakkı olmadan yayımlanmamalıdır.</small></span></label></div>

            <div className="admin-form-footer"><div><label className="admin-field status-select-field"><span>Kaydetme durumu</span><select value={form.status} onChange={(e) => patch("status", e.target.value as FormState["status"])}><option value="draft">Taslak olarak kaydet</option><option value="published">Yayımla</option></select></label><small className="admin-status-note">{form.status === "published" ? "Kaydedilince herkes tarafından görülebilir." : "Taslak yalnızca yönetim panelinde görünür."}</small></div><div className="admin-form-buttons"><button type="button" className="admin-cancel-button" onClick={closeEditor}>Vazgeç</button><button type="submit" disabled={saving || uploading} className="admin-primary-button">{saving ? "Kaydediliyor…" : form.status === "published" ? <><Eye size={16} /> Yayımla</> : <><Check size={16} /> Taslak kaydet</>}</button></div></div>
          </form></section>}

        <section className="admin-list-section" id="listing-manager"><div className="admin-list-heading"><div><span className="admin-kicker">KAYITLARIN</span><h2>İlanlar</h2></div><div className="admin-list-actions"><label className="admin-search"><Search size={16} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="İlan ara…" /></label><button className="admin-primary-button compact" onClick={beginCreate}><Plus size={15} /> Yeni ilan</button></div></div>
          {query.isLoading ? <div className="admin-list-placeholder">İlanlar yükleniyor…</div> : query.isError ? <div className="admin-list-error"><CircleAlert size={19} /><span>İlanlar alınamadı. Veritabanı bağlantısı ve migration durumunu kontrol edin.</span><button onClick={() => void query.refetch()}>Tekrar dene</button></div> : !filtered.length ? <div className="admin-empty-list"><span><FilePlus2 size={23} /></span><strong>{search ? "Eşleşen ilan bulunamadı." : "Henüz ilan eklenmemiş."}</strong><p>{search ? "Arama ifadesini değiştirin." : "İlk ilanı ekleyin; taslak kaydedin veya yayınlayın."}</p><button className="admin-primary-button" onClick={beginCreate}><Plus size={15} /> İlk ilanı ekle</button></div> : <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>İLAN</th><th>DURUM</th><th>BÖLGE</th><th>GÜNCELLEME</th><th className="table-action-heading">İŞLEM</th></tr></thead><tbody>{filtered.map((item) => <tr key={item.id}><td><div className="admin-table-listing"><img src={item.imageUrls[0] || undefined} alt="" /><span><strong>{item.name}, {item.age}</strong><small>{item.slug}{item.isVerified && <BadgeCheck size={12} />}</small></span></div></td><td><span className={`admin-status status-${item.status}`}><i />{statusLabel(item.status)}</span></td><td><span className="admin-table-location"><MapPin size={13} /> {item.district}</span></td><td><span className="admin-table-date"><Clock3 size={13} /> {new Date(item.updatedAt).toLocaleDateString("tr-TR")}</span></td><td><div className="admin-row-actions"><button aria-label={`${item.name} düzenle`} onClick={() => beginEdit(item)}><Pencil size={15} /></button>{item.status !== "archived" && <button className="archive-action" aria-label={`${item.name} arşivle`} onClick={() => void doArchive(item)}><Trash2 size={15} /></button>}{item.status === "published" && <Link href={`/profil/${item.slug}`} target="_blank" aria-label={`${item.name} profilini görüntüle`}><Eye size={15} /></Link>}</div></td></tr>)}</tbody></table></div>}
          <div className="admin-list-footnote"><ShieldCheck size={14} /> Taslaklar ve arşiv public sayfalarda görünmez; arşivleme storage dosyalarını fiziksel olarak silmez.</div>
        </section><footer className="admin-footer"><span>VIP İlan Yönetim Sistemi</span><Link href="/">Siteye dön <ArrowLeft size={13} /></Link></footer>
        </>}
      </div>
    </main>
  </div>;
}
