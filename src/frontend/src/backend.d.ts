import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Token {
    id: bigint;
    status: string;
    tokenNumber: bigint;
    userId: string;
    createdAt: bigint;
    serviceId: bigint;
}
export interface QueueStatus {
    waitingCount: bigint;
    nextTokenNumber: bigint;
    currentServingToken: bigint;
}
export interface ServiceLocation {
    id: bigint;
    name: string;
    description: string;
    isActive: boolean;
    avgServiceTimeMinutes: bigint;
    currentServingToken: bigint;
    address: string;
    category: string;
    nextTokenCounter: bigint;
}
export interface UserProfile {
    name: string;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addLocation(name: string, category: string, description: string, address: string, avgServiceTimeMinutes: bigint): Promise<ServiceLocation>;
    advanceQueue(serviceId: bigint): Promise<ServiceLocation>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    bookToken(serviceId: bigint): Promise<Token>;
    cancelToken(tokenId: bigint): Promise<void>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getLocation(id: bigint): Promise<ServiceLocation | null>;
    getLocations(): Promise<Array<ServiceLocation>>;
    getQueueList(serviceId: bigint): Promise<Array<Token>>;
    getQueueStatus(serviceId: bigint): Promise<QueueStatus>;
    getToken(tokenId: bigint): Promise<Token | null>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    getUserTokens(): Promise<Array<Token>>;
    isCallerAdmin(): Promise<boolean>;
    removeLocation(id: bigint): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    updateLocation(id: bigint, name: string, category: string, description: string, address: string, avgServiceTimeMinutes: bigint): Promise<ServiceLocation>;
}
