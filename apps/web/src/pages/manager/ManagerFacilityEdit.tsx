import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { SeatMapBuilder } from "@/components/seats/SeatMapBuilder";
import {
  defaultLayout,
  layoutToSeatTemplate,
  seatTemplateToLayout,
  type SeatMapLayoutConfig,
} from "@/lib/seat-map";
import type { FacilityDetail } from "@/types";

export function ManagerFacilityEdit() {
  const { facilityId = "" } = useParams<{ facilityId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [error, setError] = useState("");

  const { data: facility, isLoading } = useQuery({
    queryKey: ["facility", facilityId],
    queryFn: () => api<FacilityDetail>(`/api/manager/facilities/${facilityId}`),
    enabled: !!facilityId,
  });

  const initialLayout = useMemo<SeatMapLayoutConfig>(() => {
    if (!facility) return defaultLayout();
    if (facility.seatTemplates.length > 0) {
      return seatTemplateToLayout(
        facility.seatTemplates.map((seat) => ({
          ticketTypeKey: seat.ticketTypeKey,
          rowLabel: seat.rowLabel,
          seatNumber: seat.seatNumber,
          x: seat.x ?? undefined,
          y: seat.y ?? undefined,
          priceCents: seat.priceCents ?? undefined,
          maxPerOrder: seat.maxPerOrder ?? undefined,
        }))
      );
    }
    return defaultLayout();
  }, [facility]);

  const [seatLayout, setSeatLayout] = useState<SeatMapLayoutConfig>(defaultLayout);
  const [form, setForm] = useState({
    name: "",
    city: "",
    address: "",
    description: "",
  });

  useEffect(() => {
    if (!facility) return;
    setForm({
      name: facility.name,
      city: facility.city,
      address: facility.address,
      description: facility.description ?? "",
    });
    setSeatLayout(initialLayout);
  }, [facility, initialLayout]);

  const updateMutation = useMutation({
    mutationFn: () => {
      const seatTemplate = layoutToSeatTemplate(seatLayout);
      if (seatTemplate.length === 0) {
        throw new Error("Seat map cannot be empty");
      }
      return api(`/api/manager/facilities/${facilityId}`, {
        method: "PATCH",
        body: JSON.stringify({
          ...form,
          capacity: seatTemplate.length,
          seatTemplate,
          seatLayoutConfig: seatLayout,
        }),
      });
    },
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["facilities"] }),
        qc.invalidateQueries({ queryKey: ["facility", facilityId] }),
      ]);
      navigate("/manager/facilities");
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : "Failed to update facility"),
  });

  if (isLoading) return <p className="text-text-muted">Loading facility…</p>;
  if (!facility) return <p className="text-red-400">Facility not found</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Edit facility</h1>
          <p className="text-sm text-text-muted">
            Update facility details and seat arrangement.
          </p>
        </div>
        <Link to="/manager/facilities">
          <Button variant="secondary">Back</Button>
        </Link>
      </div>

      <Card className="p-6 space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Input
            label="City"
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
          />
          <Input
            label="Address"
            className="sm:col-span-2"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
          <Input
            label="Description"
            className="sm:col-span-2"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>

        <SeatMapBuilder value={seatLayout} onChange={setSeatLayout} />

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex gap-2">
          <Button loading={updateMutation.isPending} onClick={() => updateMutation.mutate()}>
            Save facility
          </Button>
          <Link to="/manager/facilities">
            <Button variant="secondary">Cancel</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}

