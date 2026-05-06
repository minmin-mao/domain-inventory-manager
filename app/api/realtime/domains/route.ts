import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    { error: "SSE realtime has been replaced by Pusher." },
    { status: 410 }
  );
}
