import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  ChevronRight,
  Loader2,
  Lock,
  Pencil,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { ServiceLocation } from "../backend";
import {
  useAddLocation,
  useAdvanceQueue,
  useIsAdmin,
  useLocations,
  useQueueList,
  useRemoveLocation,
  useUpdateLocation,
} from "../hooks/useQueries";
import { getCategoryEmoji } from "../lib/queueUtils";

const CATEGORIES = [
  "Hospital",
  "Salon",
  "Shop",
  "Clinic",
  "Bank",
  "Pharmacy",
  "Restaurant",
  "Government",
];

interface LocationFormData {
  name: string;
  category: string;
  description: string;
  address: string;
  avgServiceTimeMinutes: string;
}

const emptyForm: LocationFormData = {
  name: "",
  category: "Shop",
  description: "",
  address: "",
  avgServiceTimeMinutes: "10",
};

export function AdminPage() {
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin();
  const { data: locations, isLoading: locLoading } = useLocations();
  const addLocation = useAddLocation();
  const updateLocation = useUpdateLocation();
  const removeLocation = useRemoveLocation();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ServiceLocation | null>(null);
  const [formData, setFormData] = useState<LocationFormData>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<ServiceLocation | null>(
    null,
  );
  const [selectedServiceId, setSelectedServiceId] = useState<bigint | null>(
    null,
  );

  function openAddDialog() {
    setEditTarget(null);
    setFormData(emptyForm);
    setDialogOpen(true);
  }

  function openEditDialog(loc: ServiceLocation) {
    setEditTarget(loc);
    setFormData({
      name: loc.name,
      category: loc.category,
      description: loc.description,
      address: loc.address,
      avgServiceTimeMinutes: loc.avgServiceTimeMinutes.toString(),
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!formData.name || !formData.address) {
      toast.error("Name and address are required.");
      return;
    }
    try {
      if (editTarget) {
        await updateLocation.mutateAsync({
          id: editTarget.id,
          ...formData,
          avgServiceTimeMinutes:
            Number.parseInt(formData.avgServiceTimeMinutes) || 10,
        });
        toast.success("Location updated.");
      } else {
        await addLocation.mutateAsync({
          ...formData,
          avgServiceTimeMinutes:
            Number.parseInt(formData.avgServiceTimeMinutes) || 10,
        });
        toast.success("Location added.");
      }
      setDialogOpen(false);
    } catch {
      toast.error("Failed to save location.");
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await removeLocation.mutateAsync(deleteTarget.id);
      toast.success("Location removed.");
      setDeleteTarget(null);
    } catch {
      toast.error("Failed to remove location.");
    }
  }

  if (adminLoading) {
    return (
      <div className="px-4 py-8 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="px-4 py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
          <Lock size={28} className="text-muted-foreground" />
        </div>
        <h3 className="font-bold text-base text-foreground">
          Admin Access Required
        </h3>
        <p className="text-xs text-muted-foreground mt-2 max-w-[220px] mx-auto">
          You must be an admin to access this panel. Contact your system
          administrator.
        </p>
      </div>
    );
  }

  return (
    <div data-ocid="admin.page" className="px-4 py-4">
      <div className="mb-4">
        <h2 className="text-base font-bold text-foreground">Admin Panel</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Manage locations and queues
        </p>
      </div>

      <Tabs defaultValue="locations">
        <TabsList className="w-full mb-4">
          <TabsTrigger
            value="locations"
            className="flex-1"
            data-ocid="admin.locations.tab"
          >
            Locations
          </TabsTrigger>
          <TabsTrigger
            value="queue"
            className="flex-1"
            data-ocid="admin.queue.tab"
          >
            Queue Manager
          </TabsTrigger>
        </TabsList>

        {/* Locations Tab */}
        <TabsContent value="locations" className="space-y-3">
          <Button
            data-ocid="admin.add_location.open_modal_button"
            onClick={openAddDialog}
            size="sm"
            className="w-full"
          >
            <Plus size={16} className="mr-2" />
            Add Location
          </Button>

          {locLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full rounded-xl" />
              ))}
            </div>
          ) : (locations ?? []).length === 0 ? (
            <div
              data-ocid="admin.location.empty_state"
              className="text-center py-12 text-muted-foreground"
            >
              <p className="text-3xl mb-2">🏢</p>
              <p className="text-sm font-medium">No locations yet</p>
              <p className="text-xs mt-1">
                Add your first service location above
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {(locations ?? []).map((loc, idx) => (
                <AdminLocationRow
                  key={loc.id.toString()}
                  location={loc}
                  index={idx + 1}
                  onEdit={() => openEditDialog(loc)}
                  onDelete={() => setDeleteTarget(loc)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Queue Manager Tab */}
        <TabsContent value="queue" className="space-y-4">
          <QueueManagerTab
            locations={locations ?? []}
            selectedServiceId={selectedServiceId}
            onSelectService={setSelectedServiceId}
          />
        </TabsContent>
      </Tabs>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          data-ocid="admin.location.dialog"
          className="max-w-[380px]"
        >
          <DialogHeader>
            <DialogTitle>
              {editTarget ? "Edit Location" : "Add Location"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="loc-name" className="text-xs">
                Name *
              </Label>
              <Input
                id="loc-name"
                data-ocid="admin.location.name.input"
                value={formData.name}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, name: e.target.value }))
                }
                placeholder="e.g. City Hospital"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="loc-category" className="text-xs">
                Category
              </Label>
              <Select
                value={formData.category}
                onValueChange={(v) =>
                  setFormData((p) => ({ ...p, category: v }))
                }
              >
                <SelectTrigger
                  id="loc-category"
                  data-ocid="admin.location.category.select"
                  className="h-9 text-sm"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="loc-desc" className="text-xs">
                Description
              </Label>
              <Textarea
                id="loc-desc"
                data-ocid="admin.location.description.textarea"
                value={formData.description}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, description: e.target.value }))
                }
                placeholder="Brief description of services..."
                className="text-sm resize-none"
                rows={2}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="loc-address" className="text-xs">
                Address *
              </Label>
              <Input
                id="loc-address"
                data-ocid="admin.location.address.input"
                value={formData.address}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, address: e.target.value }))
                }
                placeholder="e.g. 42 Wellness Ave, Downtown"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="loc-avgtime" className="text-xs">
                Avg Service Time (minutes)
              </Label>
              <Input
                id="loc-avgtime"
                data-ocid="admin.location.avgtime.input"
                type="number"
                min="1"
                value={formData.avgServiceTimeMinutes}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    avgServiceTimeMinutes: e.target.value,
                  }))
                }
                className="h-9 text-sm"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              data-ocid="admin.location.cancel.cancel_button"
              variant="outline"
              size="sm"
              onClick={() => setDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              data-ocid="admin.location.save.submit_button"
              size="sm"
              onClick={handleSave}
              disabled={addLocation.isPending || updateLocation.isPending}
            >
              {(addLocation.isPending || updateLocation.isPending) && (
                <Loader2 size={14} className="mr-2 animate-spin" />
              )}
              {editTarget ? "Save Changes" : "Add Location"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Location?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove <strong>{deleteTarget?.name}</strong>{" "}
              and all its queue data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-ocid="admin.location.cancel.cancel_button">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              data-ocid="admin.location.delete_button"
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removeLocation.isPending ? (
                <Loader2 size={14} className="mr-2 animate-spin" />
              ) : null}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function AdminLocationRow({
  location,
  index,
  onEdit,
  onDelete,
}: {
  location: ServiceLocation;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const emoji = getCategoryEmoji(location.category);
  const queueCount = Math.max(
    0,
    Number(location.nextTokenCounter) -
      Number(location.currentServingToken) -
      1,
  );

  return (
    <div
      data-ocid={`admin.location.item.${index}`}
      className="bg-white rounded-xl p-3.5 border border-border shadow-xs flex items-center gap-3"
    >
      <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center text-lg flex-shrink-0">
        {emoji}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-foreground truncate">
          {location.name}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <Badge variant="secondary" className="text-[9px] px-1.5">
            {location.category}
          </Badge>
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Users size={10} />
            {queueCount} in queue
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <Button
          data-ocid={`admin.location.edit_button.${index}`}
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={onEdit}
        >
          <Pencil size={14} />
        </Button>
        <Button
          data-ocid={`admin.location.delete_button.${index}`}
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={onDelete}
        >
          <Trash2 size={14} />
        </Button>
      </div>
    </div>
  );
}

function QueueManagerTab({
  locations,
  selectedServiceId,
  onSelectService,
}: {
  locations: ServiceLocation[];
  selectedServiceId: bigint | null;
  onSelectService: (id: bigint | null) => void;
}) {
  const { data: queueList, isLoading } = useQueueList(selectedServiceId);
  const advanceQueue = useAdvanceQueue();

  const selectedLocation = locations.find(
    (l) => l.id.toString() === selectedServiceId?.toString(),
  );

  async function handleAdvance() {
    if (!selectedServiceId) return;
    try {
      const updated = await advanceQueue.mutateAsync(selectedServiceId);
      toast.success(`Now serving #${updated.currentServingToken}`);
    } catch {
      toast.error("Failed to advance queue.");
    }
  }

  const waitingTokens = (queueList ?? []).filter((t) => t.status === "waiting");

  return (
    <div className="space-y-4">
      {/* Service selector */}
      <div className="space-y-1">
        <Label className="text-xs">Select Service</Label>
        <Select
          value={selectedServiceId?.toString() ?? ""}
          onValueChange={(v) => onSelectService(v ? BigInt(v) : null)}
        >
          <SelectTrigger
            data-ocid="admin.queue.service.select"
            className="h-9 text-sm"
          >
            <SelectValue placeholder="Choose a service location..." />
          </SelectTrigger>
          <SelectContent>
            {locations.map((loc) => (
              <SelectItem key={loc.id.toString()} value={loc.id.toString()}>
                {getCategoryEmoji(loc.category)} {loc.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedLocation && (
        <>
          {/* Currently serving */}
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
              Currently Serving
            </p>
            <div className="flex items-center justify-between">
              <p className="text-3xl font-black text-primary">
                #{Number(selectedLocation.currentServingToken)}
              </p>
              <Button
                data-ocid="admin.queue.advance.primary_button"
                size="sm"
                onClick={handleAdvance}
                disabled={advanceQueue.isPending || waitingTokens.length === 0}
                className="font-semibold"
              >
                {advanceQueue.isPending ? (
                  <Loader2 size={14} className="mr-1.5 animate-spin" />
                ) : (
                  <ChevronRight size={14} className="mr-1.5" />
                )}
                Next Customer
              </Button>
            </div>
          </div>

          {/* Waiting queue list */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-foreground">
                Waiting Queue
              </p>
              <Badge variant="secondary" className="text-[10px]">
                {waitingTokens.length} waiting
              </Badge>
            </div>

            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-lg" />
                ))}
              </div>
            ) : waitingTokens.length === 0 ? (
              <div
                data-ocid="admin.queue.empty_state"
                className="text-center py-8 text-muted-foreground"
              >
                <p className="text-2xl mb-2">✅</p>
                <p className="text-sm font-medium">Queue is empty</p>
              </div>
            ) : (
              <div data-ocid="admin.queue.list" className="space-y-1.5">
                {waitingTokens.map((token, idx) => (
                  <div
                    key={token.id.toString()}
                    data-ocid={`admin.queue.item.${idx + 1}`}
                    className="flex items-center justify-between bg-white border border-border rounded-lg px-3 py-2.5"
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold ${
                          idx === 0
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-foreground"
                        }`}
                      >
                        {idx + 1}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          Token #{Number(token.tokenNumber)}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-mono">
                          {token.userId.slice(0, 8)}...
                        </p>
                      </div>
                    </div>
                    {idx === 0 && (
                      <Badge className="text-[9px] bg-primary/10 text-primary border-primary/20">
                        Next up
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {!selectedLocation && locations.length > 0 && (
        <div className="text-center py-10 text-muted-foreground">
          <p className="text-3xl mb-2">☝️</p>
          <p className="text-sm">Select a service to manage its queue</p>
        </div>
      )}
    </div>
  );
}
