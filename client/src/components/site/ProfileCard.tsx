import { BadgeCheck, Heart, MapPin, Sparkles } from "lucide-react";
import { Link } from "wouter";
import type { Profile } from "@/data/profiles";

type Props = { profile: Profile; saved?: boolean; onToggleSave?: (slug: string) => void };
export default function ProfileCard({ profile, saved = false, onToggleSave }: Props) {
  return <article className="profile-card"><div className="profile-card-image-wrap">
    <Link href={`/profil/${profile.slug}`} className="profile-card-image-link" aria-label={`${profile.name} profilini aç`}>
      {profile.image ? <img className="profile-card-image" src={profile.image} alt={`${profile.name} profil görseli`} loading="lazy" /> : <span className="profile-image-placeholder" aria-hidden="true" />}
    </Link><div className="card-image-shade" />
    <span className={`listing-label ${profile.premium ? "label-premium" : "label-new"}`}>{profile.premium ? <><Sparkles size={12} /> ÖNE ÇIKAN</> : "YENİ"}</span>
    <button type="button" className={`save-profile ${saved ? "is-saved" : ""}`} aria-label={saved ? `${profile.name} kaydını kaldır` : `${profile.name} profilini kaydet`} aria-pressed={saved} onClick={() => onToggleSave?.(profile.slug)}><Heart size={17} fill={saved ? "currentColor" : "none"} /></button>
    <div className="card-image-caption"><span><MapPin size={13} /> {profile.location}</span><span className="activity-dot"><i /> {profile.activity}</span></div>
  </div><div className="profile-card-content"><div className="card-title-row"><Link href={`/profil/${profile.slug}`} className="card-name">{profile.name}<span>, {profile.age}</span></Link>{profile.verified && <span className="verified-mini" title="Yönetici tarafından onaylandı"><BadgeCheck size={17} fill="currentColor" /></span>}</div><p className="card-summary">{profile.summary}</p><div className="card-tags">{profile.tags.slice(0, 2).map((tag) => <span key={tag}>{tag}</span>)}</div><div className="card-bottom-row"><span className="card-likes"><Heart size={14} /> {profile.likes}</span><Link href={`/profil/${profile.slug}`} className="card-view-link">Profili gör <span>↗</span></Link></div></div></article>;
}
