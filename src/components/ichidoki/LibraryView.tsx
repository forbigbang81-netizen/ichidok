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
      toast.error("Failed to clear history");
    }
  };

  const handleRemoveBookmark = async (malId: number) => {
    toggleBookmark(malId);
    setBookmarkList((prev) => prev.filter((b) => b.malId !== malId));
    try {
      await removeBookmark(malId);
    } catch {}
  };

  const handleMarkAllRead = async () => {
    setNotifList((prev) => prev.map((n) => ({ ...n, read: true })));
    setNotifications(notifList.map((n) => ({ ...n, read: true })));
    try {
      await markNotificationsRead({ all: true });
    } catch {}
  };

  return (
    <div className="flex flex-col gap-4 p-4 pb-6 fade-in">
      <div>
        <h1 className="text-lg font-bold text-white">Library</h1>
        <p className="text-xs text-white/50">
          Your history, bookmarks, and notifications.
        </p>
      </div>

      <Tabs defaultValue="history">
        <TabsList className="bg-white/5">
          <TabsTrigger
            value="history"
            className="data-[state=active]:bg-yellow-400 data-[state=active]:text-black"
          >
            <History className="h-3 w-3" /> Continue
          </TabsTrigger>
          <TabsTrigger
            value="bookmarks"
            className="data-[state=active]:bg-yellow-400 data-[state=active]:text-black"
          >
            <Bookmark className="h-3 w-3" /> Bookmarks
          </TabsTrigger>
          <TabsTrigger
            value="notifications"
            className="data-[state=active]:bg-yellow-400 data-[state=active]:text-black"
          >
            <Bell className="h-3 w-3" /> Updates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="mt-3">
          {loading ? (
            <CardGrid>
              {Array.from({ length: 6 }).map((_, i) => (
                <AnimeCardSkeleton key={i} />
              ))}
            </CardGrid>
          ) : history.length === 0 ? (
            <EmptyState
              icon={<History className="h-10 w-10 opacity-30" />}
              title="No watch history yet"
              subtitle="Start watching an episode to see it here."
            />
          ) : (
            <>
              <div className="mb-3 flex justify-end">
                <button
                  type="button"
                  onClick={handleClearHistory}
                  className="flex items-center gap-1 text-[11px] font-medium text-white/50 hover:text-red-400"
                >
                  <Trash2 className="h-3 w-3" /> Clear all
                </button>
              </div>
              <div className="flex flex-col gap-2">
                {history.map((h) => (
                  <HistoryRow
                    key={`${h.malId}-${h.episode}`}
                    item={h}
                    onClick={() => openAnime(h.malId, h.episode, h.position)}
                  />
                ))}
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="bookmarks" className="mt-3">
          {loading ? (
            <CardGrid>
              {Array.from({ length: 6 }).map((_, i) => (
                <AnimeCardSkeleton key={i} />
              ))}
            </CardGrid>
          ) : bookmarkAnime.length === 0 ? (
            <EmptyState
              icon={<Bookmark className="h-10 w-10 opacity-30" />}
              title="No bookmarks yet"
              subtitle="Tap the bookmark icon on an anime to save it here."
            />
          ) : (
            <>
              <div className="mb-3 flex justify-end">
                <span className="text-[11px] text-white/50">
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
                      className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/70 text-white/80 hover:bg-red-500/80 hover:text-white"
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

        <TabsContent value="notifications" className="mt-3">
          {loading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 rounded-lg shimmer" />
              ))}
            </div>
          ) : notifList.length === 0 ? (
            <EmptyState
              icon={<Bell className="h-10 w-10 opacity-30" />}
              title="No notifications"
              subtitle="New episode alerts will appear here."
            />
          ) : (
            <>
              <div className="mb-3 flex justify-end">
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-1 text-[11px] font-medium text-white/60 hover:text-yellow-400"
                >
                  <Check className="h-3 w-3" /> Mark all read
                </button>
              </div>
              <div className="flex flex-col gap-2">
                {notifList.map((n) => (
                  <NotificationRow key={n.id} item={n} />
                ))}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function HistoryRow({
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
      className="flex items-center gap-3 rounded-lg bg-white/[0.04] p-2 text-left transition hover:bg-white/[0.08]"
    >
      <div className="relative h-16 w-28 shrink-0 overflow-hidden rounded-md bg-[#1a1a22]">
        {item.poster && (
          <img
            src={item.poster}
            alt={item.title}
            className="h-full w-full object-cover"
          />
        )}
        <div className="absolute inset-0 grid place-items-center bg-black/30">
          <PlayCircle className="h-7 w-7 text-white drop-shadow" />
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-white">{main}</p>
        {sub && <p className="truncate text-[10px] text-white/50">{sub}</p>}
        <p className="mt-0.5 text-[10px] text-white/40">
          Episode {item.episode} · {Math.round(pct)}% watched
        </p>
        <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full bg-yellow-400"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </button>
  );
}

function NotificationRow({ item }: { item: NotificationItem }) {
  return (
    <div
      className={cn(
        "flex gap-3 rounded-lg border p-3",
        item.read
          ? "border-white/5 bg-white/[0.02]"
          : "border-yellow-400/30 bg-yellow-400/[0.05]",
      )}
    >
      <div
        className={cn(
          "mt-1 h-2 w-2 shrink-0 rounded-full",
          item.read ? "bg-white/20" : "bg-yellow-400",
        )}
      />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-white">{item.title}</p>
        <p className="mt-0.5 text-[11px] text-white/60">{item.body}</p>
        <p className="mt-1 text-[10px] text-white/30">
          {new Date(item.createdAt).toLocaleString()}
        </p>
      </div>
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
    <div className="grid place-items-center py-12 text-center text-white/40">
      <div className="mb-2">{icon}</div>
      <p className="text-sm font-medium text-white/70">{title}</p>
      <p className="mt-1 text-xs text-white/40">{subtitle}</p>
    </div>
  );
}
