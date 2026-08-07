declare module "next/server" {
  export class NextResponse extends Response {
    static json(body: unknown, init?: ResponseInit): NextResponse;
    static redirect(url: string | URL, init?: number | ResponseInit): NextResponse;
    static next(init?: ResponseInit): NextResponse;
    readonly cookies: { set(name: string, value: string, options?: Record<string, unknown>): void };
  }
  export class NextRequest extends Request {
    readonly cookies: { get(name: string): { value: string } | undefined };
    readonly nextUrl: URL;
  }
}

declare module "next/server.js" {
  export { NextResponse, NextRequest } from "next/server";
}
