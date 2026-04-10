import { NextResponse } from 'next/server';

// Word export is now handled entirely client-side via the docx npm package
// and the exportAsDocx() function in app/page.js (using dynamic import + Packer.toBlob).
// This server route is no longer used and is kept only as a stub.

export async function POST() {
  return NextResponse.json(
    { error: 'This endpoint is deprecated. Word export is handled client-side.' },
    { status: 410 }
  );
}
