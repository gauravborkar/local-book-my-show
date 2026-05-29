import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

export function ManagerCheckIn() {
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");

  const checkIn = useMutation({
    mutationFn: () =>
      api(`/api/manager/check-in/${code.trim()}`, { method: "POST" }),
    onSuccess: () => {
      setMessage("Checked in successfully!");
      setCode("");
    },
    onError: (e) => setMessage(e instanceof ApiError ? e.message : "Check-in failed"),
  });

  return (
    <div className="max-w-md mx-auto space-y-6">
      <h1 className="font-display text-3xl font-bold">Check-in</h1>
      <Card className="p-6 space-y-4">
        <Input
          label="Booking code"
          placeholder="BMS-XXXXXXXX"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
        />
        <Button
          className="w-full"
          loading={checkIn.isPending}
          onClick={() => checkIn.mutate()}
        >
          Check in guest
        </Button>
        {message && (
          <p className={`text-sm ${message.includes("success") ? "text-green-400" : "text-red-400"}`}>
            {message}
          </p>
        )}
      </Card>
    </div>
  );
}
