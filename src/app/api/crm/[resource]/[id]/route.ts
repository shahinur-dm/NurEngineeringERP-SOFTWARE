import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { readSession } from "@/lib/auth";
import { canDelete, canWrite } from "@/lib/rbac";
import { CRM_RESOURCES, isCrmResource } from "@/lib/crm-resources";

type Ctx = { params: Promise<{ resource: string; id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { resource, id } = await ctx.params;
  if (!isCrmResource(resource)) return NextResponse.json({ error: "not_found" }, { status: 404 });
  await connectDB();
  const doc = await CRM_RESOURCES[resource].model.findById(id).lean();
  if (!doc) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ data: doc });
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!canWrite(session.role)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { resource, id } = await ctx.params;
  if (!isCrmResource(resource)) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const body = await req.json();
  await connectDB();
  const update: Record<string, unknown> = { ...body };
  delete update._id;
  if (resource === "followups" && typeof body.conversation === "string" && body.conversation.trim()) {
    delete update.conversation;
    const doc = await CRM_RESOURCES.followups.model.findByIdAndUpdate(
      id,
      {
        $set: update,
        $push: {
          conversations: {
            at: new Date(),
            text: body.conversation.trim(),
            userName: session.name || session.email || "",
          },
        },
      },
      { new: true },
    );
    if (!doc) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ data: doc });
  }
  const doc = await CRM_RESOURCES[resource].model.findByIdAndUpdate(id, update, { new: true });
  if (!doc) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ data: doc });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!canDelete(session.role)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { resource, id } = await ctx.params;
  if (!isCrmResource(resource)) return NextResponse.json({ error: "not_found" }, { status: 404 });
  await connectDB();
  const doc = await CRM_RESOURCES[resource].model.findByIdAndDelete(id);
  if (!doc) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
