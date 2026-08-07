import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { readSession } from "@/lib/auth";
import { Contact, Payslip, nextSeq } from "@/models";
import { generateDocNo } from "@/lib/utils";
import { canWrite, canDelete } from "@/lib/rbac";

export async function GET(req: NextRequest) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  await connectDB();
  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get("employeeId");
  const limit = Math.min(200, Number(searchParams.get("limit") || 50));

  const filter: Record<string, unknown> = {};
  if (employeeId) filter.employeeId = employeeId;

  const data = await Payslip.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!canWrite(session.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  await connectDB();
  const body = await req.json();
  const employeeId = String(body.employeeId || "");
  if (!employeeId) {
    return NextResponse.json({ error: "missing_employee" }, { status: 400 });
  }

  const employee = await Contact.findById(employeeId).lean();
  if (!employee || employee.type !== "employee") {
    return NextResponse.json({ error: "employee_not_found" }, { status: 404 });
  }

  const basicSalary = Number(
    body.basicSalary != null && body.basicSalary !== ""
      ? body.basicSalary
      : employee.basicSalary || 0,
  );
  const allowances = Number(body.allowances || 0);
  const deductions = Number(body.deductions || 0);
  const netPay = basicSalary + allowances - deductions;
  const markPaid = body.status === "paid" || body.paid === true;

  const seq = await nextSeq("payslip");
  const slip = await Payslip.create({
    slipNo: generateDocNo("PAY", seq),
    employeeId,
    employeeName: employee.nameBn || employee.name,
    periodLabel: String(body.periodLabel || "").trim(),
    periodFrom: body.periodFrom ? new Date(body.periodFrom) : undefined,
    periodTo: body.periodTo ? new Date(body.periodTo) : undefined,
    basicSalary,
    allowances,
    deductions,
    netPay,
    status: markPaid ? "paid" : "draft",
    paidAt: markPaid ? new Date() : undefined,
    note: String(body.note || "").trim(),
    createdBy: session.id,
  });

  if (body.basicSalary != null && body.basicSalary !== "" && Number(body.updateEmployeeSalary) !== 0) {
    await Contact.findByIdAndUpdate(employeeId, {
      $set: { basicSalary },
    });
  }

  return NextResponse.json({ data: slip }, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!canWrite(session.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  await connectDB();
  const body = await req.json();
  const id = body._id || body.id;
  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });

  const slip = await Payslip.findById(id);
  if (!slip) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (body.basicSalary != null) slip.basicSalary = Number(body.basicSalary);
  if (body.allowances != null) slip.allowances = Number(body.allowances);
  if (body.deductions != null) slip.deductions = Number(body.deductions);
  slip.netPay = Number(slip.basicSalary) + Number(slip.allowances) - Number(slip.deductions);
  if (body.periodLabel != null) slip.periodLabel = String(body.periodLabel);
  if (body.note != null) slip.note = String(body.note);
  if (body.status === "paid" || body.paid === true) {
    slip.status = "paid";
    slip.paidAt = new Date();
  }
  await slip.save();
  return NextResponse.json({ data: slip });
}

export async function DELETE(req: NextRequest) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!canDelete(session.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  await connectDB();
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
  await Payslip.findByIdAndDelete(id);
  return NextResponse.json({ ok: true });
}
