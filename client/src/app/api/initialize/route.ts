import { NextRequest, NextResponse } from "next/server";
import scheduler from "./scheduler";

export async function POST(req: NextRequest) {
  const json = await req.json();
  if (json.type === "start") {
    scheduler.start(json.id);
  } else if (json.type === "stop") {
    scheduler.stop(json.id);
  }
  try {
    return new NextResponse(JSON.stringify(json), {
      status: 200,
    });
  } catch (error: any) {
    if (error.response) {
      console.error(error.response.status, error.response.data);
      return new NextResponse(JSON.stringify(error.response.data), {
        status: error.response.status,
      });
    } else {
      console.error(`Error with OpenAI API request: ${error.message}`);
      return new NextResponse("An error occurred during your request.", {
        status: 500,
      });
    }
  }
}
