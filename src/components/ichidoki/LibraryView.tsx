"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bell,
  Bookmark,
  Check,
  History,
  PlayCircle,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  deleteHistory,
  fetchBookmarks,
  fetchHistory,
  fetchNotifications,
  markNotificationsRead,
  removeBookmark,
} from "@/lib/api/client";
import type { Anime, HistoryItem } from "@/store/app";
import { useApp } from "@/store/app";
import { cn, splitTitle } from "@/lib/utils";
import { AnimeCard, AnimeCardSkeleton, CardGrid } from "./AnimeCard";

interface BookmarkItem {
  id: string;
  malId: number;
  title: string;
  poster?: string | null;
  type: string;
}

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  type: string;
  read: boolean;
  createdAt: string;
}

type LibTab = "history" | "bookmarks" | "notifications";

export function LibraryView() {
  const {
    history,
    bookmarks,
    setHistory,
    setBookmarks,
    toggleBookmark,
    openAnime,
    notifications,
    setNotifications,
  } = useApp();

  const [loading, setLoading] = useState(true);
  const [bookmarkList, setBookmarkList] = useState<BookmarkItem[]>([]);
  const [notifList, setNotifList] = useState<NotificationItem[]>([]);
  const [activeTab, setActiveTab] = useState<LibTab>("history");

  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [hist, bms, notifs] = await Promise.all([
          fetchHistory(),
          fetchBookmarks(),
          fetchNotifications(),
        ]);
        if (cancelled) return;
        setHistory(hist as HistoryItem[]);
        setBookmarks((bms as BookmarkItem[]).map((b) => b.malId));
        setBookmarkList(bms as BookmarkItem[]);
        setNotifList(notifs as NotificationItem[]);
        setNotifications(notifs as NotificationItem[]);
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setHistory, setBookmarks, setNotifications]);

  // Re-fetch bookmarks when bookmark IDs change externally.
  useEffect(() => {
    fetchBookmarks()
      .then((b) => setBookmarkList(b as BookmarkItem[]))
      .catch(() => {});
  }, [bookmarks]);

  // Update underline indicator when tab changes.
  useEffect(() => {
    const idx = ["history", "bookmarks", "notifications"].indexOf(activeTab);
    const el = tabRefs.current[idx];
    if (el) {
      setIndicator({ left: el.offsetLeft, width: el.offsetWidth });
    }
  }, [activeTab, loading]);

  const bookmarkAnime: Anime[] = bookmarkList.map((b) => ({
    id: b.id,
    malId: b.malId,
    title: b.title,
    synopsis: "",
    poster: b.poster ?? "",
    banner: b.poster ?? "",
    type: b.type,
    status: "",
    score: 0,
    genres: [],
    studios: [],
    episodeCount: 0,
  }));

  const handleClearHistory = async () => {
    if (!confirm("Clear all watch history? This cannot be undone.")) return;
    try {
      await deleteHistory("all");
      setHistory([]);
      toast.success("History cleared");
    } catch (e) {
      console.error(e);
      toast.error("Failed to clear history");
    }
  };

  const handleRemoveBookmark = async (malId: number) => {
    toggleBookmark(malId);
    setBookmarkList((prev) => prev.filter((b) => b.malId !== malId));
    try {
      await removeBookmark(malId);
    } catch {
      /* noop */
    }
  };

  const handleMarkAllRead = async () => {
    setNotifList((prev) => prev.map((n) => ({ ...n, read: true })));
    setNotifications(notifList.map((n) => ({ ...n, read: true })));
    try {
      await markNotificationsRead({ all: true });
    } catch {
      /* noop */
    }
  };

  const unreadCount = notifList.filter((n) => !n.read).length;

  const tabs: { key: LibTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { key: "history", label: "Continue", icon: <History className="h-4 w-4" /> },
    { key: "bookmarks", label: "Bookmarks", icon: <Bookmark className="h-4 w-4" /> },
    {
      key: "notifications",
      label: "Updates",
      icon: <Bell className="h-4 w-4" />,
      badge: unreadCount > 0 ? unreadCount : undefined,
    },
  ];

  return (
    <div className="fade-in flex flex-col gap-4 p-4 pb-6">
      {/* Header */}
      <div>
        <h1 className="flex items-center gap-2 text-lg font-bold text-white">
          <Bookmark className="h-5 w-5" />
          Library
        </h1>
        <p className="mt-0.5 text-xs text-white/40">
          Your history, bookmarks, and notifications.
        </p>
      </div>

      {/* Underline tabs */}
      <div className="relative flex border-b border-white/10">
        {tabs.map((t, i) => {
          const isActive = t.key === activeTab;
          return (
            <button
              key={t.key}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              type="button"
              onClick={() => setActiveTab(t.key)}
              className={cn(
                "relative flex flex-1 items-center justify-center gap-1.5 pb-2.5 text-sm font-medium transition-colors",
                isActive ? "text-white" : "text-white/40",
              )}
            >
              {t.icon}
              {t.label}
              {t.badge ? (
                <span className="ml-0.5 rounded-full bg-[#f5c518] px-1.5 py-0.5 text-[9px] font-bold text-black">
                  {t.badge}
                </span>
              ) : null}
            </button>
          );
        })}
        <span
          className="absolute bottom-0 h-0.5 rounded-full bg-[#f5c518] transition-all duration-200 ease-out"
          style={{ left: indicator.left, width: indicator.width }}
        />
      </div>

      {/* Tab content */}
      {activeTab === "history" && (
        <>
          {loading ? (
            <CardGrid>
              {Array.from({ length: 6 }).map((_, i) => (
                <AnimeCardSkeleton key={i} />
              ))}
            </CardGrid>
          ) : history.length === 0 ? (
            <EmptyState
              icon={<History className="h-7 w-7" />}
              title="No watch history yet"
              subtitle="Start watching an episode to see it here."
            />
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-[#111111] px-2.5 py-0.5 text-[11px] font-medium text-white/60">
                  {history.length} entr{history.length === 1 ? "y" : "ies"}
                </span>
                <button
                  type="button"
                  onClick={handleClearHistory}
                  className="flex items-center gap-1 rounded-full bg-[#111111] px-2.5 py-1 text-[11px] font-medium text-white/50 transition-colors hover:text-red-400"
                >
                  <Trash2 className="h-3 w-3" /> Clear all
                </button>
              </div>
              {history.map((h) => (
                <HistoryRowV2
                  key={`${h.malId}-${h.episode}`}
                  item={h}
                  onClick={() => openAnime(h.malId, h.episode, h.position)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === "bookmarks" && (
        <>
          {loading ? (
            <CardGrid>
              {Array.from({ length: 6 }).map((_, i) => (
                <AnimeCardSkeleton key={i} />
              ))}
            </CardGrid>
          ) : bookmarkAnime.length === 0 ? (
            <EmptyState
              icon={<Bookmark className="h-7 w-7" />}
              title="No bookmarks yet"
              subtitle="Tap the bookmark icon on an anime to save it here."
            />
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between">
                <span className="rounded-full bg-[#111111] px-2.5 py-0.5 text-[11px] font-medium text-white/60">
                  {bookmarkAnime.length} saved
                </span>
              </div>
              <CardGrid>
                {bookmarkAnime.map((a) => (
                  <div key={a.malId} className="relative">
                    <AnimeCard anime={a} />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveBookmark(a.malId);
                      }}
                      className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-full bg-black/70 text-white/80 transition-colors hover:bg-red-500/80 hover:text-white"
                      aria-label="Remove bookmark"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </CardGrid>
            </>
          )}
        </>
      )}

      {activeTab === "notifications" && (
        <>
          {loading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-20 rounded-lg skeleton-shimmer"
                />
              ))}
            </div>
          ) : notifList.length === 0 ? (
            <EmptyState
              icon={<Bell className="h-7 w-7" />}
              title="No notifications"
              subtitle="New episode alerts will appear here."
            />
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-[#111111] px-2.5 py-0.5 text-[11px] font-medium text-white/60">
                  {notifList.length} total
                </span>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="flex items-center gap-1 rounded-full bg-[#f5c518] px-2.5 py-1 text-[11px] font-medium text-black"
                  >
                    <Check className="h-3 w-3" /> Mark all read
                  </button>
                )}
              </div>
              {notifList.map((n) => (
                <NotificationRowV2 key={n.id} item={n} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function HistoryRowV2({
  item,
  onClick,
}: {
  item: HistoryItem;
  onClick: () => void;
}) {
  const { main, sub } = splitTitle(item.title);
  const progress = item.progress ?? 0;
  const pct = Math.min(100, Math.max(0, progress));
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 rounded-lg p-2 text-left transition-colors active:bg-white/5"
    >
      <div className="relative h-16 w-28 shrink-0 overflow-hidden rounded-md bg-[#111111]">
        {item.poster && (
          <img
            src={item.poster}
            alt={item.title}
            className="h-full w-full object-cover"
          />
        )}
        <div className="absolute inset-0 grid place-items-center bg-black/40">
          <PlayCircle className="h-7 w-7 text-white" />
        </div>
        {pct > 0 && (
          <div className="absolute inset-x-0 bottom-0 h-1 bg-white/10">
            <div
              className="h-full bg-[#f5c518]"
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-1 text-xs font-medium text-white">{main}</p>
        {sub && <p className="line-clamp-1 text-[10px] text-white/40">{sub}</p>}
        <p className="mt-0.5 text-[10px] text-white/40">
          Episode {item.episode} · {Math.round(pct)}% watched
        </p>
      </div>
    </button>
  );
}

function NotificationRowV2({ item }: { item: NotificationItem }) {
  return (
    <div
      className={cn(
        "flex gap-3 rounded-lg bg-[#111111] p-3",
        !item.read && "border-l-2 border-[#f5c518]",
      )}
    >
      <div
        className={cn(
          "mt-1 h-2 w-2 shrink-0 rounded-full",
          item.read ? "bg-white/20" : "bg-[#f5c518]",
        )}
      />
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-xs font-medium",
            item.read ? "text-white/60" : "text-white",
          )}
        >
          {item.title}
        </p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-white/50">
          {item.body}
        </p>
        <p className="mt-1 text-[10px] text-white/30">
          {new Date(item.createdAt).toLocaleString()}
        </p>
      </div>
      {!item.read && (
        <span className="h-fit shrink-0 rounded-full bg-[#f5c518] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-black">
          New
        </span>
      )}
    </div>
  );
}

function EmptyState({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="grid place-items-center py-16 text-center">
      <div className="mb-3 grid h-14 w-14 place-items-center rounded-full bg-[#111111] text-white/40">
        {icon}
      </div>
      <p className="text-sm font-medium text-white/70">{title}</p>
      <p className="mt-1.5 max-w-[16rem] text-xs leading-relaxed text-white/40">
        {subtitle}
      </p>
    </div>
  );
}
