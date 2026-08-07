"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { allocateStudentToRouteAction, createTransportRouteAction, createTransportStopAction, createTransportVehicleAction, createVehicleDocumentAction } from "../actions/transport.actions";

type Route = { id: string; name: string; capacity: number; vehicleId: string | null };
type Stop = { id: string; name: string; address: string | null };
type Student = { id: string; name: string };

function Message({ value }: { value: string }) { return <p className="text-sm text-muted-foreground" role="status">{value}</p>; }

export function TransportRouteForm() {
  const [message, setMessage] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); const result = await createTransportRouteAction({ name: data.get("name"), capacity: data.get("capacity"), vehicleId: data.get("vehicleId") }); setMessage(result.ok ? result.message ?? "Created." : result.error); if (result.ok) event.currentTarget.reset(); }
  return <form onSubmit={submit} className="grid gap-4 sm:grid-cols-3" noValidate><div className="space-y-2"><Label htmlFor="transport-route-name">Route name</Label><Input id="transport-route-name" name="name" required /></div><div className="space-y-2"><Label htmlFor="transport-route-capacity">Seat capacity</Label><Input id="transport-route-capacity" name="capacity" type="number" min="1" required /></div><div className="space-y-2"><Label htmlFor="transport-route-vehicle">Vehicle ID (optional)</Label><Input id="transport-route-vehicle" name="vehicleId" /></div><div className="sm:col-span-3 flex items-center justify-between gap-3"><Message value={message} /><Button>Create route</Button></div></form>;
}

export function TransportStopForm() {
  const [message, setMessage] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); const result = await createTransportStopAction({ name: data.get("name"), address: data.get("address") }); setMessage(result.ok ? result.message ?? "Created." : result.error); if (result.ok) event.currentTarget.reset(); }
  return <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate><div className="space-y-2"><Label htmlFor="transport-stop-name">Stop name</Label><Input id="transport-stop-name" name="name" required /></div><div className="space-y-2"><Label htmlFor="transport-stop-address">Address</Label><Input id="transport-stop-address" name="address" /></div><div className="sm:col-span-2 flex items-center justify-between gap-3"><Message value={message} /><Button>Create stop</Button></div></form>;
}

export function TransportVehicleForm() {
  const [message, setMessage] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); const result = await createTransportVehicleAction({ registrationNumber: data.get("registrationNumber"), type: data.get("type"), capacity: data.get("capacity") }); setMessage(result.ok ? result.message ?? "Created." : result.error); if (result.ok) event.currentTarget.reset(); }
  return <form onSubmit={submit} className="grid gap-4 sm:grid-cols-3" noValidate><div className="space-y-2"><Label htmlFor="transport-vehicle-registration">Registration number</Label><Input id="transport-vehicle-registration" name="registrationNumber" required /></div><div className="space-y-2"><Label htmlFor="transport-vehicle-type">Vehicle type</Label><Input id="transport-vehicle-type" name="type" placeholder="Bus" required /></div><div className="space-y-2"><Label htmlFor="transport-vehicle-capacity">Seat capacity</Label><Input id="transport-vehicle-capacity" name="capacity" type="number" min="1" required /></div><div className="sm:col-span-3 flex items-center justify-between gap-3"><Message value={message} /><Button>Create vehicle</Button></div></form>;
}

export function VehicleDocumentForm({ vehicles }: { vehicles: Array<{ id: string; registrationNumber: string }> }) {
  const [message, setMessage] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); const result = await createVehicleDocumentAction({ vehicleId: data.get("vehicleId"), documentType: data.get("documentType"), expiresOn: data.get("expiresOn") }); setMessage(result.ok ? result.message ?? "Created." : result.error); if (result.ok) event.currentTarget.reset(); }
  return <form onSubmit={submit} className="grid gap-4 sm:grid-cols-3" noValidate><div className="space-y-2"><Label htmlFor="vehicle-document-vehicle">Vehicle</Label><select id="vehicle-document-vehicle" name="vehicleId" className="h-10 w-full rounded-md border bg-background px-3 text-sm" required><option value="">Choose a vehicle</option>{vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.registrationNumber}</option>)}</select></div><div className="space-y-2"><Label htmlFor="vehicle-document-type">Document type</Label><Input id="vehicle-document-type" name="documentType" placeholder="Insurance" required /></div><div className="space-y-2"><Label htmlFor="vehicle-document-expiry">Expires on</Label><Input id="vehicle-document-expiry" name="expiresOn" type="date" required /></div><div className="sm:col-span-3 flex items-center justify-between gap-3"><Message value={message} /><Button disabled={!vehicles.length}>Record document</Button></div></form>;
}

export function RouteAllocationForm({ routes, stops, students }: { routes: Route[]; stops: Stop[]; students: Student[] }) {
  const [message, setMessage] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); const result = await allocateStudentToRouteAction({ routeId: data.get("routeId"), stopId: data.get("stopId"), studentId: data.get("studentId") }); setMessage(result.ok ? result.message ?? "Allocated." : result.error); if (result.ok) event.currentTarget.reset(); }
  return <form onSubmit={submit} className="grid gap-4 sm:grid-cols-3" noValidate><div className="space-y-2"><Label htmlFor="allocation-route">Route</Label><select id="allocation-route" name="routeId" className="h-10 w-full rounded-md border bg-background px-3 text-sm" required><option value="">Choose a route</option>{routes.map((route) => <option key={route.id} value={route.id}>{route.name} ({route.capacity} seats)</option>)}</select></div><div className="space-y-2"><Label htmlFor="allocation-stop">Stop</Label><select id="allocation-stop" name="stopId" className="h-10 w-full rounded-md border bg-background px-3 text-sm" required><option value="">Choose a stop</option>{stops.map((stop) => <option key={stop.id} value={stop.id}>{stop.name}</option>)}</select></div><div className="space-y-2"><Label htmlFor="allocation-student">Student</Label><select id="allocation-student" name="studentId" className="h-10 w-full rounded-md border bg-background px-3 text-sm" required><option value="">Choose a student</option>{students.map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}</select></div><div className="sm:col-span-3 flex items-center justify-between gap-3"><Message value={message} /><Button disabled={!routes.length || !stops.length || !students.length}>Allocate seat</Button></div></form>;
}
