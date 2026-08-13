"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/forms/field-error";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { createGuardianAction, unlinkGuardianAction, updateGuardianAction } from "../actions/student.actions";
import { guardianRelationshipOptions, guardianSchema, type GuardianInput } from "../schemas/student.schema";

export type GuardianRecord = {
  id: string;
  linkId: string;
  firstName: string;
  lastName: string;
  relationship: string;
  customRelationship: string | null;
  isPrimary: boolean;
  isEmergencyContact: boolean;
  isBillingContact: boolean;
  email: string | null;
  phone: string | null;
  occupation: string | null;
  address: string | null;
  custodyNotes: string | null;
};

const knownRelationships = new Set<string>(guardianRelationshipOptions.map((option) => option.value));

function defaults(studentId: string, guardian?: GuardianRecord): GuardianInput {
  const relationship = knownRelationships.has(guardian?.relationship ?? "")
    ? guardian?.relationship
    : "other";
  return {
    studentId,
    guardianId: guardian?.id,
    firstName: guardian?.firstName ?? "",
    lastName: guardian?.lastName ?? "",
    relationship: (relationship || "father") as GuardianInput["relationship"],
    customRelationship: guardian?.customRelationship ?? (relationship === "other" ? guardian?.relationship ?? "" : ""),
    email: guardian?.email ?? "",
    phone: guardian?.phone ?? "",
    occupation: guardian?.occupation ?? "",
    address: guardian?.address ?? "",
    custodyNotes: guardian?.custodyNotes ?? "",
    isPrimary: guardian?.isPrimary ?? false,
    isEmergencyContact: guardian?.isEmergencyContact ?? false,
    isBillingContact: guardian?.isBillingContact ?? false,
  };
}

export function GuardianForm({ studentId, guardian }: { studentId: string; guardian?: GuardianRecord }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const form = useForm<GuardianInput>({
    resolver: zodResolver(guardianSchema),
    defaultValues: defaults(studentId, guardian),
  });
  const relationship = form.watch("relationship");
  const isEditing = Boolean(guardian);
  const submit = form.handleSubmit(async (input) => {
    setMessage("");
    const result = isEditing
      ? await updateGuardianAction({ ...input, id: guardian?.linkId ?? "" })
      : await createGuardianAction(input);
    setMessage(result.ok ? result.message ?? (isEditing ? "Guardian updated." : "Guardian linked.") : result.error);
    if (result.ok) {
      if (isEditing) router.refresh();
      else form.reset(defaults(studentId));
    }
  });

  const content = <form onSubmit={submit} className="rounded-lg border p-4" noValidate>
    <h2 className="mb-1 font-medium">{isEditing ? "Edit guardian" : "Add guardian"}</h2>
    {!isEditing ? <p className="mb-4 text-sm text-muted-foreground">Add each parent or guardian separately. Existing guardians remain linked when you add another.</p> : null}
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Field label="First name" error={form.formState.errors.firstName?.message}><Input {...form.register("firstName")} /></Field>
      <Field label="Last name" error={form.formState.errors.lastName?.message}><Input {...form.register("lastName")} /></Field>
      <Field label="Relationship" error={form.formState.errors.relationship?.message}>
        <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" {...form.register("relationship")}>
          {guardianRelationshipOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </Field>
      {relationship === "other" ? <Field label="Specify relationship" error={form.formState.errors.customRelationship?.message}><Input {...form.register("customRelationship")} placeholder="For example, Grandmother" /></Field> : null}
      <Field label="Email" error={form.formState.errors.email?.message}><Input type="email" {...form.register("email")} /></Field>
      <Field label="Phone" error={form.formState.errors.phone?.message}><Input type="tel" {...form.register("phone")} /></Field>
      <Field label="Occupation" error={form.formState.errors.occupation?.message}><Input {...form.register("occupation")} /></Field>
      <Field label="Address" error={form.formState.errors.address?.message}><Input {...form.register("address")} /></Field>
      <Field label="Custody notes" error={form.formState.errors.custodyNotes?.message}><Input {...form.register("custodyNotes")} /></Field>
    </div>
    <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
      <label className="flex items-center gap-2"><input type="checkbox" {...form.register("isPrimary")} /> Primary guardian</label>
      <label className="flex items-center gap-2"><input type="checkbox" {...form.register("isEmergencyContact")} /> Emergency contact</label>
      <label className="flex items-center gap-2"><input type="checkbox" {...form.register("isBillingContact")} /> Billing contact</label>
    </div>
    {message ? <p role="status" className="mt-3 text-sm text-muted-foreground">{message}</p> : null}
    <div className="mt-4 flex justify-end"><Button disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "Saving..." : isEditing ? "Save changes" : "Save guardian"}</Button></div>
  </form>;

  if (!isEditing) return content;
  return <details className="min-w-28"><summary className="cursor-pointer text-sm font-medium text-primary">Edit</summary><div className="mt-2">{content}</div></details>;
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}<FieldError message={error} /></div>;
}

export function GuardianUnlinkButton({ studentId, guardianId }: { studentId: string; guardianId: string }) {
  const [message, setMessage] = useState("");
  async function unlink() {
    const result = await unlinkGuardianAction({ studentId, guardianId });
    if (!result.ok) {
      setMessage(result.error);
      throw new Error(result.error);
    }
    setMessage(result.message ?? "Guardian unlinked.");
  }
  return <div className="flex items-center gap-2"><ConfirmDialog label="Remove" title="Remove this guardian from the student?" description="The guardian record will be kept for other linked students, but this relationship will be removed from the current student." triggerVariant="destructive" onConfirm={unlink} />{message ? <span role="status" className="text-xs text-muted-foreground">{message}</span> : null}</div>;
}
