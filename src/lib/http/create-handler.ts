import { NextResponse } from "next/server";
import type { ZodType } from "zod";

export type ZodSchema<TInput> = ZodType<TInput>;

export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

interface CreateHandlerOptions<TInput, TOutput> {
  input?: ZodSchema<TInput>;
  handler: (input: TInput, req: Request) => Promise<TOutput | Response>;
}

interface CreateGetHandlerOptions<TOutput> {
  handler: (req: Request) => Promise<TOutput | Response>;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

function toErrorResponse(error: unknown): NextResponse {
  if (error instanceof HttpError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status }
    );
  }

  return NextResponse.json(
    {
      error: "internal_error",
      message: getErrorMessage(error),
    },
    { status: 500 }
  );
}

export function createHandler<TInput, TOutput>({
  input,
  handler,
}: CreateHandlerOptions<TInput, TOutput>) {
  return async function routeHandler(req: Request): Promise<NextResponse> {
    try {
      if (input) {
        const parsedInput = input.safeParse(await req.json());

        if (!parsedInput.success) {
          return NextResponse.json(
            {
              error: "invalid_input",
              issues: parsedInput.error.issues,
            },
            { status: 400 }
          );
        }

        const result = await handler(parsedInput.data, req);
        if (result instanceof Response) return result as NextResponse;
        return NextResponse.json(result);
      }

      const result = await handler(undefined as TInput, req);

      if (result instanceof Response) return result as NextResponse;
      return NextResponse.json(result);
    } catch (error) {
      return toErrorResponse(error);
    }
  };
}

// GET handlers never consume a request body. Keeping a dedicated helper is
// clearer than encoding that with `input: null` plus a method switch.
export function createGetHandler<TOutput>({
  handler,
}: CreateGetHandlerOptions<TOutput>) {
  return async function routeHandler(req: Request): Promise<NextResponse> {
    try {
      const result = await handler(req);
      if (result instanceof Response) return result as NextResponse;
      return NextResponse.json(result);
    } catch (error) {
      return toErrorResponse(error);
    }
  };
}
