import { NOT_ADMIN_ERR_MSG } from "@shared/const";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { z, ZodError } from "zod";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
  /**
   * Sem isto, um erro de validação chega à tela como o JSON cru do Zod
   * (com "code", "path", "origin"...). As mensagens dos schemas já estão
   * escritas para o cliente ler, então usamos a primeira delas.
   */
  errorFormatter({ shape, error }) {
    const cause = error.cause;
    if (!(cause instanceof ZodError)) return shape;

    const first = cause.issues[0];
    return {
      ...shape,
      message: first?.message ?? shape.message,
      data: {
        ...shape.data,
        // campo que falhou, para o frontend destacar se quiser
        field: first?.path.join(".") ?? null,
      },
    };
  },
});

/**
 * Valida a entrada de forma síncrona.
 *
 * O tRPC escolhe `schema.parseAsync` quando recebe um schema Zod, e a promise
 * rejeitada dele vaza como unhandled rejection a cada entrada inválida — o que
 * poluiria os logs do Worker em erro comum de cliente (nome curto, telefone
 * incompleto). Passando uma função, o tRPC usa o caminho de validador custom,
 * sem promise, e ainda aproveitamos a mensagem escrita no schema.
 */
export function zin<TShape extends z.ZodRawShape>(shape: TShape) {
  const schema = z.object(shape);

  type Input = z.input<typeof schema>;
  type Output = z.output<typeof schema>;

  // `_input`/`_output` são só carregadores de tipo: é assim que o tRPC infere
  // a entrada do cliente. Sem eles, campos com .default() apareceriam como
  // obrigatórios para quem chama a rota.
  return {
    _input: undefined as unknown as Input,
    _output: undefined as unknown as Output,
    // sem `parseAsync`, o tRPC usa este caminho síncrono
    parse: (raw: unknown): Output => {
      const result = schema.safeParse(raw);
      if (result.success) return result.data;

      const first = result.error.issues[0];
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: first?.message ?? "Dados inválidos",
      });
    },
  };
}

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
