import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Check, ChevronDown, ExternalLink, FileText, Link2, MapPinned, PanelTop, Plus, Save, Settings2, Tags, ToggleLeft, ToggleRight, X } from "lucide-react";
import { trpc } from "@/lib/trpc";

type PanelTab = "settings" | "navigation" | "categories" | "locations" | "pages";
type SettingsDraft = {
  siteName: string; homeTitle: string; homeDescription: string; heroEyebrow: string;
  heroHeading: string; heroBody: string; defaultSeoTitle: string; defaultSeoDescription: string; defaultSocialImage: string | null;
};
type NavigationDraft = { id?: number; placement: "header" | "footer"; label: string; href: string; sortOrder: number; isActive: boolean };
type CategoryDraft = { id?: number; name: string; slug: string; description: string; seoTitle: string | null; seoDescription: string | null; allowIndexing: boolean; sortOrder: number; isActive: boolean };
type LocationDraft = { id?: number; city: string; citySlug: string; district: string; districtSlug: string; description: string; seoTitle: string | null; seoDescription: string | null; allowIndexing: boolean; sortOrder: number; isActive: boolean };
type PageDraft = { id?: number; slug: string; title: string; summary: string; body: string; seoTitle: string | null; seoDescription: string | null; allowIndexing: boolean; status: "draft" | "published" };
type SavedPage = Omit<PageDraft, "status"> & { id: number; status: "draft" | "published" | "archived"; publishedAt: Date | null; createdAt: Date; updatedAt: Date };

const emptyNavigation: NavigationDraft = { placement: "header", label: "", href: "/", sortOrder: 10, isActive: true };
const emptyCategory: CategoryDraft = { name: "", slug: "", description: "", seoTitle: null, seoDescription: null, allowIndexing: true, sortOrder: 10, isActive: true };
const emptyLocation: LocationDraft = { city: "Antalya", citySlug: "antalya", district: "", districtSlug: "", description: "", seoTitle: null, seoDescription: null, allowIndexing: true, sortOrder: 10, isActive: true };
const emptyPage: PageDraft = { slug: "", title: "", summary: "", body: "", seoTitle: null, seoDescription: null, allowIndexing: true, status: "draft" };
const tabs: Array<{ id: PanelTab; label: string; icon: typeof Settings2 }> = [
  { id: "settings", label: "Site ayarları", icon: Settings2 },
  { id: "navigation", label: "Menüler", icon: Link2 },
  { id: "categories", label: "Kategoriler", icon: Tags },
  { id: "locations", label: "Şehir / semt", icon: MapPinned },
  { id: "pages", label: "İçerik sayfaları", icon: FileText },
];

function slugify(value: string) {
  return value.trim().toLocaleLowerCase("tr-TR")
    .replaceAll("ı", "i").replaceAll("ğ", "g").replaceAll("ü", "u").replaceAll("ş", "s").replaceAll("ö", "o").replaceAll("ç", "c")
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 140);
}

function Field({ label, children, wide = false, hint }: { label: string; children: React.ReactNode; wide?: boolean; hint?: string }) {
  return <label className={`cms-field${wide ? " cms-field-wide" : ""}`}><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>;
}

function IndexToggle({ checked, onChange, label = "Arama motorlarında indeksle" }: { checked: boolean; onChange: (value: boolean) => void; label?: string }) {
  return <label className="cms-check"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /><span>{label}</span></label>;
}

function StatusBadge({ active }: { active: boolean }) {
  return <span className={`cms-status ${active ? "is-active" : "is-inactive"}`}>{active ? "Aktif" : "Pasif"}</span>;
}

export default function ContentManagerPanel() {
  const utils = trpc.useUtils();
  const query = trpc.site.adminLists.useQuery();
  const [tab, setTab] = useState<PanelTab>("settings");
  const [settings, setSettings] = useState<SettingsDraft | null>(null);
  const [navigation, setNavigation] = useState<NavigationDraft>({ ...emptyNavigation });
  const [category, setCategory] = useState<CategoryDraft>({ ...emptyCategory });
  const [location, setLocation] = useState<LocationDraft>({ ...emptyLocation });
  const [page, setPage] = useState<PageDraft>({ ...emptyPage });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (query.data && !settings) {
      const value = query.data.settings;
      setSettings({ siteName: value.siteName, homeTitle: value.homeTitle, homeDescription: value.homeDescription, heroEyebrow: value.heroEyebrow, heroHeading: value.heroHeading, heroBody: value.heroBody, defaultSeoTitle: value.defaultSeoTitle, defaultSeoDescription: value.defaultSeoDescription, defaultSocialImage: value.defaultSocialImage });
    }
  }, [query.data, settings]);

  const refresh = async () => Promise.all([utils.site.adminLists.invalidate(), utils.site.publicLayout.invalidate(), utils.site.adminListingOptions.invalidate()]);
  const withSaving = async (action: () => Promise<unknown>, success: string) => {
    setSaving(true);
    try { await action(); await refresh(); toast.success(success); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Kaydedilemedi. Tekrar deneyin."); }
    finally { setSaving(false); }
  };

  const updateSettings = trpc.site.updateSettings.useMutation();
  const saveNavigationMutation = trpc.site.saveNavigation.useMutation();
  const setNavigationActive = trpc.site.setNavigationActive.useMutation();
  const saveCategoryMutation = trpc.site.saveCategory.useMutation();
  const setCategoryActive = trpc.site.setCategoryActive.useMutation();
  const saveLocationMutation = trpc.site.saveLocation.useMutation();
  const setLocationActive = trpc.site.setLocationActive.useMutation();
  const savePageMutation = trpc.site.saveContentPage.useMutation();
  const archivePageMutation = trpc.site.archiveContentPage.useMutation();

  const submitSettings = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!settings) return;
    void withSaving(() => updateSettings.mutateAsync(settings), "Site ayarları kaydedildi.");
  };
  const submitNavigation = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void withSaving(async () => { await saveNavigationMutation.mutateAsync(navigation); setNavigation({ ...emptyNavigation, placement: navigation.placement }); }, "Menü bağlantısı kaydedildi.");
  };
  const submitCategory = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void withSaving(async () => { await saveCategoryMutation.mutateAsync(category); setCategory({ ...emptyCategory, sortOrder: (query.data?.categories.length ?? 0) * 10 + 10 }); }, "Kategori kaydedildi.");
  };
  const submitLocation = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void withSaving(async () => { await saveLocationMutation.mutateAsync(location); setLocation({ ...emptyLocation, sortOrder: (query.data?.locations.length ?? 0) * 10 + 10 }); }, "Şehir/semt kaydedildi.");
  };
  const submitPage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void withSaving(async () => { await savePageMutation.mutateAsync(page); setPage({ ...emptyPage, status: page.status }); }, page.status === "published" ? "İçerik sayfası yayımlandı." : "İçerik sayfası taslak kaydedildi.");
  };

  const startNavigationEdit = (item: NavigationDraft) => { setNavigation({ ...item }); setTab("navigation"); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const startCategoryEdit = (item: CategoryDraft) => { setCategory({ ...item }); setTab("categories"); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const startLocationEdit = (item: LocationDraft) => { setLocation({ ...item }); setTab("locations"); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const startPageEdit = (item: SavedPage) => { setPage({ ...item, status: item.status === "published" ? "published" : "draft" }); setTab("pages"); window.scrollTo({ top: 0, behavior: "smooth" }); };

  if (query.isLoading) return <section className="cms-panel"><div className="cms-empty">Site yönetim verileri yükleniyor…</div></section>;
  if (query.isError || !query.data) return <section className="cms-panel"><div className="cms-empty cms-error">Site yönetim verileri alınamadı. Sayfayı yenileyip tekrar deneyin.</div></section>;
  const data = query.data;

  return <section className="cms-panel">
    <div className="cms-intro"><div><span className="admin-kicker">İÇERİK VE SEO</span><h2>Siteyi kod yazmadan düzenle</h2><p>Buradaki değişiklikler veritabanına kaydedilir; menü, kategori, bölge ve meta içerikler sayfalarda kullanılır.</p></div><div className="cms-intro-icon"><PanelTop size={22} /></div></div>
    <div className="cms-tabs" role="tablist">{tabs.map(({ id, label, icon: Icon }) => <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? "is-active" : ""} onClick={() => setTab(id)}><Icon size={15} />{label}</button>)}</div>

    {tab === "settings" && <form className="cms-card" onSubmit={submitSettings}>
      <div className="cms-card-heading"><div><h3>Site kimliği ve ana sayfa</h3><p>Tarayıcı başlığı, hero yazısı ve paylaşım varsayılanları.</p></div></div>
      {settings && <div className="cms-grid">
        <Field label="Site adı"><input required maxLength={120} value={settings.siteName} onChange={(e) => setSettings({ ...settings, siteName: e.target.value })} /></Field>
        <Field label="Ana sayfa title"><input required maxLength={180} value={settings.homeTitle} onChange={(e) => setSettings({ ...settings, homeTitle: e.target.value })} /></Field>
        <Field label="Hero küçük üst metni"><input required maxLength={80} value={settings.heroEyebrow} onChange={(e) => setSettings({ ...settings, heroEyebrow: e.target.value })} /></Field>
        <Field label="Hero ana başlığı"><input required maxLength={220} value={settings.heroHeading} onChange={(e) => setSettings({ ...settings, heroHeading: e.target.value })} /></Field>
        <Field label="Ana sayfa açıklaması" wide><textarea required maxLength={3000} rows={3} value={settings.homeDescription} onChange={(e) => setSettings({ ...settings, homeDescription: e.target.value })} /></Field>
        <Field label="Hero açıklaması" wide><textarea required maxLength={3000} rows={3} value={settings.heroBody} onChange={(e) => setSettings({ ...settings, heroBody: e.target.value })} /></Field>
        <Field label="Varsayılan SEO title"><input required maxLength={180} value={settings.defaultSeoTitle} onChange={(e) => setSettings({ ...settings, defaultSeoTitle: e.target.value })} /></Field>
        <Field label="Varsayılan meta description" wide><textarea required maxLength={320} rows={2} value={settings.defaultSeoDescription} onChange={(e) => setSettings({ ...settings, defaultSeoDescription: e.target.value })} /></Field>
        <Field label="Varsayılan sosyal paylaşım görseli" wide hint="İsteğe bağlı. Site içi /uploads/... yolu veya https:// ile başlayan görsel adresi girin; boş bırakılırsa sayfaya özel görsel seçilir."><input maxLength={500} value={settings.defaultSocialImage ?? ""} onChange={(e) => setSettings({ ...settings, defaultSocialImage: e.target.value.trim() || null })} placeholder="/uploads/site/social-cover.webp" /></Field>
      </div>}
      <div className="cms-form-footer"><span className="cms-hint">SEO title ve description arama sonucunda görünebilir; arama sırası garantisi değildir.</span><button className="admin-primary-button" disabled={saving || !settings}><Save size={15} /> Kaydet</button></div>
    </form>}

    {tab === "navigation" && <div className="cms-two-column">
      <form className="cms-card" onSubmit={submitNavigation}><div className="cms-card-heading"><div><h3>{navigation.id ? "Menü öğesini düzenle" : "Yeni menü bağlantısı"}</h3><p>Yerel sayfa yolu veya güvenli http(s) adresi yazın.</p></div></div><div className="cms-grid">
        <Field label="Menü" ><select value={navigation.placement} onChange={(e) => setNavigation({ ...navigation, placement: e.target.value as NavigationDraft["placement"] })}><option value="header">Üst menü</option><option value="footer">Alt menü</option></select></Field>
        <Field label="Görünen yazı"><input required maxLength={100} value={navigation.label} onChange={(e) => setNavigation({ ...navigation, label: e.target.value })} placeholder="Örn. Lara" /></Field>
        <Field label="Bağlantı adresi" wide><input required maxLength={500} value={navigation.href} onChange={(e) => setNavigation({ ...navigation, href: e.target.value })} placeholder="/bolge/antalya/lara" /></Field>
        <Field label="Sıra"><input type="number" min={0} max={9999} value={navigation.sortOrder} onChange={(e) => setNavigation({ ...navigation, sortOrder: Number(e.target.value) })} /></Field>
      </div><IndexToggle checked={navigation.isActive} label="Menüde etkin göster" onChange={(isActive) => setNavigation({ ...navigation, isActive })} /><div className="cms-form-footer"><button type="button" className="admin-cancel-button" onClick={() => setNavigation({ ...emptyNavigation })}>Temizle</button><button className="admin-primary-button" disabled={saving}><Save size={15} /> Kaydet</button></div></form>
      <div className="cms-card"><div className="cms-card-heading"><div><h3>Mevcut menüler</h3><p>Öğeleri düzenleyin, sıralarını değiştirin veya pasifleştirin.</p></div></div>{(["header", "footer"] as const).map((placement) => <div className="cms-list-group" key={placement}><h4>{placement === "header" ? "Üst menü" : "Alt menü"}</h4>{data.navigation[placement].length ? data.navigation[placement].map((item) => <div className="cms-row" key={item.id}><span className="cms-order">{item.sortOrder}</span><div className="cms-row-main"><strong>{item.label}</strong><small>{item.href}</small></div><StatusBadge active={item.isActive} /><button className="cms-icon-button" onClick={() => startNavigationEdit(item)} aria-label="Düzenle"><Settings2 size={15} /></button><button className="cms-icon-button" onClick={() => void withSaving(() => setNavigationActive.mutateAsync({ id: item.id, isActive: !item.isActive }), item.isActive ? "Menü öğesi pasif yapıldı." : "Menü öğesi etkinleştirildi.")} aria-label="Etkinliği değiştir">{item.isActive ? <ToggleRight size={17} /> : <ToggleLeft size={17} />}</button></div>) : <p className="cms-empty-small">Menü öğesi bulunmuyor.</p>}</div>)}</div>
    </div>}

    {tab === "categories" && <div className="cms-two-column">
      <form className="cms-card" onSubmit={submitCategory}><div className="cms-card-heading"><div><h3>{category.id ? "Kategoriyi düzenle" : "Yeni kategori"}</h3><p>Kategori sayfası, listelenmiş ilanları ve kendi SEO bilgisini alır.</p></div></div><div className="cms-grid">
        <Field label="Kategori adı"><input required maxLength={120} value={category.name} onChange={(e) => setCategory({ ...category, name: e.target.value, slug: !category.id && (!category.slug || category.slug === slugify(category.name)) ? slugify(e.target.value) : category.slug })} placeholder="Örn. VIP profiller" /></Field>
        <Field label="URL slug"><input required maxLength={160} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={category.slug} onChange={(e) => setCategory({ ...category, slug: e.target.value })} placeholder="vip-profiller" /></Field>
        <Field label="Açıklama" wide><textarea rows={3} maxLength={15000} value={category.description} onChange={(e) => setCategory({ ...category, description: e.target.value })} /></Field>
        <Field label="SEO title"><input maxLength={180} value={category.seoTitle ?? ""} onChange={(e) => setCategory({ ...category, seoTitle: e.target.value || null })} /></Field>
        <Field label="Meta description"><textarea rows={2} maxLength={320} value={category.seoDescription ?? ""} onChange={(e) => setCategory({ ...category, seoDescription: e.target.value || null })} /></Field>
        <Field label="Sıra"><input type="number" min={0} max={9999} value={category.sortOrder} onChange={(e) => setCategory({ ...category, sortOrder: Number(e.target.value) })} /></Field>
      </div><IndexToggle checked={category.allowIndexing} onChange={(allowIndexing) => setCategory({ ...category, allowIndexing })} /><small className="cms-hint">Yayında ilan yokken kategori URL'si noindex kalır.</small><IndexToggle checked={category.isActive} label="Public sitede etkin göster" onChange={(isActive) => setCategory({ ...category, isActive })} /><div className="cms-form-footer"><button type="button" className="admin-cancel-button" onClick={() => setCategory({ ...emptyCategory })}>Temizle</button><button className="admin-primary-button" disabled={saving}><Save size={15} /> Kaydet</button></div></form>
      <div className="cms-card"><div className="cms-card-heading"><div><h3>Kategoriler</h3><p>Pasifleştirilen kategori verisi silinmez ve yeni ilan seçiminden kalkar.</p></div><span className="cms-count">{data.categories.length}</span></div>{data.categories.length ? data.categories.map((item) => <div className="cms-row" key={item.id}><span className="cms-order">{item.sortOrder}</span><div className="cms-row-main"><strong>{item.name}</strong><small>/{item.slug}</small></div><StatusBadge active={item.isActive} /><button className="cms-icon-button" onClick={() => startCategoryEdit(item)} aria-label="Düzenle"><Settings2 size={15} /></button><button className="cms-icon-button" onClick={() => void withSaving(() => setCategoryActive.mutateAsync({ id: item.id, isActive: !item.isActive }), item.isActive ? "Kategori pasifleştirildi." : "Kategori etkinleştirildi.")} aria-label="Etkinliği değiştir">{item.isActive ? <ToggleRight size={17} /> : <ToggleLeft size={17} />}</button></div>) : <div className="cms-empty">Henüz kategori yok. İlk kategoriyi soldaki formdan ekleyin.</div>}</div>
    </div>}

    {tab === "locations" && <div className="cms-two-column">
      <form className="cms-card" onSubmit={submitLocation}><div className="cms-card-heading"><div><h3>{location.id ? "Bölgeyi düzenle" : "Yeni şehir / semt"}</h3><p>Bir şehirdeki her semt ayrı bir SEO adresi alır.</p></div></div><div className="cms-grid">
        <Field label="Şehir"><input required maxLength={120} value={location.city} onChange={(e) => setLocation({ ...location, city: e.target.value, citySlug: !location.id && (!location.citySlug || location.citySlug === slugify(location.city)) ? slugify(e.target.value) : location.citySlug })} /></Field>
        <Field label="Şehir slug"><input required maxLength={140} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={location.citySlug} onChange={(e) => setLocation({ ...location, citySlug: e.target.value })} /></Field>
        <Field label="Semt / bölge"><input required maxLength={120} value={location.district} onChange={(e) => setLocation({ ...location, district: e.target.value, districtSlug: !location.id && (!location.districtSlug || location.districtSlug === slugify(location.district)) ? slugify(e.target.value) : location.districtSlug })} placeholder="Örn. Lara" /></Field>
        <Field label="Semt slug"><input required maxLength={140} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={location.districtSlug} onChange={(e) => setLocation({ ...location, districtSlug: e.target.value })} placeholder="lara" /></Field>
        <Field label="Bölge açıklaması" wide><textarea rows={3} maxLength={15000} value={location.description} onChange={(e) => setLocation({ ...location, description: e.target.value })} /></Field>
        <Field label="SEO title"><input maxLength={180} value={location.seoTitle ?? ""} onChange={(e) => setLocation({ ...location, seoTitle: e.target.value || null })} /></Field>
        <Field label="Meta description"><textarea rows={2} maxLength={320} value={location.seoDescription ?? ""} onChange={(e) => setLocation({ ...location, seoDescription: e.target.value || null })} /></Field>
        <Field label="Sıra"><input type="number" min={0} max={9999} value={location.sortOrder} onChange={(e) => setLocation({ ...location, sortOrder: Number(e.target.value) })} /></Field>
      </div><IndexToggle checked={location.allowIndexing} onChange={(allowIndexing) => setLocation({ ...location, allowIndexing })} /><small className="cms-hint">Bu şehir/semtte yayında ilan yokken URL noindex kalır.</small><IndexToggle checked={location.isActive} label="Public sitede etkin göster" onChange={(isActive) => setLocation({ ...location, isActive })} /><div className="cms-form-footer"><button type="button" className="admin-cancel-button" onClick={() => setLocation({ ...emptyLocation })}>Temizle</button><button className="admin-primary-button" disabled={saving}><Save size={15} /> Kaydet</button></div></form>
      <div className="cms-card"><div className="cms-card-heading"><div><h3>Şehir ve semtler</h3><p>Pasifleştirilen bölgeler URL olarak public siteden ve ilan seçimlerinden kalkar.</p></div><span className="cms-count">{data.locations.length}</span></div>{data.locations.length ? data.locations.map((item) => <div className="cms-row" key={item.id}><span className="cms-order">{item.sortOrder}</span><div className="cms-row-main"><strong>{item.city} · {item.district}</strong><small>/bolge/{item.citySlug}/{item.districtSlug}</small></div><StatusBadge active={item.isActive} /><button className="cms-icon-button" onClick={() => startLocationEdit(item)} aria-label="Düzenle"><Settings2 size={15} /></button><button className="cms-icon-button" onClick={() => void withSaving(() => setLocationActive.mutateAsync({ id: item.id, isActive: !item.isActive }), item.isActive ? "Bölge pasifleştirildi." : "Bölge etkinleştirildi.")} aria-label="Etkinliği değiştir">{item.isActive ? <ToggleRight size={17} /> : <ToggleLeft size={17} />}</button></div>) : <div className="cms-empty">Henüz şehir/semt kaydı yok.</div>}</div>
    </div>}

    {tab === "pages" && <div className="cms-two-column cms-page-editor-layout">
      <form className="cms-card" onSubmit={submitPage}><div className="cms-card-heading"><div><h3>{page.id ? "İçerik sayfasını düzenle" : "Yeni içerik sayfası"}</h3><p>Yayın ilkeleri, rehber veya başka özgün metin sayfaları oluşturun. Gövde düz metindir; HTML çalıştırılmaz.</p></div></div><div className="cms-grid">
        <Field label="Başlık"><input required maxLength={180} value={page.title} onChange={(e) => setPage({ ...page, title: e.target.value, slug: !page.id && (!page.slug || page.slug === slugify(page.title)) ? slugify(e.target.value) : page.slug })} /></Field>
        <Field label="URL slug"><input required maxLength={160} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={page.slug} onChange={(e) => setPage({ ...page, slug: e.target.value })} placeholder="yayin-ilkeleri" /></Field>
        <Field label="Kısa açıklama" wide><textarea rows={2} maxLength={320} value={page.summary} onChange={(e) => setPage({ ...page, summary: e.target.value })} /></Field>
        <Field label="SEO title"><input maxLength={180} value={page.seoTitle ?? ""} onChange={(e) => setPage({ ...page, seoTitle: e.target.value || null })} /></Field>
        <Field label="Meta description"><textarea rows={2} maxLength={320} value={page.seoDescription ?? ""} onChange={(e) => setPage({ ...page, seoDescription: e.target.value || null })} /></Field>
        <Field label="Sayfa metni" wide hint="Paragraflar için satır arası boşluk bırakın. HTML etiketleri metin olarak gösterilir."><textarea required rows={10} maxLength={15000} value={page.body} onChange={(e) => setPage({ ...page, body: e.target.value })} /></Field>
        <Field label="Durum"><select value={page.status} onChange={(e) => setPage({ ...page, status: e.target.value as PageDraft["status"] })}><option value="draft">Taslak</option><option value="published">Yayımla</option></select></Field>
      </div><IndexToggle checked={page.allowIndexing} onChange={(allowIndexing) => setPage({ ...page, allowIndexing })} /><div className="cms-form-footer"><button type="button" className="admin-cancel-button" onClick={() => setPage({ ...emptyPage })}>Temizle</button><button className="admin-primary-button" disabled={saving}><Save size={15} />{page.status === "published" ? "Kaydet ve yayımla" : "Taslak kaydet"}</button></div></form>
      <div className="cms-card"><div className="cms-card-heading"><div><h3>İçerik sayfaları</h3><p>Yayınlanmış sayfalar `/icerik/slug` adresinde görünür.</p></div><span className="cms-count">{data.pages.filter((item) => item.status !== "archived").length}</span></div>{data.pages.filter((item) => item.status !== "archived").length ? data.pages.filter((item) => item.status !== "archived").map((item) => <div className="cms-row cms-page-row" key={item.id}><div className="cms-row-main"><strong>{item.title}</strong><small>/{item.slug} · {item.status === "published" ? "Yayında" : "Taslak"}</small></div>{item.status === "published" && <a className="cms-icon-button" href={`/icerik/${item.slug}`} target="_blank" rel="noreferrer" aria-label="Sayfayı görüntüle"><ExternalLink size={14} /></a>}<button className="cms-icon-button" onClick={() => startPageEdit(item)} aria-label="Düzenle"><Settings2 size={15} /></button><button className="cms-icon-button" onClick={() => { if (window.confirm(`“${item.title}” sayfası arşivlensin mi?`)) void withSaving(() => archivePageMutation.mutateAsync({ id: item.id }), "Sayfa arşivlendi."); }} aria-label="Arşivle"><X size={15} /></button></div>) : <div className="cms-empty">Henüz içerik sayfası yok. Soldaki formdan ilk sayfayı hazırlayın.</div>}</div>
    </div>}
    <p className="cms-safety-note"><Check size={14} /> Kayıtlar MySQL'de saklanır; arşivleme ve pasifleştirme kayıtları kalıcı olarak silmez. Değişiklikler cache kullanılmadığı için site yenilendiğinde görünür.</p>
  </section>;
}
