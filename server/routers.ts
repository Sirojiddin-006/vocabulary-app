import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { getSessionCookieOptions } from "./_core/cookies";
import { createSessionToken, hashPassword, verifyPassword } from "./_core/auth";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";

const toSafeUser = (
  user: Awaited<ReturnType<typeof db.getUserById>> | null | undefined
) => {
  if (!user) return null;
  const { passwordHash, passwordSalt, ...safe } = user;
  return safe;
};

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    signUp: publicProcedure
      .input(
        z.object({
          username: z.string().min(3).max(64),
          password: z.string().min(6).max(128),
          name: z.string().min(1).max(255).optional(),
          email: z.string().email().max(320).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const existing = await db.getUserByUsername(input.username);
        if (existing) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Username already exists",
          });
        }

        const { hash, salt } = hashPassword(input.password);
        const user = await db.createLocalUser({
          username: input.username,
          name: input.name ?? null,
          email: input.email ?? null,
          passwordHash: hash,
          passwordSalt: salt,
        });

        if (!user) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create user",
          });
        }

        const token = await createSessionToken({
          userId: user.id,
          username: user.openId,
        });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, {
          ...cookieOptions,
          maxAge: ONE_YEAR_MS,
        });

        return { user: toSafeUser(user) };
      }),
    signIn: publicProcedure
      .input(
        z.object({
          username: z.string().min(3).max(64),
          password: z.string().min(6).max(128),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const user = await db.getUserByUsername(input.username);
        if (!user || !user.passwordHash || !user.passwordSalt) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid username or password",
          });
        }

        const valid = verifyPassword(
          input.password,
          user.passwordSalt,
          user.passwordHash
        );
        if (!valid) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid username or password",
          });
        }

        await db.updateLastSignedIn(user.id);

        const token = await createSessionToken({
          userId: user.id,
          username: user.openId,
        });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, {
          ...cookieOptions,
          maxAge: ONE_YEAR_MS,
        });

        return { user: toSafeUser(user) };
      }),
    me: publicProcedure.query(opts => toSafeUser(opts.ctx.user)),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
    updateProfile: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(255).optional(),
        email: z.string().email().max(320).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const user = await db.updateUser(ctx.user.id, input);
        return toSafeUser(user);
      }),
    deleteAccount: protectedProcedure
      .mutation(({ ctx }) =>
        db.deleteUser(ctx.user.id)
      ),
    getTotalStats: protectedProcedure
      .query(({ ctx }) =>
        db.getUserTotalStats(ctx.user.id)
      ),
  }),

  vocabulary: router({
    // Get all folders accessible to the user
    getFolders: protectedProcedure.query(({ ctx }) =>
      db.getFolders(ctx.user.id)
    ),

    // Get a specific folder by ID
    getFolderById: protectedProcedure
      .input(z.object({ folderId: z.number() }))
      .query(({ ctx, input }) =>
        db.getFolderById(input.folderId, ctx.user.id)
      ),

    // Create a new folder
    createFolder: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(255),
        description: z.string().max(500).nullable().optional(),
      }))
      .mutation(({ ctx, input }) =>
        db.createFolder(input.name, input.description || null, ctx.user.id)
      ),

    // Get words in a folder
    getWords: protectedProcedure
      .input(z.object({ folderId: z.number() }))
      .query(({ ctx, input }) =>
        db.getWordsByFolderId(input.folderId, ctx.user.id)
      ),

    // Add a new word to a folder
    addWord: protectedProcedure
      .input(z.object({
        folderId: z.number(),
        english: z.string().min(1).max(255),
        uzbek: z.string().min(1).max(255),
        example: z.string().max(500).nullable().optional(),
      }))
      .mutation(({ ctx, input }) =>
        db.createWord(
          input.folderId,
          input.english,
          input.uzbek,
          input.example || null,
          ctx.user.id
        )
      ),

    // Bulk import words
    importWords: protectedProcedure
      .input(z.object({
        folderId: z.number(),
        words: z.array(z.object({
          english: z.string().min(1).max(255),
          uzbek: z.string().min(1).max(255),
          example: z.string().max(500).optional(),
        })).min(1).max(100),
      }))
      .mutation(({ ctx, input }) =>
        db.importWords(input.folderId, input.words, ctx.user.id)
      ),

    // Get user progress for a folder
    getProgress: protectedProcedure
      .input(z.object({ folderId: z.number() }))
      .query(({ ctx, input }) =>
        db.getUserProgress(ctx.user.id, input.folderId)
      ),

    // Update user progress for a word
    updateProgress: protectedProcedure
      .input(z.object({
        wordId: z.number(),
        known: z.boolean(),
      }))
      .mutation(({ ctx, input }) =>
        db.updateUserProgress(ctx.user.id, input.wordId, input.known)
      ),
  }),
});

export type AppRouter = typeof appRouter;
