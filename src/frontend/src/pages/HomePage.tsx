import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Clock, Search, Users } from "lucide-react";
import { useEffect, useState } from "react";
import type { ServiceLocation } from "../backend";
import { useLocations } from "../hooks/useQueries";
import { getCategoryEmoji } from "../lib/queueUtils";

const CATEGORIES = ["All", "Hospital", "Salon", "Shop", "Clinic", "Bank"];

interface HomePageProps {
  onSelectService: (serviceId: bigint) => void;
}

export function HomePage({ onSelectService }: HomePageProps) {
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");
  const { data: locations, isLoading } = useLocations();
  const queryClient = useQueryClient();

  useEffect(() => {
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
    }, 5000);
    return () => clearInterval(interval);
  }, [queryClient]);

  const filtered = (locations ?? []).filter((loc) => {
    const matchCat =
      activeCategory === "All" || loc.category === activeCategory;
    const matchSearch =
      search === "" ||
      loc.name.toLowerCase().includes(search.toLowerCase()) ||
      loc.address.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch && loc.isActive;
  });

  return (
    <div data-ocid="home.page" className="px-4 py-4 space-y-4">
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          data-ocid="home.search_input"
          placeholder="Search locations..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-white border-border text-sm h-10"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1">
        {CATEGORIES.map((cat) => (
          <button
            type="button"
            key={cat}
            data-ocid="home.category_filter.tab"
            onClick={() => setActiveCategory(cat)}
            className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all ${
              activeCategory === cat
                ? "bg-primary text-primary-foreground border-primary shadow-xs"
                : "bg-white text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {isLoading
            ? "Loading..."
            : `${filtered.length} location${filtered.length !== 1 ? "s" : ""} nearby`}
        </p>
      </div>

      {isLoading ? (
        <div data-ocid="home.loading_state" className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((loc, idx) => (
            <LocationCard
              key={loc.id.toString()}
              location={loc}
              index={idx + 1}
              onSelect={() => onSelectService(loc.id)}
            />
          ))}
          {filtered.length === 0 && (
            <div
              data-ocid="home.empty_state"
              className="text-center py-16 text-muted-foreground"
            >
              <p className="text-4xl mb-3">📍</p>
              <p className="font-medium text-sm">
                {(locations ?? []).length === 0
                  ? "No locations yet"
                  : "No locations found"}
              </p>
              <p className="text-xs mt-1">
                {(locations ?? []).length === 0
                  ? "An admin can add service locations from the Admin panel"
                  : "Try a different category or search term"}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LocationCard({
  location,
  index,
  onSelect,
}: {
  location: ServiceLocation;
  index: number;
  onSelect: () => void;
}) {
  const emoji = getCategoryEmoji(location.category);
  const queueCount = Math.max(
    0,
    Number(location.nextTokenCounter) -
      Number(location.currentServingToken) -
      1,
  );
  const avgMin = Number(location.avgServiceTimeMinutes);
  const etaMin = queueCount * avgMin;

  return (
    <button
      type="button"
      data-ocid={`home.location.item.${index}`}
      onClick={onSelect}
      className="w-full text-left bg-white rounded-xl p-4 shadow-card border border-border hover:border-primary/30 hover:shadow-ticket transition-all group cursor-pointer"
    >
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-lg bg-secondary flex items-center justify-center text-xl flex-shrink-0">
          {emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-semibold text-sm text-foreground truncate">
                {location.name}
              </h3>
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {location.address}
              </p>
            </div>
            <ChevronRight
              size={16}
              className="text-muted-foreground flex-shrink-0 mt-0.5 group-hover:text-primary transition-colors"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1.5 line-clamp-1">
            {location.description}
          </p>
          <div className="flex items-center gap-2 mt-2.5">
            <div className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
              <Users size={10} />
              <span className="text-[10px] font-medium">
                {queueCount} in queue
              </span>
            </div>
            <div className="flex items-center gap-1 bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full">
              <Clock size={10} />
              <span className="text-[10px] font-medium">Avg {avgMin} min</span>
            </div>
            {etaMin > 0 && (
              <div className="flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">
                <span className="text-[10px] font-medium">~{etaMin}m wait</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
