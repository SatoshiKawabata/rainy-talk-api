import { NextResponse } from "next/server";

export async function GET(request: Request, {}) {
  return NextResponse.json({ message: "hello world" });
}

export async function POST(request: Request, {}) {
  const data = request.body;
  return NextResponse.json({ message: "Data received", data });
}
