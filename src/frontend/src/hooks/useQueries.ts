import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { QueueStatus, ServiceLocation, Token } from "../backend";
import { useActor } from "./useActor";

export function useLocations() {
  const { actor, isFetching } = useActor();
  return useQuery<ServiceLocation[]>({
    queryKey: ["locations"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getLocations();
    },
    enabled: !!actor && !isFetching,
    staleTime: 3000,
  });
}

export function useLocation(id: bigint | null) {
  const { actor, isFetching } = useActor();
  return useQuery<ServiceLocation | null>({
    queryKey: ["location", id?.toString()],
    queryFn: async () => {
      if (!actor || id === null) return null;
      return actor.getLocation(id);
    },
    enabled: !!actor && !isFetching && id !== null,
    staleTime: 3000,
  });
}

export function useQueueStatus(serviceId: bigint | null) {
  const { actor, isFetching } = useActor();
  return useQuery<QueueStatus>({
    queryKey: ["queueStatus", serviceId?.toString()],
    queryFn: async () => {
      if (!actor || serviceId === null) {
        return {
          waitingCount: 0n,
          nextTokenNumber: 1n,
          currentServingToken: 0n,
        };
      }
      return actor.getQueueStatus(serviceId);
    },
    enabled: !!actor && !isFetching && serviceId !== null,
    staleTime: 3000,
  });
}

export function useUserTokens() {
  const { actor, isFetching } = useActor();
  return useQuery<Token[]>({
    queryKey: ["userTokens"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getUserTokens();
    },
    enabled: !!actor && !isFetching,
    staleTime: 3000,
  });
}

export function useQueueList(serviceId: bigint | null) {
  const { actor, isFetching } = useActor();
  return useQuery<Token[]>({
    queryKey: ["queueList", serviceId?.toString()],
    queryFn: async () => {
      if (!actor || serviceId === null) return [];
      return actor.getQueueList(serviceId);
    },
    enabled: !!actor && !isFetching && serviceId !== null,
    staleTime: 3000,
  });
}

export function useIsAdmin() {
  const { actor, isFetching } = useActor();
  return useQuery<boolean>({
    queryKey: ["isAdmin"],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isCallerAdmin();
    },
    enabled: !!actor && !isFetching,
    staleTime: 30000,
  });
}

export function useBookToken() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (serviceId: bigint) => {
      if (!actor) throw new Error("Not connected");
      return actor.bookToken(serviceId);
    },
    onSuccess: (_, serviceId) => {
      queryClient.invalidateQueries({ queryKey: ["userTokens"] });
      queryClient.invalidateQueries({
        queryKey: ["queueStatus", serviceId.toString()],
      });
      queryClient.invalidateQueries({
        queryKey: ["queueList", serviceId.toString()],
      });
      queryClient.invalidateQueries({ queryKey: ["locations"] });
    },
  });
}

export function useCancelToken() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (tokenId: bigint) => {
      if (!actor) throw new Error("Not connected");
      return actor.cancelToken(tokenId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userTokens"] });
      queryClient.invalidateQueries({ queryKey: ["queueStatus"] });
      queryClient.invalidateQueries({ queryKey: ["queueList"] });
      queryClient.invalidateQueries({ queryKey: ["locations"] });
    },
  });
}

export function useAdvanceQueue() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (serviceId: bigint) => {
      if (!actor) throw new Error("Not connected");
      return actor.advanceQueue(serviceId);
    },
    onSuccess: (_, serviceId) => {
      queryClient.invalidateQueries({
        queryKey: ["queueStatus", serviceId.toString()],
      });
      queryClient.invalidateQueries({
        queryKey: ["queueList", serviceId.toString()],
      });
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      queryClient.invalidateQueries({
        queryKey: ["location", serviceId.toString()],
      });
    },
  });
}

export function useAddLocation() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      name: string;
      category: string;
      description: string;
      address: string;
      avgServiceTimeMinutes: number;
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.addLocation(
        data.name,
        data.category,
        data.description,
        data.address,
        BigInt(data.avgServiceTimeMinutes),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
    },
  });
}

export function useUpdateLocation() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      id: bigint;
      name: string;
      category: string;
      description: string;
      address: string;
      avgServiceTimeMinutes: number;
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.updateLocation(
        data.id,
        data.name,
        data.category,
        data.description,
        data.address,
        BigInt(data.avgServiceTimeMinutes),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
    },
  });
}

export function useRemoveLocation() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Not connected");
      return actor.removeLocation(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
    },
  });
}
