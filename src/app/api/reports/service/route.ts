import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { readSession } from "@/lib/auth";
import { ServiceJob } from "@/models";

export async function GET(req: NextRequest) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  await connectDB();
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  
  const filter: Record<string, unknown> = {};
  if (from || to) {
    filter.receivedDate = {};
    if (from) (filter.receivedDate as Record<string, Date>).$gte = new Date(from);
    if (to) {
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      (filter.receivedDate as Record<string, Date>).$lte = end;
    }
  }

  const aggregates = await ServiceJob.aggregate([
    { $match: filter },
    {
      $group: {
        _id: null,
        totalJobs: { $sum: 1 },
        totalServiceCharges: { $sum: "$serviceCharges" },
        totalPartsCost: { $sum: "$partsTotal" },
        grandTotal: { $sum: "$grandTotal" },
        totalPaid: { $sum: "$paidAmount" },
        totalDue: { $sum: "$dueAmount" }
      },
    },
  ]);

  const summary = aggregates[0] || {
    totalJobs: 0,
    totalServiceCharges: 0,
    totalPartsCost: 0,
    grandTotal: 0,
    totalPaid: 0,
    totalDue: 0
  };

  const data = [
    { label: "Total Service Jobs", value: summary.totalJobs },
    { label: "Total Service Charges", value: summary.totalServiceCharges },
    { label: "Total Parts Cost", value: summary.totalPartsCost },
    { label: "Grand Total", value: summary.grandTotal },
    { label: "Total Paid", value: summary.totalPaid },
    { label: "Total Due", value: summary.totalDue }
  ];

  return NextResponse.json({ summary: data, data });
}
