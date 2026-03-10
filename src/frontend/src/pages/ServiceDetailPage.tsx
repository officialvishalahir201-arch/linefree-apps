import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Clock,
  Loader2,
  LogIn,
  Ticket,
  Users,
  XCircle,
} from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";
import type { Page } from "../App";
import { ApproachingBanner } from "../components/ApproachingBanner";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useBookToken,
  useCancelToken,
  useLocation,
  useQueueStatus,
  useUserTokens,
} from "../hooks/useQueries";
import {
  calcETA,
  calcPeopleAhead,
  formatWait,
  getCategoryEmoji,
  isApproaching,
} from "../lib/queueUtils";

interface ServiceDetailPageProps {
  serviceId: bigint;
  onBack: () => void;
  navigate: (p: Page) => void;
}

export function ServiceDetailPage({
  serviceId,
  onBack,
}: ServiceDetailPageProps) {
  const { data: location, isLoading: locLoading } = useLocation(serviceId);
  const { data: queueStatus, isLoading: queueLoading } =
    useQueueStatus(serviceId);
  const { data: userTokens } = useUserTokens();
  const bookToken = useBookToken();
  const cancelToken = useCancelToken();
  const queryClient = useQueryClient();
  const { identity, login } = useInternetIdentity();
  const isLoggedIn = !!identity;

  useEffect(() => {
    const interval = setInterval(() => {
      queryClient.invalidateQueries({
        queryKey: ["queueStatus", serviceId.toString()],
      });
      queryClient.invalidateQueries({ queryKey: ["userTokens"] });
      queryClient.invalidateQueries({
        queryKey: ["location", serviceId.toString()],
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [serviceId, queryClient]);

  const activeToken = (userTokens ?? []).find(
    (t) => t.serviceId === serviceId && t.status === "waiting",
  );

  const currentServing = queueStatus?.currentServingToken ?? 0n;
  const waitingCount = Number(queueStatus?.waitingCount ?? 0n);
  const avgMin = Number(location?.avgServiceTimeMinutes ?? 10n);

  const userAhead = activeToken
    ? calcPeopleAhead(activeToken, currentServing)
    : 0;
  const userETA = calcETA(userAhead, avgMin);
  const approaching = activeToken
    ? isApproaching(activeToken, currentServing)
    : false;

  async function handleBookToken() {
    try {
      const token = await bookToken.mutateAsync(serviceId);
      toast.success(`Token #${token.tokenNumber} booked! You're in the queue.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (
        msg.toLowerCase().includes("log in") ||
        msg.toLowerCase().includes("anonymous")
      ) {
        toast.error("Please log in first to book a token.");
      } else {
        toast.error("Failed to book token. Please try again.");
      }
    }
  }

  async function handleCancelToken() {
    if (!activeToken) return;
    try {
      await cancelToken.mutateAsync(activeToken.id);
      toast.success("Token cancelled successfully.");
    } catch {
      toast.error("Failed to cancel token. Please try again.");
    }
  }

  if (locLoading || queueLoading) {
    return (
      <div className="px-4 py-4 space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
    );
  }

  if (!location) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="text-muted-foreground">Location not found.</p>
        <Button variant="ghost" onClick={onBack} className="mt-4">
          Go Back
        </Button>
      </div>
    );
  }

  const emoji = getCategoryEmoji(location.category);

  return (
    <div data-ocid="service.page" className="px-4 py-4 space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors -ml-1"
      >
        <ArrowLeft size={16} />
        <span>All Locations</span>
      </button>

      <div className="bg-white rounded-xl p-4 shadow-card border border-border">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center text-2xl flex-shrink-0">
            {emoji}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-bold text-base text-foreground leading-tight">
                {location.name}
              </h2>
              <Badge variant="secondary" className="text-[10px] flex-shrink-0">
                {location.category}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {location.address}
            </p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {location.description}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-card border border-border">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Live Queue
        </h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">
              #{Number(currentServing)}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              Serving Now
            </div>
          </div>
          <div className="text-center border-x border-border">
            <div className="flex items-center justify-center gap-1">
              <Users size={14} className="text-blue-600" />
              <span className="text-2xl font-bold text-foreground">
                {waitingCount}
              </span>
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              In Queue
            </div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <Clock size={14} className="text-teal-600" />
              <span className="text-lg font-bold text-foreground">
                {avgMin}m
              </span>
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              Avg Wait
            </div>
          </div>
        </div>
      </div>

      {approaching && activeToken && (
        <ApproachingBanner
          dataOcid="service.approaching.toast"
          serviceName={location.name}
          tokenNumber={Number(activeToken.tokenNumber)}
          peopleAhead={userAhead}
        />
      )}

      {activeToken ? (
        <div className="relative">
          <div className="bg-primary rounded-xl overflow-hidden shadow-ticket">
            <div className="px-5 pt-5 pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-primary-foreground/70 text-[10px] font-medium uppercase tracking-widest">
                    Your Token
                  </p>
                  <p className="text-primary-foreground text-5xl font-black tracking-tight leading-none mt-1">
                    #{Number(activeToken.tokenNumber)}
                  </p>
                </div>
                <div className="bg-white/15 rounded-lg p-2.5">
                  <Ticket size={24} className="text-primary-foreground" />
                </div>
              </div>
            </div>
            <div className="ticket-edge mx-4 border-t border-dashed border-white/30 my-0" />
            <div className="px-5 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-primary-foreground/70 text-[10px] uppercase tracking-wider">
                    Ahead of you
                  </p>
                  <p className="text-primary-foreground text-xl font-bold mt-0.5">
                    {userAhead} {userAhead === 1 ? "person" : "people"}
                  </p>
                </div>
                <div>
                  <p className="text-primary-foreground/70 text-[10px] uppercase tracking-wider">
                    Est. Wait
                  </p>
                  <p className="text-primary-foreground text-xl font-bold mt-0.5">
                    {formatWait(userETA)}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-3">
            <Button
              data-ocid="service.cancel_token.delete_button"
              variant="outline"
              size="sm"
              onClick={handleCancelToken}
              disabled={cancelToken.isPending}
              className="w-full text-destructive border-destructive/20 hover:bg-destructive/5 hover:border-destructive/40"
            >
              {cancelToken.isPending ? (
                <Loader2 size={14} className="mr-2 animate-spin" />
              ) : (
                <XCircle size={14} className="mr-2" />
              )}
              Cancel Token
            </Button>
          </div>
        </div>
      ) : isLoggedIn ? (
        <Button
          data-ocid="service.get_token.primary_button"
          onClick={handleBookToken}
          disabled={bookToken.isPending}
          className="w-full h-12 text-base font-semibold shadow-ticket"
        >
          {bookToken.isPending ? (
            <Loader2 size={18} className="mr-2 animate-spin" />
          ) : (
            <Ticket size={18} className="mr-2" />
          )}
          {bookToken.isPending ? "Booking..." : "Get Token"}
        </Button>
      ) : (
        <div className="space-y-2">
          <Button
            data-ocid="service.login_to_book.primary_button"
            onClick={login}
            className="w-full h-12 text-base font-semibold"
            variant="outline"
          >
            <LogIn size={18} className="mr-2" />
            Log in to Get Token
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Login with Internet Identity to join the queue
          </p>
        </div>
      )}
    </div>
  );
}
