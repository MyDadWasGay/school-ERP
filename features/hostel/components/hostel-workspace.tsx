"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { allocateHostelBedAction, checkoutHostelAllotmentAction, createHostelBedAction, createHostelRoomAction } from "../actions/hostel.actions";

type Room = { id: string; building: string; floor: string | null; roomNumber: string; capacity: number; occupancy?: number; available?: number };
type Bed = { id: string; code: string | null; building: string; roomNumber: string; roomId: string };
type Student = { id: string; name: string };

function Message({ value }: { value: string }) { return value ? <p role="status" className="text-sm text-muted-foreground">{value}</p> : null; }

export function HostelRoomForm() {
  const [message, setMessage] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const result = await createHostelRoomAction({ building: data.get("building"), floor: data.get("floor"), roomNumber: data.get("roomNumber"), capacity: data.get("capacity") });
    setMessage(result.ok ? result.message ?? "Room created." : result.error);
    if (result.ok) event.currentTarget.reset();
  }
  return <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" noValidate><div className="space-y-2"><Label htmlFor="hostel-building">Building</Label><Input id="hostel-building" name="building" required /></div><div className="space-y-2"><Label htmlFor="hostel-floor">Floor</Label><Input id="hostel-floor" name="floor" /></div><div className="space-y-2"><Label htmlFor="hostel-room">Room number</Label><Input id="hostel-room" name="roomNumber" required /></div><div className="space-y-2"><Label htmlFor="hostel-capacity">Bed capacity</Label><Input id="hostel-capacity" name="capacity" type="number" min="1" defaultValue="1" required /></div><div className="sm:col-span-2 lg:col-span-4 flex items-center justify-between gap-3"><Message value={message} /><Button>Create room</Button></div></form>;
}

export function HostelBedForm({ rooms }: { rooms: Room[] }) {
  const [message, setMessage] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const result = await createHostelBedAction({ roomId: data.get("roomId"), code: data.get("code") });
    setMessage(result.ok ? result.message ?? "Bed created." : result.error);
    if (result.ok) event.currentTarget.reset();
  }
  return <form onSubmit={submit} className="flex flex-wrap items-end gap-4" noValidate><div className="min-w-64 space-y-2"><Label htmlFor="hostel-bed-room">Room</Label><select id="hostel-bed-room" name="roomId" className="h-10 w-full rounded-md border bg-background px-3 text-sm" required><option value="">Choose a room</option>{rooms.map((room) => <option key={room.id} value={room.id}>{room.building} / {room.roomNumber} ({room.available ?? room.capacity} available)</option>)}</select></div><div className="space-y-2"><Label htmlFor="hostel-bed-code">Bed code</Label><Input id="hostel-bed-code" name="code" placeholder="B-01" required /></div><Button disabled={!rooms.length}>Create bed</Button><Message value={message} /></form>;
}

export function HostelAllotmentForm({ rooms, beds, students }: { rooms: Room[]; beds: Bed[]; students: Student[] }) {
  const [message, setMessage] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const result = await allocateHostelBedAction({ roomId: data.get("roomId"), bedId: data.get("bedId"), studentId: data.get("studentId") });
    setMessage(result.ok ? result.message ?? "Bed allotted." : result.error);
    if (result.ok) event.currentTarget.reset();
  }
  return <form onSubmit={submit} className="grid gap-4 sm:grid-cols-3" noValidate><div className="space-y-2"><Label htmlFor="hostel-allot-room">Room</Label><select id="hostel-allot-room" name="roomId" className="h-10 w-full rounded-md border bg-background px-3 text-sm" required><option value="">Choose a room</option>{rooms.map((room) => <option key={room.id} value={room.id}>{room.building} / {room.roomNumber}</option>)}</select></div><div className="space-y-2"><Label htmlFor="hostel-allot-bed">Bed</Label><select id="hostel-allot-bed" name="bedId" className="h-10 w-full rounded-md border bg-background px-3 text-sm" required><option value="">Choose a bed</option>{beds.map((bed) => <option key={bed.id} value={bed.id}>{bed.building} / {bed.roomNumber} / {bed.code ?? bed.id}</option>)}</select></div><div className="space-y-2"><Label htmlFor="hostel-allot-student">Student</Label><select id="hostel-allot-student" name="studentId" className="h-10 w-full rounded-md border bg-background px-3 text-sm" required><option value="">Choose a student</option>{students.map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}</select></div><div className="sm:col-span-3 flex items-center justify-between gap-3"><Message value={message} /><Button disabled={!rooms.length || !beds.length || !students.length}>Allot bed</Button></div></form>;
}

export function CheckoutButton({ allotmentId }: { allotmentId: string }) {
  const [message, setMessage] = useState("");
  async function checkout() {
    const result = await checkoutHostelAllotmentAction({ allotmentId });
    setMessage(result.ok ? result.message ?? "Checked out." : result.error);
    if (result.ok) window.location.reload();
  }
  return <div className="flex items-center gap-2"><Button size="sm" variant="outline" onClick={checkout}>Check out</Button>{message ? <span role="status" className="text-xs text-muted-foreground">{message}</span> : null}</div>;
}
