"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { issueCertificateAction } from "../actions/student.actions";
import { certificateIssueSchema, type CertificateIssueInput } from "../schemas/student.schema";

export function CertificateIssueForm({ studentId }: { studentId: string }) {
  const [message, setMessage] = useState("");
  const form = useForm<CertificateIssueInput>({ resolver: zodResolver(certificateIssueSchema), defaultValues: { studentId, certificateType: "bonafide", templateId: "" } });
  const submit = form.handleSubmit(async (input) => {
    const result = await issueCertificateAction(input);
    setMessage(result.ok ? result.message ?? "Certificate issued." : result.error);
  });
  return <form onSubmit={submit} className="rounded-lg border p-4" noValidate>
    <h2 className="mb-4 font-medium">Issue certificate</h2>
    <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-2 text-sm"><span className="block font-medium">Certificate type</span><Input {...form.register("certificateType")} placeholder="Bonafide, transfer..." /></label><label className="space-y-2 text-sm"><span className="block font-medium">Template ID (optional)</span><Input {...form.register("templateId")} /></label></div>
    {message ? <p role="status" className="mt-3 text-sm text-muted-foreground">{message}</p> : null}
    <div className="mt-4 flex justify-end"><Button disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "Issuing..." : "Issue certificate"}</Button></div>
  </form>;
}
