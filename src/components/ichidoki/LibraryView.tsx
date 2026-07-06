"use client";

import { useEffect, useState } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

  // Re-fetch bookmarks when bookmark IDs change externally (e.g. add from detail).
  useEffect(() => {
    fetchBookmarks()
      .then((b) => setBookmarkList(b as BookmarkItem[]))
      .catch(() => {});
  }, [bookmarks]);

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

  return (
    <div className="fade-in flex flex-col gap-4 p-4 pb-6">
      {/* Section header — gradient text */}
      <div>
        <h1 className="flex items-center gap-2 text-lg font-black tracking-editorial">
          <span className="gradient-text">
            <Bookmark className="h-5 w-5" />
          </span>
          <span className="gradient-text">Library</span>
        </h1>
        <p className="mt-0.5 text-xs text-white/50">
          Your history, bookmarks, and notifications.
        </p>
      </div>

      <Tabs defaultValue="history" className="gap-3">
        <TabsList className="glass-card h-auto w-full gap-1 rounded-full p-1">
          <TabsTrigger
            value="history"
            className={cn(
              "flex-1 rounded-full px-3 py-1.5 text-xs font-bold tracking-editorial transition-all duration-300",
              "data-[state=active]:brand-gradient-bg data-[state=active]:text-black data-[state=active]:shadow-lg data-[state=active]:shadow-[#ff8a00]/20",
              "data-[state=inactive]:text-white/55 data-[state=inactive]:hover:text-white/85",
            )}
          >
            <History className="h-3 w-3" /> Continue
          </TabsTrigger>
          <TabsTrigger
            value="bookmarks"
            className={cn(
              "flex-1 rounded-full px-3 py-1.5 text-xs font-bold tracking-editorial transition-all duration-300",
              "data-[state=active]:brand-gradient-bg data-[state=active]:text-black data-[state=active]:shadow-lg data-[state=active]:shadow-[#ff8a00]/20",
              "data-[state=inactive]:text-white/55 data-[state=inactive]:hover:text-white/85",
            )}
          >
            <Bookmark className="h-3 w-3" /> Bookmarks
          </TabsTrigger>
          <TabsTrigger
            value="notifications"
            className={cn(
              "relative flex-1 rounded-full px-3 py-1.5 text-xs font-bold tracking-editorial transition-all duration-300",
              "data-[state=active]:brand-gradient-bg data-[state=active]:text-black data-[state=active]:shadow-lg data-[state=active]:shadow-[#ff8a00]/20",
              "data-[state=inactive]:text-white/55 data-[state=inactive]:hover:text-white/85",
            )}
          >
            <Bell className="h-3 w-3" /> Updates
            {unreadCount > 0 && (
              <span className="brand-gradient-bg ml-1 rounded-full px-1.5 py-0.5 text-[9px] font-black text-black">
                {unreadCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="mt-0">
          {loading ? (
            <CardGrid>
              {Array.from({ length: 6 }).map((_, i) => (
                <AnimeCardSkeleton key={i} />
              ))}
            </CardGrid>
          ) : history.length === 0 ? (
            <EmptyState
              icon={<History className="h-7 w-7 text-[#f5c518]" />}
              title="No watch history yet"
              subtitle="Start watching an episode to see it here."
            />
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="glass-card rounded-full px-2.5 py-0.5 text-[11px] font-bold text-white/70">
                  {history.length} entr{history.length === 1 ? "y" : "ies"}
                </span>
                <button
                  type="button"
                  onClick={handleClearHistory}
                  className="btn-press glass-card flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold text-white/60 transition-all duration-300 hover:text-red-400"
                >
                  <Trash2 className="h-3 w-3" /> Clear all
                </button>
              </div>
              {history.map((h, i) => (
                <HistoryRowV2
                  key={`${h.malId}-${h.episode}`}
                  item={h}
                  index={i}
                  onClick={() => openAnime(h.malId, h.episode, h.position)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="bookmarks" className="mt-0">
          {loading ? (
            <CardGrid>
              {Array.from({ length: 6 }).map((_, i) => (
                <AnimeCardSkeleton key={i} />
              ))}
            </CardGrid>
          ) : bookmarkAnime.length === 0 ? (
            <EmptyState
              icon={<Bookmark className="h-7 w-7 text-[#f5c518]" />}
              title="No bookmarks yet"
              subtitle="Tap the bookmark icon on an anime to save it here."
            />
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between">
                <span className="glass-card rounded-full px-2.5 py-0.5 text-[11px] font-bold text-white/70">
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
                      className="glass-card btn-press absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-full text-white/80 transition-all duration-300 hover:bg-red-500/80 hover:text-white"
                      aria-label="Remove bookmark"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </CardGrid>
            </>
          )}
        </TabsContent>

        <TabsContent value="notifications" className="mt-0">
          {loading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-20 rounded-xl skeleton-shimmer"
                />
              ))}
            </div>
          ) : notifList.length === 0 ? (
            <EmptyState
              icon={<Bell className="h-7 w-7 text-[#f5c518]" />}
              title="No notifications"
              subtitle="New episode alerts will appear here."
            />
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="glass-card rounded-full px-2.5 py-0.5 text-[11px] font-bold text-white/70">
                  {notifList.length} total
                </span>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="btn-press brand-gradient-bg glow flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold text-black transition-all duration-300"
                  >
                    <Check className="h-3 w-3" /> Mark all read
                  </button>
                )}
              </div>
              {notifList.map((n, i) => (
                <NotificationRowV2 key={n.id} item={n} index={i} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function HistoryRowV2({
  item,
  index,
  onClick,
}: {
  item: HistoryItem;
  index: number;
  onClick: () => void;
}) {
  const { main, sub } = splitTitle(item.title);
  const progress = item.progress ?? 0;
  const pct = Math.min(100, Math.max(0, progress));
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "fade-in-stagger glass-card card-hover flex items-center gap-3 rounded-xl p-2 text-left",
      )}
      style={{ ["--i"]: index } as React.CSSProperties}
    >
      <div className="relative h-16 w-28 shrink-0 overflow-hidden rounded-lg bg-[#1a1a22]">
        {item.poster && (
          <img
            src={item.poster}
            alt={item.title}
            className="h-full w-full object-cover"
          />
        )}
        <div className="absolute inset-0 grid place-items-center bg-black/35">
          <PlayCircle className="h-7 w-7 text-white drop-shadow-lg" />
        </div>
        {/* Gradient progress bar overlay */}
        {pct > 0 && (
          <div className="absolute inset-x-0 bottom-0 h-1 bg-white/10">
            <div
              className="brand-gradient-bg h-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-bold tracking-editorial text-white">
          {main}
        </p>
        {sub && <p className="truncate text-[10px] text-white/45">{sub}</p>}
        <p className="mt-0.5 text-[10px] font-medium text-white/45">
          Episode {item.episode} · {Math.round(pct)}% watched
        </p>
        {/* Gradient progress bar inline */}
        <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="brand-gradient-bg h-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </button>
  );
}

function NotificationRowV2({
  item,
  index,
}: {
  item: NotificationItem;
  index: number;
}) {
  return (
    <div
      className={cn(
        "fade-in-stagger glass-card flex gap-3 rounded-xl p-3 transition-all duration-300",
        !item.read && "glow",
      )}
      style={{ ["--i"]: index } as React.CSSProperties}
    >
      {/* Unread gradient dot */}
      <div
        className={cn(
          "mt-1 h-2 w-2 shrink-0 rounded-full",
          item.read ? "bg-white/20" : "brand-gradient-bg pulse-glow",
        )}
      />
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-xs font-bold tracking-editorial",
            item.read ? "text-white/70" : "text-white",
          )}
        >
          {item.title}
        </p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-white/60">
          {item.body}
        </p>
        <p className="mt-1 text-[10px] font-medium text-white/35">
          {new Date(item.createdAt).toLocaleString()}
        </p>
      </div>
      {!item.read && (
        <span className="brand-gradient-bg h-fit shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-black">
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
    <div className="glass-card grid place-items-center rounded-2xl py-16 text-center">
      <div className="float-y mb-3 grid h-14 w-14 place-items-center rounded-2xl brand-gradient-soft pulse-glow">
        {icon}
      </div>
      <p className="gradient-text text-sm font-black tracking-editorial">
        {title}
      </p>
      <p className="mt-1.5 max-w-[16rem] text-xs leading-relaxed text-white/45">
        {subtitle}
      </p>
    </div>
  );
}
