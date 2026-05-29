import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import {
  SeatMapBuilder,
  defaultLayout,
  layoutToSeatTemplate,
  type SeatMapLayoutConfig,
} from "@/components/seats/SeatMapBuilder";
import type { Facility } from "@/types";

export function ManagerFacilities() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [seatLayout, setSeatLayout] = useState<SeatMapLayoutConfig>(defaultLayout);
  const [form, setForm] = useState({
    name: "",
    address: "",
    city: "",
    description: "",
  });
  const [error, setError] = useState("");

  const { data: facilities = [] } = useQuery({
    queryKey: ["facilities"],
    queryFn: () => api<Facility[]>("/api/manager/facilities"),
  });

  const createMutation = useMutation({
    mutationFn: () => {
      const seatTemplate = layoutToSeatTemplate(seatLayout);
      if (seatTemplate.length === 0) {
        throw new Error("Add at least one seat to the map");
      }
      return api("/api/manager/facilities", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          capacity: seatTemplate.length,
          seatTemplate,
          seatLayoutConfig: seatLayout,
        }),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["facilities"] });
      setShowForm(false);
      setForm({ name: "", address: "", city: "", description: "" });
      setSeatLayout(defaultLayout());
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : "Failed"),
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="font-display text-3xl font-bold">Facilities</h1>
        <Button
          onClick={() => {
            setShowForm(!showForm);
            if (!showForm) setSeatLayout(defaultLayout());
          }}
        >
          {showForm ? "Cancel" : "Add facility"}
        </Button>
      </div>

      {showForm && (
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

          {error && <p className="text-red-400 text-sm">{error}</p>}
          <Button loading={createMutation.isPending} onClick={() => createMutation.mutate()}>
            Save facility & seat map
          </Button>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {facilities.map((f) => (
          <Card key={f.id} className="p-5">
            <h3 className="font-semibold">{f.name}</h3>
            <p className="text-sm text-text-muted mt-1">
              {f.address}, {f.city}
            </p>
            <p className="text-xs text-text-muted mt-2">
              Capacity: {f.capacity}
              {f.hasSeatTemplate && f._count?.seatTemplates != null && (
                <span className="text-emerald-300">
                  {" "}
                  · Seat map: {f._count.seatTemplates} seats
                </span>
              )}
            </p>
            <div className="mt-3">
              <Link to={`/manager/facilities/${f.id}`}>
                <Button size="sm" variant="secondary">
                  Edit facility
                </Button>
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
