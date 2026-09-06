import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Sparkles,
  Zap,
  Code2,
  Eye,
  ArrowRight,
  GitBranch,
  Users,
  Download,
  MessageSquare,
} from "lucide-react";
import { isAuthenticated } from "@/lib/api";
import { Button } from "@/components/ui/button";

/* ─────────────────────────────────────────────
   Sub-components
───────────────────────────────────────────── */

function NavBar() {
  return (
    <nav className="fixed top-0 inset-x-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold text-base">
          <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <span className="gradient-text">AppForge</span>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/login">Sign in</Link>
          </Button>
          <Button size="sm" asChild className="gap-1.5">
            <Link to="/signup">
              Get started <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    </nav>
  );
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="group p-6 rounded-2xl border border-border/50 bg-card hover:border-primary/30 hover:bg-card/80 transition-all duration-300">
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
        {icon}
      </div>
      <h3 className="font-semibold text-foreground mb-2 text-sm">{title}</h3>
      <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
    </div>
  );
}

interface StatProps {
  value: string;
  label: string;
}

function Stat({ value, label }: StatProps) {
  return (
    <div className="text-center">
      <div className="text-3xl font-bold gradient-text mb-1">{value}</div>
      <div className="text-muted-foreground text-sm">{label}</div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main page
───────────────────────────────────────────── */

export default function LandingPage() {
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated()) navigate("/projects");
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <NavBar />

      {/* ── Hero ── */}
      <section className="relative pt-32 pb-24 px-6 overflow-hidden">
        {/* background glows */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-primary/8 rounded-full blur-3xl" />
          <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] bg-secondary/6 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          {/* badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary text-xs font-medium mb-8">
            <Zap className="w-3 h-3 fill-current" />
            AI-powered app builder
          </div>

          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight leading-[1.1] mb-6">
            Describe it.
            <br />
            <span className="gradient-text">Ship it.</span>
          </h1>

          <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-10 leading-relaxed">
            Turn plain-English prompts into full React applications — complete with
            components, styling, and live preview — in seconds.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button size="lg" asChild className="gap-2 px-7 h-12 text-sm font-semibold">
              <Link to="/signup">
                Start building for free
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="h-12 px-7 text-sm">
              <Link to="/login">Sign in</Link>
            </Button>
          </div>
        </div>

        {/* fake app screenshot */}
        <div className="relative max-w-5xl mx-auto mt-16">
          <div className="rounded-2xl border border-border/60 bg-card shadow-2xl overflow-hidden">
            {/* window chrome */}
            <div className="flex items-center gap-1.5 px-4 py-3 border-b border-border/50 bg-panel">
              <div className="w-3 h-3 rounded-full bg-red-500/60" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
              <div className="w-3 h-3 rounded-full bg-green-500/60" />
              <div className="flex-1 mx-4 h-6 rounded-md bg-muted/50 flex items-center px-3">
                <span className="text-[11px] text-muted-foreground font-mono">appforge.dev/projects/42</span>
              </div>
            </div>
            {/* layout preview */}
            <div className="flex h-64 sm:h-80">
              {/* chat panel */}
              <div className="w-72 border-r border-border/50 p-4 flex flex-col gap-3 shrink-0">
                <div className="flex gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary/20 shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-2.5 bg-muted rounded-full w-3/4" />
                    <div className="h-2.5 bg-muted rounded-full w-full" />
                    <div className="h-2.5 bg-muted rounded-full w-1/2" />
                  </div>
                </div>
                <div className="ml-auto max-w-[80%]">
                  <div className="bg-primary/15 rounded-2xl rounded-tr-none px-3 py-2 space-y-1.5">
                    <div className="h-2 bg-primary/30 rounded-full w-32" />
                    <div className="h-2 bg-primary/30 rounded-full w-24" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary/20 shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-2.5 bg-muted rounded-full w-full" />
                    <div className="h-2.5 bg-muted rounded-full w-5/6" />
                    <div className="h-2 bg-green-500/20 rounded-full w-2/3" />
                  </div>
                </div>
                {/* input bar */}
                <div className="mt-auto h-9 rounded-xl bg-muted/50 border border-border/50 flex items-center px-3 gap-2">
                  <div className="flex-1 h-2 bg-muted rounded-full" />
                  <div className="w-6 h-6 rounded-lg bg-primary/30" />
                </div>
              </div>
              {/* code/preview panel */}
              <div className="flex-1 bg-[#0d1117] p-4 font-mono text-xs space-y-1.5 overflow-hidden">
                <div className="flex gap-2">
                  <span className="text-[hsl(280,70%,70%)]">import</span>
                  <span className="text-foreground/60">React from</span>
                  <span className="text-[hsl(140,60%,60%)]">'react'</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-[hsl(280,70%,70%)]">import</span>
                  <span className="text-foreground/60">{"{ useState }"} from</span>
                  <span className="text-[hsl(140,60%,60%)]">'react'</span>
                </div>
                <div className="h-2" />
                <div className="flex gap-2">
                  <span className="text-[hsl(280,70%,70%)]">export default function</span>
                  <span className="text-[hsl(200,80%,65%)]">App</span>
                  <span className="text-foreground/60">{"() {"}</span>
                </div>
                <div className="pl-4 flex gap-2">
                  <span className="text-[hsl(280,70%,70%)]">const</span>
                  <span className="text-foreground/60">[count, setCount] =</span>
                  <span className="text-[hsl(200,80%,65%)]">useState</span>
                  <span className="text-foreground/60">(0)</span>
                </div>
                <div className="pl-4 flex gap-2">
                  <span className="text-[hsl(280,70%,70%)]">return</span>
                  <span className="text-foreground/60">(</span>
                </div>
                <div className="pl-8 text-foreground/50">{"<div className=\"..."}</div>
                <div className="pl-12 space-y-1">
                  <div className="h-2 bg-muted/40 rounded-full w-48" />
                  <div className="h-2 bg-muted/40 rounded-full w-36" />
                  <div className="h-2 bg-primary/20 rounded-full w-56 animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="py-16 px-6 border-y border-border/40">
        <div className="max-w-3xl mx-auto grid grid-cols-3 gap-8">
          <Stat value="10x" label="Faster than hand-coding" />
          <Stat value="100%" label="React + TypeScript" />
          <Stat value="Live" label="In-browser preview" />
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-3">Everything you need to ship</h2>
            <p className="text-muted-foreground max-w-md mx-auto text-sm">
              A complete AI-powered workspace from prompt to production-ready code.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <FeatureCard
              icon={<MessageSquare className="w-5 h-5 text-primary" />}
              title="Conversational builder"
              description="Describe your app in plain English. The AI reads your existing files, plans changes, and generates complete components — no prompting tricks needed."
            />
            <FeatureCard
              icon={<Eye className="w-5 h-5 text-primary" />}
              title="Live in-browser preview"
              description="Sandpack runs your React app right in the browser. See changes the moment the AI finishes writing — no build step, no server."
            />
            <FeatureCard
              icon={<Code2 className="w-5 h-5 text-primary" />}
              title="Full code editor"
              description="Browse generated files, read and tweak any component. Your code, your control — the AI is just the fast lane."
            />
            <FeatureCard
              icon={<Zap className="w-5 h-5 text-primary" />}
              title="Auto error recovery"
              description="Sandbox catches runtime errors and shows them inline. One click sends the error back to the AI with full context for an instant fix."
            />
            <FeatureCard
              icon={<GitBranch className="w-5 h-5 text-primary" />}
              title="Project history"
              description="Every generation is stored. Revisit any past message, see exactly which files changed, and jump back to any state."
            />
            <FeatureCard
              icon={<Users className="w-5 h-5 text-primary" />}
              title="Team collaboration"
              description="Invite teammates as Editors or Viewers. Work on the same project simultaneously with role-based access control."
            />
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-20 px-6 border-t border-border/40 bg-card/30">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-12">Three steps to a working app</h2>
          <div className="grid sm:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Describe", body: "Type what you want to build — a dashboard, landing page, calculator, anything." },
              { step: "02", title: "Generate", body: "The AI writes React + TypeScript files, imports icons, wires up state, and updates App.tsx." },
              { step: "03", title: "Ship", body: "Export a ZIP of production-ready code or keep iterating with follow-up prompts." },
            ].map(({ step, title, body }) => (
              <div key={step} className="flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
                  <span className="text-primary font-mono text-sm font-bold">{step}</span>
                </div>
                <h3 className="font-semibold mb-2">{title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-6 glow-effect">
            <Sparkles className="w-7 h-7 text-primary" />
          </div>
          <h2 className="text-4xl font-bold mb-4">
            Ready to build something?
          </h2>
          <p className="text-muted-foreground mb-8 text-sm">
            Free to start. No credit card. Just your ideas.
          </p>
          <Button size="lg" asChild className="gap-2 px-8 h-12 text-sm font-semibold">
            <Link to="/signup">
              Create your first app
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border/40 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="gradient-text">AppForge</span>
          </div>
          <p className="text-muted-foreground text-xs">
            Built with React, Spring Boot, and a lot of AI.
          </p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <Link to="/login" className="hover:text-foreground transition-colors">Sign in</Link>
            <Link to="/signup" className="hover:text-foreground transition-colors">Sign up</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
