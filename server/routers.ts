import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
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
      .mutation(({ ctx, input }) =>
        db.updateUser(ctx.user.id, input)
      ),
    deleteAccount: protectedProcedure
      .mutation(({ ctx }) =>
        db.deleteUser(ctx.user.id)
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
