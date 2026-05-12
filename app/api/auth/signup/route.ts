import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Self signup is disabled. Ask a super admin to create an account." },
    { status: 403 }
  );
}
