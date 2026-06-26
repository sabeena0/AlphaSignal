import { NextRequest, NextResponse } from "next/server";
import { runInvestmentAgent, ResearchStep } from "@/lib/agent";

export const maxDuration = 120; // 2 minutes for complex research
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const { company } = await request.json();

  if (!company || typeof company !== "string" || company.trim().length < 2) {
    return NextResponse.json(
      { error: "Please provide a valid company name." },
      { status: 400 }
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
        );
      };

      try {
        send({ type: "start", company: company.trim() });

        const report = await runInvestmentAgent(
          company.trim(),
          (step: ResearchStep) => {
            send({ type: "step", step });
          }
        );

        send({ type: "report", report });
        send({ type: "done" });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unknown error occurred";
        send({ type: "error", error: message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
