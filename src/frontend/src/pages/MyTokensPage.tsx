import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import { Clock, Loader2, Ticket, Users, XCircle } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";
import type { ServiceLocation, Token } from "../backend";
import { ApproachingBanner } from "../components/ApproachingBanner";
import {
  useCancelToken,
  useLocations,
  useUserTokens,
} from "../hooks/useQueries";
import {
  calcETA,
  calcPeopleAhead,
  formatWait,
  getCategoryEmoji,
  isApproaching,
} from "../lib/queueUtils";

interface MyTokensPageProps {
  onSelectService: (serviceId: bigint) => void;
}

export function MyTokensPage({ onSelectService }: MyTokensPageProps) {
  const { data: userTokens, isLoading } = useUserTokens();
  const { data: locations } = useLocations();
  const cancelToken = useCancelToken();
  const queryClient = useQueryClient();

  useEffect(() => {
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ["userTokens"] });
      queryClient.invalidateQueries({ queryKey: ["locations"] });
    }, 5000);
    return () => clearInterval(interval);
  }, [queryClient]);

  const activeTokens = (userTokens ?? []).filter((t) => t.status === "waiting");
  const locationMap = new Map<string, ServiceLocation>(
    (locations ?? []).map((l) => [l.id.toString(), l]),
  );

  async function handleCancel(tokenId: bigint) {
    try {
      await cancelToken.mutateAsync(tokenId);
      toast.success("Token cancelled.");
    } catch {
      toast.error("Failed to cancel token.");
    }
  }

  const approachingTokens = activeTokens.filter((t) => {
    const loc = locationMap.get(t.serviceId.toString());
    if (!loc) return false;
    return isApproaching(t, loc.currentServingToken);
  });

  return (
    <div data-ocid="tokens.page" className="px-4 py-4 space-y-4">
      <div>
        <h2 className="text-base font-bold text-foreground">
          My Active Tokens
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          {activeTokens.length} active token
          {activeTokens.length !== 1 ? "s" : ""}
        </p>
      </div>

      {approachingTokens.length > 0 && (
        <div data-ocid="tokens.approaching.toast" className="space-y-2">
          {approachingTokens.map((t) => {
            const loc = locationMap.get(t.serviceId.toString());
            if (!loc) return null;
            const ahead = calcPeopleAhead(t, loc.currentServingToken);
            return (
              <ApproachingBanner
                key={t.id.toString()}
                serviceName={loc.name}
                tokenNumber={Number(t.tokenNumber)}
                peopleAhead={ahead}
              />
            );
          })}
        </div>
      )}

      {isLoading ? (
        <div data-ocid="tokens.loading_state" className="space-y-3">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      ) : activeTokens.length === 0 ? (
        <div data-ocid="tokens.empty_state" className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
            <Ticket size={28} className="text-primary" />
          </div>
          <p className="font-semibold text-sm text-foreground">
            No active tokens
          </p>
          <p className="text-xs text-muted-foreground mt-1.5 max-w-[200px] mx-auto">
            Visit a service location and tap "Get Token" to join a queue
          </p>
        </div>
      ) : (
        <div data-ocid="tokens.list" className="space-y-3">
          {activeTokens.map((token, idx) => (
            <TokenCard
              key={token.id.toString()}
              token={token}
              index={idx + 1}
              location={locationMap.get(token.serviceId.toString()) ?? null}
              onCancel={() => handleCancel(token.id)}
              onViewService={() => onSelectService(token.serviceId)}
              isCancelling={cancelToken.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TokenCard({
  token,
  index,
  location,
  onCancel,
  onViewService,
  isCancelling,
}: {
  token: Token;
  index: number;
  location: ServiceLocation | null;
  onCancel: () => void;
  onViewService: () => void;
  isCancelling: boolean;
}) {
  const currentServing = location?.currentServingToken ?? 0n;
  const avgMin = Number(location?.avgServiceTimeMinutes ?? 10n);
  const peopleAhead = calcPeopleAhead(token, currentServing);
  const eta = calcETA(peopleAhead, avgMin);
  const approaching = isApproaching(token, currentServing);
  const emoji = getCategoryEmoji(location?.category ?? "");

  return (
    <div
      data-ocid={`tokens.item.${index}`}
      className={`bg-white rounded-xl overflow-hidden shadow-card border transition-all ${
        approaching ? "border-amber-300 shadow-amber-100" : "border-border"
      }`}
    >
      {approaching && (
        <div className="bg-amber-500 px-4 py-1.5 flex items-center gap-2">
          <span className="text-white text-[10px] font-bold uppercase tracking-wider animate-pulse-amber">
            🔔 Your turn is approaching!
          </span>
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <button
            type="button"
            onClick={onViewService}
            className="flex items-center gap-2.5 flex-1 min-w-0 text-left"
          >
            <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center text-lg flex-shrink-0">
              {emoji}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm text-foreground truncate">
                {location?.name ?? "Unknown Service"}
              </p>
              <p className="text-[10px] text-muted-foreground truncate">
                {location?.address}
              </p>
            </div>
          </button>

          <div className="text-right flex-shrink-0">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Token
            </p>
            <p className="text-2xl font-black text-primary leading-tight">
              #{Number(token.tokenNumber)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border">
          <div className="flex items-center gap-1.5 text-foreground">
            <Users size={12} className="text-blue-600" />
            <span className="text-xs font-medium">
              {peopleAhead} {peopleAhead === 1 ? "person" : "people"} ahead
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock size={12} className="text-teal-600" />
            <span className="text-xs font-medium text-foreground">
              {formatWait(eta)}
            </span>
          </div>
          <div className="ml-auto">
            <Button
              data-ocid={`tokens.cancel.delete_button.${index}`}
              variant="ghost"
              size="sm"
              onClick={onCancel}
              disabled={isCancelling}
              className="h-7 px-2.5 text-destructive hover:bg-destructive/5 text-xs"
            >
              {isCancelling ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <XCircle size={12} className="mr-1" />
              )}
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
