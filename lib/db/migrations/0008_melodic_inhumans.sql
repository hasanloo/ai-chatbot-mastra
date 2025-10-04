CREATE TABLE IF NOT EXISTS "EvaluationResult" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"evaluationRunId" uuid NOT NULL,
	"questionId" varchar(100) NOT NULL,
	"questionType" varchar(100) NOT NULL,
	"question" text NOT NULL,
	"goldAnswer" text NOT NULL,
	"modelAnswer" text NOT NULL,
	"f1Score" real NOT NULL,
	"chatId" uuid NOT NULL,
	"errorMessage" text,
	"evaluatedAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "EvaluationRun" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"datasetName" varchar(100) NOT NULL,
	"datasetPath" text NOT NULL,
	"totalQuestions" integer NOT NULL,
	"completedQuestions" integer DEFAULT 0 NOT NULL,
	"failedQuestions" integer DEFAULT 0 NOT NULL,
	"averageF1Score" real,
	"seed" integer,
	"startedAt" timestamp NOT NULL,
	"completedAt" timestamp,
	"outputFilePath" text,
	"userId" uuid NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "EvaluationResult" ADD CONSTRAINT "EvaluationResult_evaluationRunId_EvaluationRun_id_fk" FOREIGN KEY ("evaluationRunId") REFERENCES "public"."EvaluationRun"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "EvaluationResult" ADD CONSTRAINT "EvaluationResult_chatId_Chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."Chat"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "EvaluationRun" ADD CONSTRAINT "EvaluationRun_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
