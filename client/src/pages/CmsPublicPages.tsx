import { Link, useRoute } from "wouter";
import { ArrowLeft, ArrowRight, MapPin, Search, ShieldCheck } from "lucide-react";
import ProfileCard from "@/components/site/ProfileCard";
import { SiteFooter, SiteHeader } from "@/components/site/SiteShell";
import { trpc } from "@/lib/trpc";
import { usePageMeta } from "@/hooks/usePageMeta";

function PublicPageFrame({ children }: { children: React.ReactNode }) {
  return <div className="site-page"><SiteHeader /><main className="cms-public-main page-container"><Link className="cms-public-back" href="/"><ArrowLeft size={15} /> Ana sayfa</Link>{children}</main><SiteFooter /></div>;
}

function PageLoading() {
  return <div className="cms-public-state"><span className="admin-spinner" /> Sayfa yükleniyor…</div>;
}

function PageError({ title = "Sayfa bulunamadı", detail = "Bu içerik yayında değil veya adresi değişmiş olabilir." }: { title?: string; detail?: string }) {
  return <div className="cms-public-state cms-public-error"><ShieldCheck size={26} /><h1>{title}</h1><p>{detail}</p><Link className="button button-gold" href="/">Yayındaki ilanlara dön <ArrowRight size={15} /></Link></div>;
}

function Collection({ title, description, items }: { title: string; description: string; items: Parameters<typeof ProfileCard>[0]["profile"][] }) {
  return <section className="cms-public-section"><span className="section-kicker"><span className="eyebrow-line" /> VIP İLAN · KEŞFET</span><h1>{title}</h1><p className="section-intro">{description}</p>{items.length ? <div className="profiles-grid">{items.map((profile) => <ProfileCard key={profile.slug} profile={profile} />)}</div> : <div className="empty-results"><Search size={23} /><strong>Bu sayfada henüz yayında ilan yok.</strong><span>Yeni yayınlar eklendiğinde burada görüntülenir.</span></div>}</section>;
}

export function CategoryPage() {
  const [, params] = useRoute("/kategori/:slug");
  const slug = params?.slug ?? "";
  const layout = trpc.site.publicLayout.useQuery();
  const query = trpc.site.publicCategoryPage.useQuery({ slug }, { enabled: Boolean(slug) });
  const category = query.data?.category;
  const siteName = layout.data?.settings.siteName ?? "VIP İlan";
  usePageMeta({ title: category?.seoTitle || `${category?.name ?? "Kategori"} ilanları | ${siteName}`, description: category?.seoDescription || category?.description || layout.data?.settings.defaultSeoDescription || "Yayındaki ilanları keşfedin.", path: `/kategori/${slug}`, siteName, image: layout.data?.settings.defaultSocialImage, noIndex: !category?.allowIndexing || (query.data?.listings.length ?? 0) === 0 });
  if (query.isLoading) return <PublicPageFrame><PageLoading /></PublicPageFrame>;
  if (query.isError || !category) return <PublicPageFrame><PageError /></PublicPageFrame>;
  return <PublicPageFrame><Collection title={`${category.name} ilanları`} description={category.description || `Yayınlanmış ${category.name.toLocaleLowerCase("tr-TR")} ilanlarını keşfedin.`} items={query.data?.listings ?? []} /></PublicPageFrame>;
}

export function LocationPage() {
  const [, districtParams] = useRoute("/bolge/:citySlug/:districtSlug");
  const [, cityParams] = useRoute("/bolge/:citySlug");
  const citySlug = districtParams?.citySlug ?? cityParams?.citySlug ?? "";
  const districtSlug = districtParams?.districtSlug;
  const layout = trpc.site.publicLayout.useQuery();
  const query = trpc.site.publicLocationPage.useQuery({ citySlug, districtSlug }, { enabled: Boolean(citySlug) });
  const data = query.data;
  const siteName = layout.data?.settings.siteName ?? "VIP İlan";
  const label = data?.district ? `${data.district}, ${data.city}` : data?.city ?? "Bölge";
  const path = data?.district ? `/bolge/${data.citySlug}/${data.districtSlug}` : `/bolge/${data?.citySlug ?? citySlug}`;
  usePageMeta({ title: data?.seoTitle || `${label} ilanları | ${siteName}`, description: data?.seoDescription || data?.description || `Yayındaki ${label} ilanlarını keşfedin.`, path, siteName, image: layout.data?.settings.defaultSocialImage, noIndex: !data?.allowIndexing });
  if (query.isLoading) return <PublicPageFrame><PageLoading /></PublicPageFrame>;
  if (query.isError || !data) return <PublicPageFrame><PageError title="Bölge bulunamadı" /></PublicPageFrame>;
  return <PublicPageFrame><Collection title={`${label} ilanları`} description={data.description || `${label} bölgesindeki yayımlanmış profilleri keşfedin.`} items={data.listings} />{!data.district && <section className="cms-public-subregions"><h2>{data.city} semtleri</h2>{data.locations.map((location) => <Link key={location.id} href={`/bolge/${location.citySlug}/${location.districtSlug}`}><MapPin size={15} /> {location.district} <ArrowRight size={14} /></Link>)}</section>}</PublicPageFrame>;
}

export function ContentPage() {
  const [, params] = useRoute("/icerik/:slug");
  const slug = params?.slug ?? "";
  const layout = trpc.site.publicLayout.useQuery();
  const query = trpc.site.publicContentPage.useQuery({ slug }, { enabled: Boolean(slug) });
  const page = query.data;
  const siteName = layout.data?.settings.siteName ?? "VIP İlan";
  usePageMeta({ title: page?.seoTitle || `${page?.title ?? "İçerik"} | ${siteName}`, description: page?.seoDescription || page?.summary || layout.data?.settings.defaultSeoDescription || "VIP İlan hakkında bilgi.", path: `/icerik/${slug}`, siteName, image: layout.data?.settings.defaultSocialImage, noIndex: !page?.allowIndexing || Boolean(page && !page.summary.trim() && !page.body.trim()), type: "article" });
  if (query.isLoading) return <PublicPageFrame><PageLoading /></PublicPageFrame>;
  if (query.isError || !page) return <PublicPageFrame><PageError /></PublicPageFrame>;
  const paragraphs = page.body.split(/\r?\n\s*\r?\n/).map((paragraph) => paragraph.trim()).filter(Boolean);
  return <PublicPageFrame><article className="cms-public-article"><span className="section-kicker"><span className="eyebrow-line" /> {siteName}</span><h1>{page.title}</h1>{page.summary && <p className="cms-public-summary">{page.summary}</p>}{paragraphs.map((paragraph, index) => <p key={index}>{paragraph.split(/\r?\n/).map((line, lineIndex) => <span key={lineIndex}>{line}{lineIndex < paragraph.split(/\r?\n/).length - 1 && <br />}</span>)}</p>)}</article></PublicPageFrame>;
}
