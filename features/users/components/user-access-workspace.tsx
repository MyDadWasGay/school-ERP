"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { permissionKeys } from "@/config/permissions";
import { provisionRoles } from "../schemas/provision.schema";
import {
  createDelegationAction,
  revokeDelegationAction,
  updateUserAccessAction,
} from "../actions/user-access.actions";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/common/status-badge";

type CampusOption = { id: string; name: string };
type ClassSectionOption = {
  classId: string;
  sectionId: string;
  name: string;
  campusId: string | null;
};
type DelegationRow = {
  id: string;
  campusId: string | null;
  permissionKey: string;
  startsAt: Date;
  endsAt: Date;
  status: string;
};

export function UserAccessWorkspace({
  user,
  campusOptions,
  classSectionOptions,
  assignedCampusIds,
  assignedClassScopes,
  delegations,
  canManage,
}: {
  user: {
    id: string;
    displayName: string;
    email: string;
    role: string;
    status: string;
    campusId: string | null;
  };
  campusOptions: CampusOption[];
  classSectionOptions: ClassSectionOption[];
  assignedCampusIds: string[];
  assignedClassScopes: Array<{ classId: string; sectionId: string }>;
  delegations: DelegationRow[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [campusIds, setCampusIds] = useState(assignedCampusIds);
  const [message, setMessage] = useState("");
  const [delegationMessage, setDelegationMessage] = useState("");
  const classScopeKeys = useMemo(
    () => new Set(assignedClassScopes.map((scope) => `${scope.classId}:${scope.sectionId}`)),
    [assignedClassScopes],
  );

  async function saveAccess(formData: FormData) {
    const classSectionScopes = formData.getAll("classScope").map((value) => {
      const [classId, sectionId] = String(value).split(":");
      return { classId, sectionId };
    });
    const result = await updateUserAccessAction({
      id: user.id,
      displayName: formData.get("displayName"),
      role: formData.get("role"),
      status: formData.get("status"),
      primaryCampusId: formData.get("primaryCampusId"),
      campusIds,
      classSectionScopes,
    });
    setMessage(result.ok ? result.message ?? "Access updated." : result.error);
    if (result.ok) router.refresh();
  }

  async function grantDelegation(formData: FormData) {
    const result = await createDelegationAction({
      userId: user.id,
      campusId: formData.get("campusId"),
      permissionKey: formData.get("permissionKey"),
      startsAt: formData.get("startsAt"),
      endsAt: formData.get("endsAt"),
    });
    setDelegationMessage(result.ok ? result.message ?? "Access granted." : result.error);
    if (result.ok) router.refresh();
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await saveAccess(new FormData(event.currentTarget));
  }

  async function handleGrantDelegation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await grantDelegation(new FormData(event.currentTarget));
  }

  function toggleCampus(campusId: string, checked: boolean) {
    setCampusIds((current) => checked
      ? [...new Set([...current, campusId])]
      : current.filter((id) => id !== campusId));
  }

  async function revokeDelegation(delegationId: string) {
    const result = await revokeDelegationAction({ id: delegationId, userId: user.id });
    if (!result.ok) throw new Error(result.error);
    setDelegationMessage(result.message ?? "Delegated access revoked.");
    router.refresh();
  }

  return <div className="space-y-6">
    <form onSubmit={handleSave} className="space-y-5 rounded-lg border p-5">
      <div>
        <h2 className="font-semibold">Account and scope</h2>
        <p className="text-sm text-muted-foreground">Firebase activation and server-side organization, campus, and class scope are updated together.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Display name"><Input name="displayName" defaultValue={user.displayName} required disabled={!canManage} /></Field>
        <Field label="Email"><Input value={user.email} readOnly disabled /></Field>
        <Field label="Role">
          <select name="role" defaultValue={user.role} disabled={!canManage} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
            {user.role === "super_admin" ? <option value="super_admin">super admin</option> : null}
            {provisionRoles.map((role) => <option key={role} value={role}>{role.replaceAll("_", " ")}</option>)}
          </select>
        </Field>
        <Field label="Status">
          <select name="status" defaultValue={user.status} disabled={!canManage} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>
        </Field>
        <Field label="Primary campus">
          <select name="primaryCampusId" defaultValue={user.campusId ?? assignedCampusIds[0]} disabled={!canManage} required className="h-10 w-full rounded-md border bg-background px-3 text-sm">
            {campusOptions.filter((campus) => campusIds.includes(campus.id)).map((campus) => <option key={campus.id} value={campus.id}>{campus.name}</option>)}
          </select>
        </Field>
      </div>
      <fieldset disabled={!canManage}>
        <legend className="mb-2 text-sm font-medium">Campus access</legend>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {campusOptions.map((campus) => <label key={campus.id} className="flex items-center gap-2 rounded-md border p-3 text-sm">
            <input type="checkbox" checked={campusIds.includes(campus.id)} onChange={(event) => toggleCampus(campus.id, event.target.checked)} />
            {campus.name}
          </label>)}
        </div>
      </fieldset>
      <fieldset disabled={!canManage}>
        <legend className="mb-2 text-sm font-medium">Teacher class and section scope</legend>
        <div className="grid max-h-64 gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
          {classSectionOptions.filter((option) => option.campusId && campusIds.includes(option.campusId)).map((option) => {
            const key = `${option.classId}:${option.sectionId}`;
            return <label key={key} className="flex items-center gap-2 rounded-md border p-3 text-sm">
              <input name="classScope" value={key} type="checkbox" defaultChecked={classScopeKeys.has(key)} />
              {option.name}
            </label>;
          })}
        </div>
      </fieldset>
      {message ? <p role="status" className="rounded-md bg-muted p-3 text-sm">{message}</p> : null}
      {canManage ? <Button disabled={campusIds.length === 0}>Save access</Button> : null}
    </form>

    <section className="space-y-4 rounded-lg border p-5">
      <div><h2 className="font-semibold">Delegated access</h2><p className="text-sm text-muted-foreground">Grant one permission for a bounded period; expired or revoked grants are ignored by the server guard.</p></div>
      {canManage ? <form onSubmit={handleGrantDelegation} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Field label="Permission">
          <select name="permissionKey" className="h-10 w-full rounded-md border bg-background px-3 text-sm">{permissionKeys.map((permission) => <option key={permission} value={permission}>{permission}</option>)}</select>
        </Field>
        <Field label="Campus">
          <select name="campusId" className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="">All assigned campuses</option>{campusOptions.map((campus) => <option key={campus.id} value={campus.id}>{campus.name}</option>)}</select>
        </Field>
        <Field label="Starts"><Input name="startsAt" type="datetime-local" required /></Field>
        <Field label="Ends"><Input name="endsAt" type="datetime-local" required /></Field>
        <div className="flex items-end"><Button className="w-full">Grant access</Button></div>
      </form> : null}
      {delegationMessage ? <p role="status" className="rounded-md bg-muted p-3 text-sm">{delegationMessage}</p> : null}
      <div className="space-y-2">
        {delegations.length === 0 ? <p className="text-sm text-muted-foreground">No delegated access records.</p> : delegations.map((delegation) => <div key={delegation.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
          <div><p className="text-sm font-medium">{delegation.permissionKey}</p><p className="text-xs text-muted-foreground">{delegation.startsAt.toLocaleString()} - {delegation.endsAt.toLocaleString()}</p></div>
          <div className="flex items-center gap-2"><StatusBadge status={delegation.status} />{canManage && delegation.status === "active" ? <ConfirmDialog label="Revoke" title="Revoke delegated access?" description={`Revoke ${delegation.permissionKey} access for ${user.displayName}? The user will lose this temporary permission immediately.`} triggerVariant="outline" triggerSize="sm" onConfirm={() => revokeDelegation(delegation.id)} /> : null}</div>
        </div>)}
      </div>
    </section>
  </div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}
