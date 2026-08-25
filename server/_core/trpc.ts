import { NOT_ADMIN_ERR_MSG } from "@shared/const";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

/**
 * Protege as rotas do painel administrativo.
 *
 * A sessão vem de um cookie httpOnly assinado (JWT) emitido por
 * adminAuth.login. O sessionStorage do frontend é apenas conveniência de
 * UI e não vale como autorização.
 */
export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.admin) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        admin: ctx.admin,
      },
    });
  })
);
