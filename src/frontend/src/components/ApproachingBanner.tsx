import { Bell } from "lucide-react";

interface ApproachingBannerProps {
  serviceName: string;
  tokenNumber: number;
  peopleAhead: number;
  dataOcid?: string;
}

export function ApproachingBanner({
  serviceName,
  tokenNumber,
  peopleAhead,
  dataOcid,
}: ApproachingBannerProps) {
  return (
    <div
      data-ocid={dataOcid ?? "approaching.toast"}
      className="animate-pulse-amber animate-slide-down flex items-start gap-3 bg-amber-500 text-white rounded-xl p-3.5 shadow-ticket"
    >
      <div className="mt-0.5 bg-white/20 rounded-lg p-1.5">
        <Bell size={18} className="fill-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm leading-tight">Head over now! 🚶</p>
        <p className="text-xs text-white/90 mt-0.5 leading-tight">
          Token <span className="font-bold">#{tokenNumber}</span> at{" "}
          {serviceName} —{" "}
          {peopleAhead === 0
            ? "You're up next!"
            : `Only ${peopleAhead} ${peopleAhead === 1 ? "person" : "people"} ahead`}
        </p>
      </div>
    </div>
  );
}
